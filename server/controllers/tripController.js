const Trip = require('../models/Trip');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Expense = require('../models/Expense');
const { computeTripBalances } = require('../services/balanceEngine');

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private
const createTrip = async (req, res) => {
  try {
    const {
      name,
      destination,
      startDate,
      endDate,
      currency = 'INR',
      memberUsernames = [],
      coverImage,
      notes,
    } = req.body;

    if (!name || !destination || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, destination, startDate, and endDate are required' });
    }

    // Owner is always the first member
    const membersList = [
      {
        userId: req.user._id,
        role: 'OWNER',
        joinedAt: new Date(),
      },
    ];

    // Clean usernames and remove duplicates & self
    const cleanUsernames = [
      ...new Set(
        memberUsernames
          .map((u) => u.trim().toLowerCase().replace(/^@/, ''))
          .filter((u) => u && u !== req.user.username)
      ),
    ];

    if (cleanUsernames.length > 0) {
      const invitedUsers = await User.find({
        username: { $in: cleanUsernames },
        isActive: true,
      });

      if (invitedUsers.length !== cleanUsernames.length) {
        const found = new Set(invitedUsers.map((u) => u.username));
        const missing = cleanUsernames.filter((u) => !found.has(u));
        return res.status(404).json({
          error: `The following users could not be found: @${missing.join(', @')}`,
        });
      }

      // Auto-establish friendship and add registered users to trip
      for (const invited of invitedUsers) {
        await Friendship.createFriendship(req.user._id, invited._id);

        membersList.push({
          userId: invited._id,
          role: 'MEMBER',
          joinedAt: new Date(),
        });
      }
    }

    const trip = await Trip.create({
      name: name.trim(),
      destination: destination.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      currency: currency.toUpperCase().trim(),
      coverImage: coverImage || null,
      notes: (notes || '').trim(),
      ownerId: req.user._id,
      members: membersList,
    });

    const populatedTrip = await Trip.findById(trip._id)
      .populate('ownerId', 'username fullName avatarUrl')
      .populate('members.userId', 'username fullName avatarUrl');

    return res.status(201).json({
      message: 'Trip created successfully',
      trip: {
        id: populatedTrip._id.toString(),
        name: populatedTrip.name,
        destination: populatedTrip.destination,
        startDate: populatedTrip.startDate,
        endDate: populatedTrip.endDate,
        currency: populatedTrip.currency,
        coverImage: populatedTrip.coverImage,
        notes: populatedTrip.notes,
        status: populatedTrip.status,
        owner: populatedTrip.ownerId.username,
        members: populatedTrip.members.map((m) => ({
          username: m.userId.username,
          fullName: m.userId.fullName,
          avatarUrl: m.userId.avatarUrl,
          role: m.role,
        })),
        createdAt: populatedTrip.createdAt,
      },
    });
  } catch (error) {
    console.error('Create trip error:', error);
    return res.status(500).json({ error: 'Failed to create trip' });
  }
};

// @desc    Get all active trips for current user
// @route   GET /api/trips
// @access  Private
const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      'members.userId': req.user._id,
      deletedAt: null,
    })
      .populate('ownerId', 'username fullName')
      .populate('members.userId', 'username fullName avatarUrl')
      .sort({ createdAt: -1 });

    const tripSummaries = await Promise.all(
      trips.map(async (trip) => {
        const balances = await computeTripBalances(trip._id);
        const myBalanceObj = balances.memberBalances.find(
          (b) => b.userId === req.user._id.toString()
        );

        return {
          id: trip._id.toString(),
          name: trip.name,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          currency: trip.currency,
          status: trip.status,
          coverImage: trip.coverImage,
          owner: trip.ownerId.username,
          isOwner: trip.ownerId._id.toString() === req.user._id.toString(),
          totalMembers: trip.members.length,
          totalSpendMinor: balances.tripTotalSpendMinor,
          myBalanceMinor: myBalanceObj ? myBalanceObj.netBalanceMinor : 0,
          myStatus: myBalanceObj ? myBalanceObj.status : 'SETTLED',
          members: trip.members.map((m) => ({
            username: m.userId.username,
            fullName: m.userId.fullName,
            avatarUrl: m.userId.avatarUrl,
            role: m.role,
          })),
        };
      })
    );

    return res.status(200).json({ trips: tripSummaries });
  } catch (error) {
    console.error('Get trips error:', error);
    return res.status(500).json({ error: 'Failed to retrieve trips' });
  }
};

// @desc    Get trip details by ID
// @route   GET /api/trips/:tripId
// @access  Private
const getTripDetails = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      deletedAt: null,
      'members.userId': req.user._id,
    })
      .populate('ownerId', 'username fullName')
      .populate('members.userId', 'username fullName avatarUrl');

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or you are not a member' });
    }

    const balances = await computeTripBalances(tripId);
    const myBalanceObj = balances.memberBalances.find(
      (b) => b.userId === req.user._id.toString()
    );

    return res.status(200).json({
      trip: {
        id: trip._id.toString(),
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        currency: trip.currency,
        coverImage: trip.coverImage,
        notes: trip.notes,
        status: trip.status,
        owner: trip.ownerId.username,
        isOwner: trip.ownerId._id.toString() === req.user._id.toString(),
        members: trip.members.map((m) => ({
          username: m.userId.username,
          fullName: m.userId.fullName,
          avatarUrl: m.userId.avatarUrl,
          role: m.role,
        })),
        stats: {
          totalSpendMinor: balances.tripTotalSpendMinor,
          expensesCount: balances.totalExpensesCount,
          myBalanceMinor: myBalanceObj ? myBalanceObj.netBalanceMinor : 0,
          myStatus: myBalanceObj ? myBalanceObj.status : 'SETTLED',
        },
      },
    });
  } catch (error) {
    console.error('Get trip details error:', error);
    return res.status(500).json({ error: 'Failed to retrieve trip details' });
  }
};

// @desc    Update trip details (Owner only)
// @route   PATCH /api/trips/:tripId
// @access  Private (Owner only)
const updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, deletedAt: null });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the trip owner can modify trip details' });
    }

    const { name, destination, startDate, endDate, coverImage, notes, status } = req.body;

    if (name) trip.name = name.trim();
    if (destination) trip.destination = destination.trim();
    if (startDate) trip.startDate = new Date(startDate);
    if (endDate) trip.endDate = new Date(endDate);
    if (coverImage !== undefined) trip.coverImage = coverImage;
    if (notes !== undefined) trip.notes = notes.trim();
    if (status) trip.status = status;

    await trip.save();

    return res.status(200).json({
      message: 'Trip updated successfully',
      trip: trip.toJSON(),
    });
  } catch (error) {
    console.error('Update trip error:', error);
    return res.status(500).json({ error: 'Failed to update trip' });
  }
};

// @desc    Soft delete trip (Owner only)
// @route   DELETE /api/trips/:tripId
// @access  Private (Owner only)
const deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, deletedAt: null });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the trip owner can delete the trip' });
    }

    trip.deletedAt = new Date();
    await trip.save();

    return res.status(200).json({
      message: 'Trip deleted successfully',
      tripId,
    });
  } catch (error) {
    console.error('Delete trip error:', error);
    return res.status(500).json({ error: 'Failed to delete trip' });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTripDetails,
  updateTrip,
  deleteTrip,
};
