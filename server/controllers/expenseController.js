const Expense = require('../models/Expense');
const SettlementRequest = require('../models/SettlementRequest');
const Trip = require('../models/Trip');
const User = require('../models/User');
const {
  calculateEqualSplits,
  calculatePercentageSplits,
  calculateExactSplits,
  computeTripBalances,
} = require('../services/balanceEngine');
const { computeTripSettlement } = require('../services/settlementEngine');

// Helper to verify user membership in trip
async function verifyTripMembership(tripId, userId) {
  const trip = await Trip.findOne({
    _id: tripId,
    deletedAt: null,
    'members.userId': userId,
  }).populate('members.userId', 'username fullName avatarUrl');

  return trip;
}

// @desc    Add a new expense to a trip
// @route   POST /api/trips/:tripId/expenses
// @access  Private (Trip members only)
const addExpense = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const {
      title,
      amountMinor,
      amount, // Optional standard currency input (e.g. 4000 -> 400000)
      category = 'OTHER',
      splitType = 'EQUAL', // 'EQUAL' | 'PERCENTAGE' | 'EXACT'
      paidByUsername,
      splitBetweenUsernames,
      splits, // For PERCENTAGE: [{ username, percentage }] or EXACT: [{ username, amountMinor / amount }]
      notes,
      expenseDate,
      receiptUrl,
    } = req.body;

    // Convert standard currency unit to integer minor units if provided
    let totalAmountMinor = amountMinor;
    if (totalAmountMinor === undefined && amount !== undefined) {
      totalAmountMinor = Math.round(Number(amount) * 100);
    }

    if (!title || !totalAmountMinor || totalAmountMinor <= 0) {
      return res.status(400).json({ error: 'Valid title and positive amount are required' });
    }

    // Build member lookup map (normalized lowercase username -> userId)
    const memberMap = new Map();
    trip.members.forEach((m) => {
      const u = m.userId;
      memberMap.set(u.username.toLowerCase(), u._id);
    });

    // Determine Payer
    const payerName = (paidByUsername || req.user.username).trim().toLowerCase().replace(/^@/, '');
    const payerUserId = memberMap.get(payerName);
    if (!payerUserId) {
      return res.status(400).json({
        error: `@${payerName} is not a member of this trip`,
      });
    }

    let splitDetails = [];

    if (splitType.toUpperCase() === 'PERCENTAGE') {
      if (!Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({ error: 'splits array with percentages is required for percentage split' });
      }

      const percentageInputs = [];
      for (const s of splits) {
        const uName = (s.username || '').trim().toLowerCase().replace(/^@/, '');
        const uid = memberMap.get(uName);
        if (!uid) {
          return res.status(400).json({ error: `@${uName} is not a member of this trip` });
        }
        percentageInputs.push({
          userId: uid,
          percentage: Number(s.percentage || 0),
        });
      }

      splitDetails = calculatePercentageSplits(totalAmountMinor, percentageInputs);
    } else if (splitType.toUpperCase() === 'EXACT') {
      if (!Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({ error: 'splits array with exact amounts is required for exact share split' });
      }

      const exactInputs = [];
      for (const s of splits) {
        const uName = (s.username || '').trim().toLowerCase().replace(/^@/, '');
        const uid = memberMap.get(uName);
        if (!uid) {
          return res.status(400).json({ error: `@${uName} is not a member of this trip` });
        }
        let shareMinor = s.amountMinor;
        if (shareMinor === undefined && s.amount !== undefined) {
          shareMinor = Math.round(Number(s.amount) * 100);
        }
        exactInputs.push({
          userId: uid,
          amountMinor: shareMinor || 0,
        });
      }

      splitDetails = calculateExactSplits(totalAmountMinor, exactInputs);
    } else {
      // Default: EQUAL split
      let splitUserIds = [];
      if (Array.isArray(splitBetweenUsernames) && splitBetweenUsernames.length > 0) {
        for (const rawName of splitBetweenUsernames) {
          const cleanName = rawName.trim().toLowerCase().replace(/^@/, '');
          const uid = memberMap.get(cleanName);
          if (!uid) {
            return res.status(400).json({
              error: `@${cleanName} is not a member of this trip`,
            });
          }
          splitUserIds.push(uid);
        }
      } else {
        // Default to all trip members
        splitUserIds = trip.members.map((m) => m.userId._id);
      }

      // Remove duplicates
      splitUserIds = [...new Set(splitUserIds.map((id) => id.toString()))];
      splitDetails = calculateEqualSplits(totalAmountMinor, splitUserIds);
    }

    // Set split status: payer is auto-ACCEPTED; other members start as PENDING
    const isSettlement = category.toUpperCase() === 'SETTLEMENT';
    const splitDetailsWithStatus = splitDetails.map((s) => {
      const isPayer = s.userId.toString() === payerUserId.toString();
      return {
        userId: s.userId,
        shareAmountMinor: s.shareAmountMinor,
        status: isPayer || isSettlement ? 'ACCEPTED' : 'PENDING',
        respondedAt: isPayer || isSettlement ? new Date() : null,
      };
    });

    const expense = await Expense.create({
      tripId,
      title: title.trim(),
      amountMinor: totalAmountMinor,
      currency: trip.currency,
      category: category.toUpperCase(),
      splitType: splitType.toUpperCase(),
      paidById: payerUserId,
      splitBetween: splitDetailsWithStatus,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes: (notes || '').trim(),
      receiptUrl: receiptUrl || null,
    });

    const populated = await Expense.findById(expense._id)
      .populate('paidById', 'username fullName')
      .populate('splitBetween.userId', 'username fullName');

    return res.status(201).json({
      message: 'Expense added successfully',
      expense: {
        id: populated._id.toString(),
        title: populated.title,
        amountMinor: populated.amountMinor,
        currency: populated.currency,
        category: populated.category,
        paidBy: {
          username: populated.paidById.username,
          fullName: populated.paidById.fullName,
        },
        splitBetween: populated.splitBetween.map((s) => ({
          userId: s.userId._id.toString(),
          username: s.userId.username,
          fullName: s.userId.fullName,
          shareAmountMinor: s.shareAmountMinor,
          status: s.status,
        })),
        notes: populated.notes,
        expenseDate: populated.expenseDate,
      },
    });
  } catch (error) {
    console.error('Add expense error:', error);
    return res.status(500).json({ error: 'Failed to add expense' });
  }
};

