import { create } from 'zustand';
import api from '../services/api';

/**
 * Global Friend Store (Zustand)
 * Manages live MongoDB friend connections, friend requests, and user search.
 */
export const useFriendStore = create((set, get) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  error: null,
  successMessage: null,

  /**
   * Fetch all accepted friends
   */
  fetchFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getFriends();
      const friends = response.friends || [];
      set({ friends, isLoading: false });
      return friends;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      return [];
    }
  },

  /**
   * Fetch pending incoming and outgoing friend requests
   */
  fetchRequests: async () => {
    try {
      const response = await api.getFriendRequests();
      set({
        incomingRequests: response.incoming || [],
        outgoingRequests: response.outgoing || [],
      });
      return response;
    } catch (err) {
      console.error('[FriendStore] fetchRequests error:', err.message);
      return { incoming: [], outgoing: [] };
    }
  },

  /**
   * Fetch both friends and requests simultaneously
   */
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
      ]);
      set({
        friends: friendsRes.friends || [],
        incomingRequests: requestsRes.incoming || [],
        outgoingRequests: requestsRes.outgoing || [],
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /**
   * Search registered users by username
   */
  searchUsers: async (query) => {
    const clean = (query || '').trim().replace(/^@/, '');
    if (!clean || clean.length < 2) {
      set({ searchResults: [], isSearching: false });
      return [];
    }

    set({ isSearching: true, error: null });
    try {
      const response = await api.searchFriends(clean);
      const results = response.results || [];
      set({ searchResults: results, isSearching: false });
      return results;
    } catch (err) {
      set({ isSearching: false, error: err.message });
      return [];
    }
  },

  /**
   * Send a friend request to a target @username
   */
  sendFriendRequest: async (targetUsername) => {
    set({ error: null, successMessage: null });
    try {
      const response = await api.sendFriendRequest(targetUsername);
      const cleanTarget = targetUsername.toLowerCase().replace(/^@/, '');

      // If backend auto-accepted because mutual request was found
      if (response.friendshipStatus === 'FRIENDS') {
        await get().fetchAll();
      } else {
        // Update searchResults status in-place for instant UI feedback
        set((state) => ({
          searchResults: state.searchResults.map((user) =>
            user.username.toLowerCase() === cleanTarget
              ? { ...user, friendshipStatus: 'REQUEST_SENT' }
              : user
          ),
          successMessage: response.message || `Friend request sent to @${cleanTarget}`,
        }));
        await get().fetchRequests();
      }

      return response;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  /**
   * Respond to incoming friend request (ACCEPT or REJECT)
   */
  respondToRequest: async (requestId, action) => {
    set({ error: null });
    try {
      const response = await api.respondToFriendRequest(requestId, action);

      // Re-fetch friends and requests to keep everything in sync
      await get().fetchAll();

      set({ successMessage: response.message });
      return response;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  /**
   * Clear active error or success notifications
   */
  clearMessages: () => set({ error: null, successMessage: null }),
}));

export default useFriendStore;
