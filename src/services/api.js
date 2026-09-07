import useAuthStore from '../store/authStore';

// Backend base URL — update for production deployment
const BASE_URL = 'http://localhost:5001/api';

/**
 * Centralized API Service for Divide & Rule React Native App.
 * Handles authentication headers, request formatting, and error handling.
 * All field names match the exact backend API contract.
 */
class ApiService {
  /**
   * Core HTTP helper — auto-injects JWT Authorization header.
   */
  async request(endpoint, options = {}) {
    const { token } = useAuthStore.getState();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      // Re-throw with enriched context
      const msg = error.message || 'Network request failed';
      console.error(`[API] ${options.method || 'GET'} ${endpoint} → ${msg}`);
      throw new Error(msg);
    }
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  async login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  async signup(fullName, username, email, password) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, username, email, password }),
    });
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  /**
   * GET /api/dashboard
   * Returns: { user, stats: { totalFriends, activeTripsCount, incomingMinor, outgoingMinor, netBalanceMinor, formatted }, recentTrips }
   */
  async getDashboardData() {
    return this.request('/dashboard', { method: 'GET' });
  }

  // ─── TRIPS ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/trips
   * Returns: { trips: [{ id, name, destination, totalMembers, totalSpendMinor, myBalanceMinor, status, ... }] }
   */
  async getTrips() {
    return this.request('/trips', { method: 'GET' });
  }

  async getTripDetails(tripId) {
    return this.request(`/trips/${tripId}`, { method: 'GET' });
  }

  /**
   * POST /api/trips
   * Body: { name, destination, startDate, endDate, currency, memberUsernames[], coverImage, notes }
   * Returns: { message, trip: { id, name, ... } }
   */
  async createTrip(payload) {
    return this.request('/trips', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── FRIENDS ───────────────────────────────────────────────────────────────

  /**
   * GET /api/friends
   * Returns: { friends: [{ username, fullName, avatarUrl }] }
   */
  async getFriends() {
    return this.request('/friends', { method: 'GET' });
  }

  /**
   * GET /api/friends/search?q=query
   * Returns: { results: [{ username, fullName, avatarUrl, friendshipStatus }] }
   */
  async searchFriends(query) {
    const q = encodeURIComponent(query.trim().toLowerCase().replace(/^@/, ''));
    return this.request(`/friends/search?q=${q}`, { method: 'GET' });
  }

  /**
   * GET /api/friends/requests
   * Returns: { incoming: [...], outgoing: [...] }
   */
  async getFriendRequests() {
    return this.request('/friends/requests', { method: 'GET' });
  }

  /**
   * POST /api/friends/request
   * Backend field name: targetUsername (NOT friendUsername)
   * Returns: { message, requestId, friendshipStatus }
   */
  async sendFriendRequest(targetUsername) {
    return this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ targetUsername }),   // ✅ matches backend: const { targetUsername } = req.body
    });
  }

  /**
   * POST /api/friends/requests/:id/respond
   * Body: { action: 'ACCEPT' | 'REJECT' }
   */
  async respondToFriendRequest(requestId, action) {
    return this.request(`/friends/requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // ─── EXPENSES & SETTLEMENTS ──────────────────────────────────────────────

  /**
   * GET /api/trips/:tripId/expenses
   */
  async getTripExpenses(tripId, category) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/trips/${tripId}/expenses${query}`, { method: 'GET' });
  }

  /**
   * POST /api/trips/:tripId/expenses
   * Body: { title, amountMinor, category, splitType, paidByUsername, splitBetweenUsernames, splits, notes, expenseDate }
   */
  async addTripExpense(tripId, payload) {
    return this.request(`/trips/${tripId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * DELETE /api/trips/:tripId/expenses/:expenseId
   */
  async deleteTripExpense(tripId, expenseId) {
    return this.request(`/trips/${tripId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  /**
   * GET /api/trips/:tripId/balances
   */
  async getTripBalances(tripId) {
    return this.request(`/trips/${tripId}/balances`, { method: 'GET' });
  }

  /**
   * GET /api/trips/:tripId/settlements
   */
  async getTripSettlements(tripId) {
    return this.request(`/trips/${tripId}/settlements`, { method: 'GET' });
  }

  /**
   * POST /api/trips/:tripId/settlements/record
   * Body: { payerUsername, receiverUsername, amountMinor, notes }
   */
  async recordTripSettlement(tripId, payload) {
    return this.request(`/trips/${tripId}/settlements/record`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /api/trips/:tripId/settlements/request
   * Body: { creditorUsername, amountMinor, paymentMethod, proofOrNote }
   */
  async requestTripSettlement(tripId, payload) {
    return this.request(`/trips/${tripId}/settlements/request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * GET /api/trips/:tripId/settlements/pending
   */
  async getPendingTripSettlements(tripId) {
    return this.request(`/trips/${tripId}/settlements/pending`, { method: 'GET' });
  }

  /**
   * POST /api/trips/:tripId/settlements/:requestId/respond
   * Body: { action: 'APPROVE' | 'REJECT' }
   */
  async respondToTripSettlement(tripId, requestId, action) {
    return this.request(`/trips/${tripId}/settlements/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  /**
   * GET /api/trips/:tripId/expenses/pending-splits
   */
  async getPendingExpenseSplits(tripId) {
    return this.request(`/trips/${tripId}/expenses/pending-splits`, { method: 'GET' });
  }

  /**
   * POST /api/trips/:tripId/expenses/:expenseId/splits/respond
   * Body: { action: 'ACCEPT' | 'DECLINE' }
   */
  async respondToExpenseSplit(tripId, expenseId, action) {
    return this.request(`/trips/${tripId}/expenses/${expenseId}/splits/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }
}

export const api = new ApiService();
export default api;