// @desc    Get all active expenses for a trip
// @route   GET /api/trips/:tripId/expenses
// @access  Private (Trip members only)
const getTripExpenses = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const { category } = req.query;
    const filter = { tripId, deletedAt: null };
    if (category) filter.category = category.toUpperCase();

    const expenses = await Expense.find(filter)
      .populate('paidById', 'username fullName avatarUrl')
      .populate('splitBetween.userId', 'username fullName')
      .sort({ expenseDate: -1, createdAt: -1 });

    const formatted = expenses.map((e) => {
      const mySplit = e.splitBetween.find(
        (s) => s.userId._id.toString() === req.user._id.toString()
      );

      return {
        id: e._id.toString(),
        title: e.title,
        amountMinor: e.amountMinor,
        currency: e.currency,
        category: e.category,
        paidBy: {
          username: e.paidById.username,
          fullName: e.paidById.fullName,
          avatarUrl: e.paidById.avatarUrl,
        },
        isPayer: e.paidById._id.toString() === req.user._id.toString(),
        myShareMinor: mySplit ? mySplit.shareAmountMinor : 0,
        mySplitStatus: mySplit ? (mySplit.status || 'ACCEPTED') : null,
        needsMyApproval: mySplit ? mySplit.status === 'PENDING' : false,
        isInvolved: !!mySplit || e.paidById._id.toString() === req.user._id.toString(),
        splitCount: e.splitBetween.length,
        splitBetween: e.splitBetween.map((s) => ({
          userId: s.userId._id.toString(),
          username: s.userId.username,
          fullName: s.userId.fullName,
          shareAmountMinor: s.shareAmountMinor,
          status: s.status || 'ACCEPTED',
        })),
        notes: e.notes,
        expenseDate: e.expenseDate,
        createdAt: e.createdAt,
      };
    });

    return res.status(200).json({ expenses: formatted });
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({ error: 'Failed to retrieve expenses' });
  }
};

