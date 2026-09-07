import { create } from 'zustand';
import api from '../services/api';

/**
 * Global Trip Store (Zustand)
 * Manages live MongoDB trip documents and automatic refetch synchronization.
 */
export const useTripStore = create((set, get) => ({
  trips: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  /**
   * Fetch all active trips from backend MongoDB
   */
  fetchTrips: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getTrips();
      const tripsList = response.trips || [];

      // Format trips for clean UI rendering
      const formattedTrips = tripsList.map((t) => ({
        id: t.id,
        title: t.name,
        destination: t.destination,
        membersCount: t.totalMembers,
        totalExpense: `${t.currency === 'INR' ? '₹' : '$'}${(t.totalSpendMinor / 100).toFixed(0)}`,
        dateRange: `${new Date(t.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${new Date(t.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
        status: t.status === 'ACTIVE' ? 'Active' : t.status === 'SETTLED' ? 'Settled' : t.status,
        theme: t.coverImage || 'beach',
        myBalanceMinor: t.myBalanceMinor,
        myStatus: t.myStatus,
        members: t.members,
        rawTrip: t,
      }));

      set({
        trips: formattedTrips,
        isLoading: false,
        lastFetchedAt: Date.now(),
      });
      return formattedTrips;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      return [];
    }
  },

  /**
   * Create a new trip in backend & trigger refetch
   */
  createTrip: async (tripData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.createTrip(tripData);
      // Immediately refetch latest trips from MongoDB Atlas
      await get().fetchTrips();
      return response.trip;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },
}));

export default useTripStore;
