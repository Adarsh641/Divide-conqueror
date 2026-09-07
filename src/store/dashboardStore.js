import { create } from 'zustand';
import api from '../services/api';

/**
 * Global Dashboard Store (Zustand)
 * Manages live MongoDB metrics (Friends, Incoming, Outgoing balances).
 *
 * Backend API contract (GET /api/dashboard):
 * {
 *   user: { username, fullName, avatarUrl, preferredCurrency },
 *   stats: {
 *     totalFriends, activeTripsCount, incomingMinor, outgoingMinor, netBalanceMinor,
 *     formatted: { friends, incoming, outgoing }
 *   },
 *   recentTrips: [{ id, name, destination, myBalanceMinor, myStatus, ... }]
 * }
 */
export const useDashboardStore = create((set) => ({
  stats: {
    friendsCount: 0,
    groupsCount: 0,
    netBalanceMinor: 0,
    incomingMinor: 0,
    outgoingMinor: 0,
  },
  recentTrips: [],
  user: null,
  isLoading: false,
  error: null,

  /**
   * Fetch live dashboard summary metrics from MongoDB Atlas.
   * Maps the exact backend field names: response.stats (NOT response.summary)
   */
  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getDashboardData();

      // Backend returns: response.stats (NOT response.summary)
      const stats = response.stats || {};

      set({
        stats: {
          friendsCount: stats.totalFriends ?? 0,          // backend: totalFriends
          groupsCount: stats.activeTripsCount ?? 0,        // backend: activeTripsCount
          netBalanceMinor: stats.netBalanceMinor ?? 0,     // backend: netBalanceMinor
          incomingMinor: stats.incomingMinor ?? 0,         // backend: incomingMinor
          outgoingMinor: stats.outgoingMinor ?? 0,         // backend: outgoingMinor
        },
        recentTrips: response.recentTrips || [],           // backend: recentTrips (NOT recentActivity)
        user: response.user || null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err.message || 'Failed to load dashboard data. Is the server running?',
      });
    }
  },
}));

export default useDashboardStore;