// @desc    Soft delete an expense
// @route   DELETE /api/trips/:tripId/expenses/:expenseId
// @access  Private (Payer or Trip Owner only)
const deleteExpense = async (req, res) => {
  try {
    const { tripId, expenseId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const expense = await Expense.findOne({ _id: expenseId, tripId, deletedAt: null });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const isPayer = expense.paidById.toString() === req.user._id.toString();
    const isOwner = trip.ownerId.toString() === req.user._id.toString();

    if (!isPayer && !isOwner) {
      return res.status(403).json({ error: 'Only the payer or trip owner can delete this expense' });
    }

    expense.deletedAt = new Date();
    await expense.save();

    return res.status(200).json({
      message: 'Expense deleted successfully',
      expenseId,
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    return res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// @desc    Get dynamic member balances for a trip
// @route   GET /api/trips/:tripId/balances
// @access  Private (Trip members only)
const getBalances = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const result = await computeTripBalances(tripId);

    return res.status(200).json({
      tripId: result.tripId,
      tripName: result.tripName,
      currency: result.currency,
      totalExpensesCount: result.totalExpensesCount,
      tripTotalSpendMinor: result.tripTotalSpendMinor,
      balances: result.memberBalances,
    });
  } catch (error) {
    console.error('Get balances error:', error);
    return res.status(500).json({ error: 'Failed to compute balances' });
  }
};

// @desc    Get optimized settlement plan (Min-Cash-Flow)
// @route   GET /api/trips/:tripId/settlements
// @access  Private (Trip members only)
const getSettlements = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const result = await computeTripSettlement(tripId);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get settlements error:', error);
    return res.status(500).json({ error: 'Failed to compute settlement plan' });
  }
};

// @desc    Record a one-tap settlement transaction between two trip members
// @route   POST /api/trips/:tripId/settlements/record
// @access  Private (Trip members only)
const recordSettlement = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const {
      payerUsername,
      receiverUsername,
      amountMinor,
      amount,
      notes = 'Settlement payment',
    } = req.body;

    let finalAmountMinor = amountMinor;
    if (finalAmountMinor === undefined && amount !== undefined) {
      finalAmountMinor = Math.round(Number(amount) * 100);
    }

    if (!payerUsername || !receiverUsername || !finalAmountMinor || finalAmountMinor <= 0) {
      return res.status(400).json({
        error: 'payerUsername, receiverUsername, and positive amount are required',
      });
    }

    // Build member lookup map
    const memberMap = new Map();
    trip.members.forEach((m) => {
      const u = m.userId;
      memberMap.set(u.username.toLowerCase(), u);
    });

    const cleanPayer = payerUsername.trim().toLowerCase().replace(/^@/, '');
    const cleanReceiver = receiverUsername.trim().toLowerCase().replace(/^@/, '');

    const payerUser = memberMap.get(cleanPayer);
    const receiverUser = memberMap.get(cleanReceiver);

    if (!payerUser) {
      return res.status(400).json({ error: `@${cleanPayer} is not a member of this trip` });
    }
    if (!receiverUser) {
      return res.status(400).json({ error: `@${cleanReceiver} is not a member of this trip` });
    }
    if (payerUser._id.toString() === receiverUser._id.toString()) {
      return res.status(400).json({ error: 'Payer and receiver cannot be the same user' });
    }

    const settlementExpense = await Expense.create({
      tripId,
      title: `Settlement: @${payerUser.username} → @${receiverUser.username}`,
      amountMinor: finalAmountMinor,
      currency: trip.currency,
      category: 'SETTLEMENT',
      splitType: 'EXACT',
      paidById: payerUser._id,
      splitBetween: [
        {
          userId: receiverUser._id,
          shareAmountMinor: finalAmountMinor,
        },
      ],
      expenseDate: new Date(),
      notes: notes.trim(),
    });

    // Re-compute fresh settlement plan and balances after this payment
    const updatedSettlement = await computeTripSettlement(tripId);

    return res.status(201).json({
      message: `Successfully settled ₹${(finalAmountMinor / 100).toFixed(0)} between @${payerUser.username} and @${receiverUser.username}`,
      settlementExpense: {
        id: settlementExpense._id.toString(),
        payer: payerUser.username,
        receiver: receiverUser.username,
        amountMinor: finalAmountMinor,
      },
      ...updatedSettlement,
    });
  } catch (error) {
    console.error('Record settlement error:', error);
    return res.status(500).json({ error: 'Failed to record settlement' });
  }
};

