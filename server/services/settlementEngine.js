const { computeTripBalances } = require('./balanceEngine');
const User = require('../models/User');

/**
 * Greedy Minimum Cash Flow Algorithm (Debt Simplification)
 * Reduces an arbitrary directed graph of debts among N members into at most N - 1 payments.
 * 
 * @param {Map<string, number>} netBalanceMap Map of userId -> net balance (positive = creditor, negative = debtor)
 * @param {Map<string, object>} userDetailsMap Map of userId -> { username, fullName, avatarUrl }
 * @param {string} currency Currency code
 * @returns {Array<object>} Optimized settlement transactions
 */
function simplifyDebts(netBalanceMap, userDetailsMap, currency = 'INR') {
  const debtors = [];
  const creditors = [];

  for (const [userId, net] of netBalanceMap.entries()) {
    if (net < 0) {
      debtors.push({ userId, amount: -net }); // Convert negative balance to positive debt
    } else if (net > 0) {
      creditors.push({ userId, amount: net });
    }
  }

  // Sort descending by magnitude to minimize total transactions greedily
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0) {
      const fromUser = userDetailsMap.get(debtor.userId) || { username: debtor.userId };
      const toUser = userDetailsMap.get(creditor.userId) || { username: creditor.userId };

      transactions.push({
        fromUserId: debtor.userId,
        fromUsername: fromUser.username,
        fromFullName: fromUser.fullName,
        toUserId: creditor.userId,
        toUsername: toUser.username,
        toFullName: toUser.fullName,
        amountMinor: settledAmount,
        currency,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount === 0) d++;
    if (creditor.amount === 0) c++;
  }

  return transactions;
}

/**
 * Computes optimized settlement plan for a trip dynamically.
 */
async function computeTripSettlement(tripId) {
  const balanceData = await computeTripBalances(tripId);

  const userDetailsMap = new Map();
  balanceData.memberBalances.forEach((m) => {
    userDetailsMap.set(m.userId, {
      username: m.username,
      fullName: m.fullName,
      avatarUrl: m.avatarUrl,
    });
  });

  const settlementPlan = simplifyDebts(
    balanceData.netBalanceMap,
    userDetailsMap,
    balanceData.currency
  );

  return {
    tripId: balanceData.tripId,
    tripName: balanceData.tripName,
    currency: balanceData.currency,
    tripTotalSpendMinor: balanceData.tripTotalSpendMinor,
    memberBalances: balanceData.memberBalances,
    settlementPlan,
    totalSettlementTransactions: settlementPlan.length,
  };
}

module.exports = {
  simplifyDebts,
  computeTripSettlement,
};
