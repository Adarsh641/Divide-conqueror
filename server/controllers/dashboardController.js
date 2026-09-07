const Trip = require('../models/Trip');
const Friendship = require('../models/Friendship');
const { computeTripBalances } = require('../services/balanceEngine');

// @desc    Get aggregated dynamic dashboard metrics for the authenticated user
// @route   GET /api/dashboard
// @access  Private
const getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch total accepted friends count
    const friendIds = await Friendship.getFriendIds(userId);
    const totalFriends = friendIds.length;

    // 2. Fetch all active trips for user
    const trips = await Trip.find({
      'members.userId': userId,
      deletedAt: null,
    })
      .populate('ownerId', 'username fullName')
      .populate('members.userId', 'username fullName avatarUrl')
      .sort({ createdAt: -1 });

    let totalIncomingMinor = 0; // Money others owe to current user
    let totalOutgoingMinor = 0; // Money current user owes to others
    const tripSummaries = [];

    // 3. Dynamically compute net balances for each trip
    for (const trip of trips) {
      const balanceData = await computeTripBalances(trip._id);
      const myBalanceObj = balanceData.memberBalances.find(
        (b) => b.userId === userId.toString()
      );

      const net = myBalanceObj ? myBalanceObj.netBalanceMinor : 0;
      if (net > 0) {
        totalIncomingMinor += net;
      } else if (net < 0) {
        totalOutgoingMinor += Math.abs(net);
      }

      tripSummaries.push({
        id: trip._id.toString(),
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        currency: trip.currency,
        coverImage: trip.coverImage,
        totalMembers: trip.members.length,
        myBalanceMinor: net,
        myStatus: myBalanceObj ? myBalanceObj.status : 'SETTLED',
      });
    }

    const preferredCurrency = req.user.preferredCurrency || 'INR';
    const currencySymbol = preferredCurrency === 'INR' ? '₹' : '$';

    return res.status(200).json({
      user: {
        username: req.user.username,
        fullName: req.user.fullName,
        avatarUrl: req.user.avatarUrl,
        preferredCurrency,
      },
      stats: {
        totalFriends,
        activeTripsCount: trips.length,
        incomingMinor: totalIncomingMinor,
        outgoingMinor: totalOutgoingMinor,
        netBalanceMinor: totalIncomingMinor - totalOutgoingMinor,
        formatted: {
          friends: `${totalFriends} Active`,
          incoming: `+${currencySymbol}${(totalIncomingMinor / 100).toFixed(2)}`,
          outgoing: `-${currencySymbol}${(totalOutgoingMinor / 100).toFixed(2)}`,
        },
      },
      recentTrips: tripSummaries.slice(0, 3),
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({ error: 'Failed to compute dashboard metrics' });
  }
};

module.exports = { getDashboardMetrics };