// @desc    Initiate a settlement request (Debtor marks as paid -> awaits Creditor approval)
// @route   POST /api/trips/:tripId/settlements/request
// @access  Private (Trip members only)
const requestSettlement = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const {
      creditorUsername,
      receiverUsername,
      amountMinor,
      amount,
      paymentMethod = 'UPI',
      proofOrNote = '',
    } = req.body;

    let finalAmountMinor = amountMinor;
    if (finalAmountMinor === undefined && amount !== undefined) {
      finalAmountMinor = Math.round(Number(amount) * 100);
    }

    const targetCreditor = creditorUsername || receiverUsername;
    if (!targetCreditor || !finalAmountMinor || finalAmountMinor <= 0) {
      return res.status(400).json({
        error: 'Creditor username and a positive amount are required',
      });
    }

    // Build member lookup map
    const memberMap = new Map();
    trip.members.forEach((m) => {
      const u = m.userId;
      memberMap.set(u.username.toLowerCase(), u);
    });

    const cleanCreditor = targetCreditor.trim().toLowerCase().replace(/^@/, '');
    const creditorUser = memberMap.get(cleanCreditor);

    if (!creditorUser) {
      return res.status(400).json({ error: `@${cleanCreditor} is not a member of this trip` });
    }

    if (creditorUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot settle debts with yourself' });
    }

    // Check if an identical pending request already exists between these users
    const existingPending = await SettlementRequest.findOne({
      tripId,
      payerId: req.user._id,
      receiverId: creditorUser._id,
      status: 'PENDING',
    });

    if (existingPending) {
      return res.status(400).json({
        error: `A settlement request for ₹${(existingPending.amountMinor / 100).toFixed(0)} is already pending approval from @${creditorUser.username}`,
        pendingRequest: existingPending,
      });
    }

    const newRequest = await SettlementRequest.create({
      tripId,
      payerId: req.user._id,
      receiverId: creditorUser._id,
      amountMinor: finalAmountMinor,
      currency: trip.currency,
      paymentMethod: ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'].includes(paymentMethod.toUpperCase())
        ? paymentMethod.toUpperCase()
        : 'UPI',
      proofOrNote: (proofOrNote || '').trim(),
      status: 'PENDING',
    });

    const populated = await SettlementRequest.findById(newRequest._id)
      .populate('payerId', 'username fullName avatarUrl')
      .populate('receiverId', 'username fullName avatarUrl');

    return res.status(201).json({
      message: `Settlement request of ₹${(finalAmountMinor / 100).toFixed(0)} sent to @${creditorUser.username}. Awaiting their confirmation.`,
      settlementRequest: {
        id: populated._id.toString(),
        tripId: populated.tripId,
        payer: populated.payerId,
        receiver: populated.receiverId,
        amountMinor: populated.amountMinor,
        currency: populated.currency,
        paymentMethod: populated.paymentMethod,
        proofOrNote: populated.proofOrNote,
        status: populated.status,
        createdAt: populated.createdAt,
      },
    });
  } catch (error) {
    console.error('Request settlement error:', error);
    return res.status(500).json({ error: 'Failed to create settlement request' });
  }
};

