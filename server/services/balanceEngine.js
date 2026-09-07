const Expense = require('../models/Expense');
const Trip = require('../models/Trip');

/**
 * Calculates equal splits for an expense in minor currency units (paise/cents).
 * Ensures zero-drift remainder allocation:
 * base = Math.floor(amountMinor / memberCount)
 * remainder = amountMinor % memberCount
 * First `remainder` members receive (base + 1), remaining receive base.
 * Total shares sum exactly to amountMinor.
 */
function calculateEqualSplits(amountMinor, memberIds) {
  if (!memberIds || memberIds.length === 0) {
    throw new Error('Split requires at least one member');
  }

  const count = memberIds.length;
  const base = Math.floor(amountMinor / count);
  const remainder = amountMinor % count;

  return memberIds.map((userId, index) => {
    const extra = index < remainder ? 1 : 0;
    return {
      userId,
      shareAmountMinor: base + extra,
    };
  });
}

/**
 * Calculates percentage splits for an expense in minor currency units.
 * splitInputs: Array of { userId, percentage }
 * Validates sum of percentages is 100%.
 * Allocates remainder cents to the highest fractions so that sum equals amountMinor exactly.
 */
function calculatePercentageSplits(amountMinor, splitInputs) {
  if (!splitInputs || splitInputs.length === 0) {
    throw new Error('Split requires at least one member');
  }

  const totalPercentage = splitInputs.reduce((sum, s) => sum + Number(s.percentage || 0), 0);
  if (Math.abs(totalPercentage - 100) > 0.05) {
    throw new Error(`Total percentage must equal 100% (currently ${totalPercentage.toFixed(1)}%)`);
  }

  let allocated = 0;
  const rawSplits = splitInputs.map((s) => {
    const raw = (amountMinor * Number(s.percentage)) / 100;
    const base = Math.floor(raw);
    const fraction = raw - base;
    allocated += base;
    return {
      userId: s.userId,
      shareAmountMinor: base,
      fraction,
    };
  });

  // Distribute leftover minor units by sorting descending by fraction
  let leftover = amountMinor - allocated;
  const sortedIndices = [...rawSplits.keys()].sort((a, b) => rawSplits[b].fraction - rawSplits[a].fraction);

  for (let i = 0; i < leftover; i++) {
    const idx = sortedIndices[i % sortedIndices.length];
    rawSplits[idx].shareAmountMinor += 1;
  }

  return rawSplits.map((s) => ({
    userId: s.userId,
    shareAmountMinor: s.shareAmountMinor,
  }));
}

/**
 * Validates and formats exact share splits.
 * splitInputs: Array of { userId, amountMinor }
 * Validates sum of shares equals exact total amountMinor.
 */
function calculateExactSplits(amountMinor, splitInputs) {
  if (!splitInputs || splitInputs.length === 0) {
    throw new Error('Split requires at least one member');
  }

  let sum = 0;
  const formatted = splitInputs.map((s) => {
    const share = Math.round(Number(s.amountMinor || 0));
    if (share < 0) {
      throw new Error('Individual shares cannot be negative');
    }
    sum += share;
    return {
      userId: s.userId,
      shareAmountMinor: share,
    };
  });

  if (sum !== amountMinor) {
    throw new Error(`Sum of exact shares (${sum} paise) must equal total expense amount (${amountMinor} paise)`);
  }

  return formatted;
}

/**
 * Dynamically computes net balances for all members of a trip from non-deleted expenses.
 * Invariant: Sum of all net balances always equals 0.
 */
async function computeTripBalances(tripId) {
  const trip = await Trip.findOne({ _id: tripId, deletedAt: null }).populate('members.userId', 'username fullName avatarUrl');
  if (!trip) {
    throw new Error('Trip not found or deleted');
  }

  // Fetch all active expenses for this trip
  const expenses = await Expense.find({ tripId, deletedAt: null });

  // Map of userId string -> net balance in minor units
  const netBalanceMap = new Map();
  const totalPaidMap = new Map();
  const totalShareMap = new Map();
  const pendingShareMap = new Map();
  const pendingCreditMap = new Map();

  // Initialize all members to 0 balance
  trip.members.forEach((m) => {
    const uId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
    netBalanceMap.set(uId, 0);
    totalPaidMap.set(uId, 0);
    totalShareMap.set(uId, 0);
    pendingShareMap.set(uId, 0);
    pendingCreditMap.set(uId, 0);
  });

  let tripTotalSpendMinor = 0;

  // Aggregate paid amounts and shares
  for (const exp of expenses) {
    tripTotalSpendMinor += exp.amountMinor;
    const payerId = exp.paidById.toString();

    // Process each split according to consent status
    for (const split of exp.splitBetween) {
      const splitUserId = split.userId.toString();
      const splitStatus = exp.category === 'SETTLEMENT' ? 'ACCEPTED' : (split.status || 'ACCEPTED');

      if (splitStatus === 'ACCEPTED') {
        // Credit payer for accepted portion
        const currentPayerPaid = totalPaidMap.get(payerId) || 0;
        totalPaidMap.set(payerId, currentPayerPaid + split.shareAmountMinor);

        // Debit split member
        const currentShare = totalShareMap.get(splitUserId) || 0;
        totalShareMap.set(splitUserId, currentShare + split.shareAmountMinor);
      } else if (splitStatus === 'PENDING') {
        // Pending approval: member has not consented yet
        const currentPendingShare = pendingShareMap.get(splitUserId) || 0;
        pendingShareMap.set(splitUserId, currentPendingShare + split.shareAmountMinor);

        const currentPendingCredit = pendingCreditMap.get(payerId) || 0;
        pendingCreditMap.set(payerId, currentPendingCredit + split.shareAmountMinor);
      }
      // If DECLINED: not included in balance or pending
    }
  }

  // Compute final net balances
  const memberBalances = [];
  for (const m of trip.members) {
    const uId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
    const paid = totalPaidMap.get(uId) || 0;
    const share = totalShareMap.get(uId) || 0;
    const net = paid - share;
    netBalanceMap.set(uId, net);

    let status = 'SETTLED';
    if (net > 0) status = 'IS_OWED';
    else if (net < 0) status = 'OWES';

    const userObj = m.userId._id ? m.userId : null;

    memberBalances.push({
      userId: uId,
      username: userObj ? userObj.username : null,
      fullName: userObj ? userObj.fullName : null,
      avatarUrl: userObj ? userObj.avatarUrl : null,
      role: m.role,
      totalPaidMinor: paid,
      totalShareMinor: share,
      netBalanceMinor: net,
      pendingShareMinor: pendingShareMap.get(uId) || 0,
      pendingCreditMinor: pendingCreditMap.get(uId) || 0,
      status,
    });
  }

  return {
    tripId: trip._id.toString(),
    tripName: trip.name,
    currency: trip.currency,
    totalExpensesCount: expenses.length,
    tripTotalSpendMinor,
    memberBalances,
    netBalanceMap, // Map used directly by settlementEngine
  };
}

module.exports = {
  calculateEqualSplits,
  calculatePercentageSplits,
  calculateExactSplits,
  computeTripBalances,
};
