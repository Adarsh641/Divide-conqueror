const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Friendship = require('../models/Friendship');

// @desc    Search registered users by username
// @route   GET /api/friends/search?q=
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase().replace(/^@/, '');
    if (!query || query.length < 2) {
      return res.status(200).json({ results: [] });
    }

    // Find matching users excluding requesting user
    const users = await User.find({
      _id: { $ne: req.user._id },
      username: { $regex: query, $options: 'i' },
      isActive: true,
    })
      .select('username fullName avatarUrl')
      .limit(20);

    const friendIds = await Friendship.getFriendIds(req.user._id);
    const friendIdStrings = new Set(friendIds.map((id) => id.toString()));

    // Get pending requests
    const pendingRequests = await FriendRequest.find({
      $or: [
        { senderId: req.user._id, status: 'PENDING' },
        { receiverId: req.user._id, status: 'PENDING' },
      ],
    });

    const pendingOutgoing = new Set(
      pendingRequests
        .filter((r) => r.senderId.toString() === req.user._id.toString())
        .map((r) => r.receiverId.toString())
    );
    const pendingIncoming = new Set(
      pendingRequests
        .filter((r) => r.receiverId.toString() === req.user._id.toString())
        .map((r) => r.senderId.toString())
    );

    const results = users.map((u) => {
      const uid = u._id.toString();
      let status = 'NONE';
      if (friendIdStrings.has(uid)) {
        status = 'FRIENDS';
      } else if (pendingOutgoing.has(uid)) {
        status = 'REQUEST_SENT';
      } else if (pendingIncoming.has(uid)) {
        status = 'REQUEST_RECEIVED';
      }

      return {
        username: u.username,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        friendshipStatus: status,
      };
    });

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
};

// @desc    Send a friend request to a user by @username
// @route   POST /api/friends/request
// @access  Private
const sendFriendRequest = async (req, res) => {
  try {
    const { targetUsername } = req.body;
    if (!targetUsername) {
      return res.status(400).json({ error: 'Target username is required' });
    }

    const cleanUsername = targetUsername.trim().toLowerCase().replace(/^@/, '');

    const targetUser = await User.findOne({ username: cleanUsername, isActive: true });
    if (!targetUser) {
      return res.status(404).json({ error: 'User with this username does not exist' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    // Check if already friends
    const alreadyFriends = await Friendship.areFriends(req.user._id, targetUser._id);
    if (alreadyFriends) {
      return res.status(400).json({ error: 'You are already friends with this user' });
    }

    // Check if reverse request is pending -> auto accept!
    const reversePending = await FriendRequest.findOne({
      senderId: targetUser._id,
      receiverId: req.user._id,
      status: 'PENDING',
    });

    if (reversePending) {
      reversePending.status = 'ACCEPTED';
      reversePending.respondedAt = new Date();
      await reversePending.save();
      await Friendship.createFriendship(req.user._id, targetUser._id);

      return res.status(200).json({
        message: `Mutual request detected. You and @${cleanUsername} are now friends!`,
        friendshipStatus: 'FRIENDS',
      });
    }

    // Check if outgoing pending already exists
    const existingRequest = await FriendRequest.findOne({
      senderId: req.user._id,
      receiverId: targetUser._id,
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      return res.status(400).json({ error: 'Friend request is already pending' });
    }

    const newRequest = await FriendRequest.findOneAndUpdate(
      { senderId: req.user._id, receiverId: targetUser._id },
      { status: 'PENDING', respondedAt: null },
      { upsert: true, returnDocument: 'after' }
    );

    return res.status(201).json({
      message: `Friend request sent to @${cleanUsername}`,
      requestId: newRequest._id.toString(),
      friendshipStatus: 'REQUEST_SENT',
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
};

// @desc    List incoming and outgoing friend requests
// @route   GET /api/friends/requests
// @access  Private
const getFriendRequests = async (req, res) => {
  try {
    const incoming = await FriendRequest.find({
      receiverId: req.user._id,
      status: 'PENDING',
    })
      .populate('senderId', 'username fullName avatarUrl')
      .sort({ createdAt: -1 });

    const outgoing = await FriendRequest.find({
      senderId: req.user._id,
      status: 'PENDING',
    })
      .populate('receiverId', 'username fullName avatarUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      incoming: incoming.map((r) => ({
        id: r._id.toString(),
        fromUser: {
          username: r.senderId.username,
          fullName: r.senderId.fullName,
          avatarUrl: r.senderId.avatarUrl,
        },
        createdAt: r.createdAt,
      })),
      outgoing: outgoing.map((r) => ({
        id: r._id.toString(),
        toUser: {
          username: r.receiverId.username,
          fullName: r.receiverId.fullName,
          avatarUrl: r.receiverId.avatarUrl,
        },
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    return res.status(500).json({ error: 'Failed to retrieve friend requests' });
  }
};

// @desc    Accept or reject friend request
// @route   POST /api/friends/requests/:id/respond
// @access  Private
const respondToFriendRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'ACCEPT' | 'REJECT'
    const requestId = req.params.id;

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be ACCEPT or REJECT' });
    }

    const request = await FriendRequest.findOne({
      _id: requestId,
      receiverId: req.user._id,
      status: 'PENDING',
    }).populate('senderId', 'username fullName');

    if (!request) {
      return res.status(404).json({ error: 'Pending friend request not found' });
    }

    if (action === 'ACCEPT') {
      request.status = 'ACCEPTED';
      request.respondedAt = new Date();
      await request.save();

      await Friendship.createFriendship(request.senderId._id, req.user._id);

      return res.status(200).json({
        message: `Accepted friend request from @${request.senderId.username}`,
        status: 'ACCEPTED',
      });
    } else {
      request.status = 'REJECTED';
      request.respondedAt = new Date();
      await request.save();

      return res.status(200).json({
        message: `Rejected friend request from @${request.senderId.username}`,
        status: 'REJECTED',
      });
    }
  } catch (error) {
    console.error('Respond to request error:', error);
    return res.status(500).json({ error: 'Failed to respond to friend request' });
  }
};

// @desc    List all accepted friends for current user
// @route   GET /api/friends
// @access  Private
const listFriends = async (req, res) => {
  try {
    const friendIds = await Friendship.getFriendIds(req.user._id);

    const friends = await User.find({
      _id: { $in: friendIds },
      isActive: true,
    }).select('username fullName avatarUrl');

    return res.status(200).json({
      friends: friends.map((f) => ({
        username: f.username,
        fullName: f.fullName,
        avatarUrl: f.avatarUrl,
      })),
    });
  } catch (error) {
    console.error('List friends error:', error);
    return res.status(500).json({ error: 'Failed to list friends' });
  }
};

module.exports = {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  listFriends,
};