// @desc    Get all pending settlement requests for a trip
// @route   GET /api/trips/:tripId/settlements/pending
// @access  Private (Trip members only)
const getPendingSettlements = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const pendingRequests = await SettlementRequest.find({
      tripId,
      status: 'PENDING',
    })
      .populate('payerId', 'username fullName avatarUrl')
      .populate('receiverId', 'username fullName avatarUrl')
      .sort({ createdAt: -1 });

    const formatted = pendingRequests.map((r) => {
      const isReceiver = r.receiverId._id.toString() === req.user._id.toString();
      const isPayer = r.payerId._id.toString() === req.user._id.toString();
      return {
        id: r._id.toString(),
        tripId: r.tripId,
        payer: r.payerId,
        receiver: r.receiverId,
        amountMinor: r.amountMinor,
        currency: r.currency,
        paymentMethod: r.paymentMethod,
        proofOrNote: r.proofOrNote,
        status: r.status,
        createdAt: r.createdAt,
        needsMyApproval: isReceiver,
        sentByMe: isPayer,
      };
    });

    return res.status(200).json({
      count: formatted.length,
      pendingRequests: formatted,
    });
  } catch (error) {
    console.error('Get pending settlements error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending settlements' });
  }
};

// @desc    Creditor approves or rejects a settlement request
// @route   POST /api/trips/:tripId/settlements/:requestId/respond
// @access  Private (Receiver/Creditor only)
const respondToSettlementRequest = async (req, res) => {
  try {
    const { tripId, requestId } = req.params;
    const { action } = req.body; // 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'action must be either APPROVE or REJECT' });
    }

    const trip = await verifyTripMembership(tripId, req.user._id);
    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const settlementReq = await SettlementRequest.findOne({
      _id: requestId,
      tripId,
    })
      .populate('payerId', 'username fullName avatarUrl')
      .populate('receiverId', 'username fullName avatarUrl');

    if (!settlementReq) {
      return res.status(404).json({ error: 'Settlement request not found' });
    }

    if (settlementReq.status !== 'PENDING') {
      return res.status(400).json({
        error: `This request has already been ${settlementReq.status.toLowerCase()}`,
      });
    }

    // Security: Only the receiver/creditor can approve or reject!
    if (settlementReq.receiverId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Only the creditor receiving the payment can approve or reject this request',
      });
    }

    if (action === 'REJECT') {
      settlementReq.status = 'REJECTED';
      settlementReq.resolvedAt = new Date();
      await settlementReq.save();

      return res.status(200).json({
        message: `Settlement request from @${settlementReq.payerId.username} was rejected. Debt remains active.`,
        settlementRequest: settlementReq,
      });
    }

    // action === 'APPROVE'
    // 1. Create the official immutable ledger Expense
    const methodText = settlementReq.paymentMethod || 'Payment';
    const refText = settlementReq.proofOrNote ? ` (Ref: ${settlementReq.proofOrNote})` : '';

    const settlementExpense = await Expense.create({
      tripId,
      title: `Settlement: @${settlementReq.payerId.username} → @${settlementReq.receiverId.username}`,
      amountMinor: settlementReq.amountMinor,
      currency: settlementReq.currency,
      category: 'SETTLEMENT',
      splitType: 'EXACT',
      paidById: settlementReq.payerId._id,
      splitBetween: [
        {
          userId: settlementReq.receiverId._id,
          shareAmountMinor: settlementReq.amountMinor,
        },
      ],
      expenseDate: new Date(),
      notes: `Confirmed via ${methodText}${refText}`,
    });

    // 2. Update settlement request to APPROVED
    settlementReq.status = 'APPROVED';
    settlementReq.expenseId = settlementExpense._id;
    settlementReq.resolvedAt = new Date();
    await settlementReq.save();

    // 3. Compute fresh settlement plan and balances after this verified payment
    const updatedSettlement = await computeTripSettlement(tripId);

    return res.status(200).json({
      message: `✓ Confirmed! Received ₹${(settlementReq.amountMinor / 100).toFixed(0)} from @${settlementReq.payerId.username}. Balance zeroed out.`,
      settlementRequest: settlementReq,
      settlementExpense: {
        id: settlementExpense._id.toString(),
        payer: settlementReq.payerId.username,
        receiver: settlementReq.receiverId.username,
        amountMinor: settlementReq.amountMinor,
      },
      ...updatedSettlement,
    });
  } catch (error) {
    console.error('Respond settlement error:', error);
    return res.status(500).json({ error: 'Failed to respond to settlement request' });
  }
};

