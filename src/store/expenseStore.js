import { create } from 'zustand';
import api from '../services/api';

/**
 * Global Expense & Settlement Store (Zustand)
 * Manages live trip expenses, member balances, and greedy debt minimization plans.
 */
export const useExpenseStore = create((set, get) => ({
  expenses: [],
  balances: [],
  settlementPlan: [],
  pendingSettlements: [],
  pendingExpenseSplits: [],
  tripSummary: {
    tripId: null,
    tripName: '',
    currency: 'INR',
    tripTotalSpendMinor: 0,
    totalExpensesCount: 0,
  },
  isLoading: false,
  isActionLoading: false,
  error: null,
  successMessage: null,

  /**
   * Fetch all trip data (expenses, balances, settlements, pending requests) in parallel
   */
  fetchTripData: async (tripId) => {
    if (!tripId) return;
    set({ isLoading: true, error: null });

    try {
      const [expensesRes, balancesRes, settlementsRes, pendingRes, pendingSplitsRes] = await Promise.all([
        api.getTripExpenses(tripId),
        api.getTripBalances(tripId),
        api.getTripSettlements(tripId),
        api.getPendingTripSettlements(tripId).catch(() => ({ pendingRequests: [] })),
        api.getPendingExpenseSplits(tripId).catch(() => ({ pendingSplits: [] })),
      ]);

      const expenses = expensesRes.expenses || [];
      const balances = balancesRes.balances || [];
      const settlementPlan = settlementsRes.settlementPlan || [];
      const pendingSettlements = pendingRes.pendingRequests || [];
      const pendingExpenseSplits = pendingSplitsRes.pendingSplits || [];

      set({
        expenses,
        balances,
        settlementPlan,
        pendingSettlements,
        pendingExpenseSplits,
        tripSummary: {
          tripId,
          tripName: balancesRes.tripName || 'Trip Details',
          currency: balancesRes.currency || 'INR',
          tripTotalSpendMinor: balancesRes.tripTotalSpendMinor || 0,
          totalExpensesCount: balancesRes.totalExpensesCount || expenses.length,
        },
        isLoading: false,
      });

      return { expenses, balances, settlementPlan, pendingSettlements, pendingExpenseSplits };
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Add a new expense (Equal, Percentage, or Exact)
   */
  addExpense: async (tripId, payload) => {
    set({ isActionLoading: true, error: null, successMessage: null });

    try {
      const response = await api.addTripExpense(tripId, payload);
      // Immediately refresh live trip data
      await get().fetchTripData(tripId);

      set({
        isActionLoading: false,
        successMessage: response.message || 'Expense added successfully',
      });
      return response.expense;
    } catch (err) {
      set({ isActionLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Record a one-tap settlement confirmation
   */
  recordSettlement: async (tripId, payload) => {
    set({ isActionLoading: true, error: null, successMessage: null });

    try {
      const response = await api.recordTripSettlement(tripId, payload);
      // Immediately refresh live trip data
      await get().fetchTripData(tripId);

      set({
        isActionLoading: false,
        successMessage: response.message || 'Settlement recorded successfully',
      });
      return response;
    } catch (err) {
      set({ isActionLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Initiate a 2-step settlement request (Debtor marks as paid -> awaits Creditor approval)
   */
  requestSettlement: async (tripId, payload) => {
    set({ isActionLoading: true, error: null, successMessage: null });

    try {
      const response = await api.requestTripSettlement(tripId, payload);
      await get().fetchTripData(tripId);

      set({
        isActionLoading: false,
        successMessage: response.message || 'Settlement request sent! Awaiting confirmation.',
      });
      return response;
    } catch (err) {
      set({ isActionLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Creditor responds to a settlement request (Approve or Reject)
   */
  respondSettlement: async (tripId, requestId, action) => {
    set({ isActionLoading: true, error: null, successMessage: null });

    try {
      const response = await api.respondToTripSettlement(tripId, requestId, action);
      await get().fetchTripData(tripId);

      set({
        isActionLoading: false,
        successMessage: response.message || (action === 'APPROVE' ? 'Settlement confirmed! Balance zeroed out.' : 'Settlement rejected.'),
      });
      return response;
    } catch (err) {
      set({ isActionLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Delete an expense
   */
  deleteExpense: async (tripId, expenseId) => {
    set({ isActionLoading: true, error: null, successMessage: null });

    try {
      await api.deleteTripExpense(tripId, expenseId);
      await get().fetchTripData(tripId);

      set({
        isActionLoading: false,
        successMessage: 'Expense deleted successfully',
      });
    } catch (err) {
      set({ isActionLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Respond to a bill split request (Accept or Decline)
   */
  respondToExpenseSplit: async (tripId, expenseId, action) => {
    set({ isActionLoading: true, error: null, successMessage: null });

    try {
      const response = await api.respondToExpenseSplit(tripId, expenseId, action);
      await get().fetchTripData(tripId);

      set({
        isActionLoading: false,
        successMessage: response.message || (action === 'ACCEPT' ? 'Split accepted! Balance updated.' : 'Split declined.'),
      });
      return response;
    } catch (err) {
      set({ isActionLoading: false, error: err.message });
      throw err;
    }
  },

  clearMessages: () => set({ error: null, successMessage: null }),
}));

export default useExpenseStore;