// @desc    Respond to a bill split request (Accept or Decline)
// @route   POST /api/trips/:tripId/expenses/:expenseId/splits/respond
// @access  Private (Invited split member only)
const respondToSplit = async (req, res) => {
  try {
    const { tripId, expenseId } = req.params;
    const { action } = req.body; // 'ACCEPT' | 'DECLINE'

    if (!['ACCEPT', 'DECLINE'].includes(action)) {
      return res.status(400).json({ error: 'action must be ACCEPT or DECLINE' });
    }

    const trip = await verifyTripMembership(tripId, req.user._id);
    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const expense = await Expense.findOne({ _id: expenseId, tripId, deletedAt: null })
      .populate('paidById', 'username fullName')
      .populate('splitBetween.userId', 'username fullName');

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const split = expense.splitBetween.find(
      (s) => s.userId._id.toString() === req.user._id.toString()
    );

    if (!split) {
      return res.status(403).json({ error: 'You are not part of this bill split' });
    }

    if (split.status !== 'PENDING') {
      return res.status(400).json({
        error: `You have already ${split.status.toLowerCase()} this bill split`,
      });
    }

    split.status = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
    split.respondedAt = new Date();
    await expense.save();

    // Recompute balances & settlement plan with updated consent
    const updatedBalances = await computeTripBalances(tripId);
    const updatedSettlement = await computeTripSettlement(tripId);

    const shareRs = (split.shareAmountMinor / 100).toFixed(0);
    const msg =
      action === 'ACCEPT'
        ? `✓ Accepted split for "${expense.title}" (Your share: ₹${shareRs}). Balance updated!`
        : `✕ Declined split for "${expense.title}". You will not be charged.`;

    return res.status(200).json({
      message: msg,
      expenseId: expense._id.toString(),
      splitStatus: split.status,
      balances: updatedBalances.memberBalances,
      settlementPlan: updatedSettlement.settlementPlan,
    });
  } catch (error) {
    console.error('Respond to split error:', error);
    return res.status(500).json({ error: 'Failed to respond to split request' });
  }
};

// @desc    Get all pending bill splits for current user in a trip
// @route   GET /api/trips/:tripId/expenses/pending-splits
// @access  Private (Trip members only)
const getPendingSplits = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await verifyTripMembership(tripId, req.user._id);

    if (!trip) {
      return res.status(403).json({ error: 'Trip not found or you are not a member' });
    }

    const expenses = await Expense.find({
      tripId,
      deletedAt: null,
      'splitBetween.userId': req.user._id,
      'splitBetween.status': 'PENDING',
    })
      .populate('paidById', 'username fullName avatarUrl')
      .populate('splitBetween.userId', 'username fullName')
      .sort({ createdAt: -1 });

    const formatted = expenses.map((e) => {
      const mySplit = e.splitBetween.find(
        (s) => s.userId._id.toString() === req.user._id.toString()
      );

      return {
        id: e._id.toString(),
        expenseId: e._id.toString(),
        title: e.title,
        amountMinor: e.amountMinor,
        totalAmountMinor: e.amountMinor,
        currency: e.currency,
        category: e.category,
        payer: {
          username: e.paidById?.username,
          fullName: e.paidById?.fullName,
        },
        paidBy: {
          username: e.paidById?.username,
          fullName: e.paidById?.fullName,
        },
        myShareMinor: mySplit ? mySplit.shareAmountMinor : 0,
        status: mySplit ? mySplit.status : 'PENDING',
        createdAt: e.createdAt,
      };
    });

    return res.status(200).json({
      count: formatted.length,
      pendingSplits: formatted,
    });
  } catch (error) {
    console.error('Get pending splits error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending splits' });
  }
};

module.exports = {
  addExpense,
  getTripExpenses,
  deleteExpense,
  getBalances,
  getSettlements,
  recordSettlement,
  requestSettlement,
  getPendingSettlements,
  respondToSettlementRequest,
  respondToSplit,
  getPendingSplits,
};

