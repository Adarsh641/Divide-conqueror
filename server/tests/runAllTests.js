require('dotenv').config();
const mongoose = require('mongoose');
const { calculateEqualSplits } = require('../services/balanceEngine');
const { simplifyDebts } = require('../services/settlementEngine');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const FriendRequest = require('../models/FriendRequest');
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const { signup, login } = require('../controllers/authController');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runAlgorithmsTest() {
  console.log('\n--- 1. Testing Analytical & Settlement Algorithms ---');

  // Test 1: Remainder Cent Allocation
  // ₹100 = 10000 paise split between 3 people = 3334, 3333, 3333
  const splits = calculateEqualSplits(10000, ['u1', 'u2', 'u3']);
  const sumSplits = splits.reduce((acc, s) => acc + s.shareAmountMinor, 0);
  assert(sumSplits === 10000, 'Remainder cent split sum must equal exact 10000 paise');
  assert(splits[0].shareAmountMinor === 3334, 'First share receives remainder cent (3334)');
  assert(splits[1].shareAmountMinor === 3333, 'Second share receives base (3333)');
  assert(splits[2].shareAmountMinor === 3333, 'Third share receives base (3333)');

  // Test 2: Circular Debt Simplification
  // A owes B 100, B owes C 100, C owes A 100 -> All net balances are 0
  const circularBalances = new Map([
    ['A', 0],
    ['B', 0],
    ['C', 0],
  ]);
  const userMap = new Map([
    ['A', { username: 'user_a' }],
    ['B', { username: 'user_b' }],
    ['C', { username: 'user_c' }],
  ]);
  const circularPlan = simplifyDebts(circularBalances, userMap, 'INR');
  assert(circularPlan.length === 0, 'Circular debt resolves to 0 transactions');

  // Test 3: Multi-person Greedy Min-Cash-Flow
  // Rahul is owed ₹3,000 (+300000). Adarsh owes ₹1,000 (-100000), Aman owes ₹1,000 (-100000), Priya owes ₹1,000 (-100000)
  const groupBalances = new Map([
    ['rahul', 300000],
    ['adarsh', -100000],
    ['aman', -100000],
    ['priya', -100000],
  ]);
  const groupUsers = new Map([
    ['rahul', { username: 'rahul123', fullName: 'Rahul S' }],
    ['adarsh', { username: 'adarshg', fullName: 'Adarsh G' }],
    ['aman', { username: 'aman_k', fullName: 'Aman K' }],
    ['priya', { username: 'priya_v', fullName: 'Priya V' }],
  ]);
  const plan = simplifyDebts(groupBalances, groupUsers, 'INR');
  assert(plan.length === 3, 'Greedy plan reduces 4-person debt to exactly 3 transactions');
  const totalSettled = plan.reduce((sum, tx) => sum + tx.amountMinor, 0);
  assert(totalSettled === 300000, 'Total settled amount equals Rahul credit (300000 paise = ₹3000)');
  plan.forEach((tx) => {
    assert(tx.toUsername === 'rahul123', `All payments route directly to creditor Rahul: from ${tx.fromUsername}`);
  });
}

async function runDatabaseIntegrationTests() {
  console.log('\n--- 2. Testing Models, Auth & Friendship Integration ---');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/divide_and_rule';
  await mongoose.connect(mongoUri);

  // Clean test data
  await User.deleteMany({ username: { $in: ['adarsh_test', 'rahul_test', 'priya_test', 'stranger_test'] } });
  await Friendship.deleteMany({});
  await FriendRequest.deleteMany({});
  await Trip.deleteMany({ name: 'Goa Test Trip 2026' });
  await Expense.deleteMany({ title: 'Dinner at Fisherman Wharf' });

  // Test User Signup & Hashing
  const adarshUser = await User.create({
    fullName: 'Adarsh Goutam',
    username: 'adarsh_test',
    email: 'adarsh_test@example.com',
    passwordHash: await User.hashPassword('SecretPass123!'),
  });
  assert(adarshUser.username === 'adarsh_test', 'User adarsh_test created');

  const rahulUser = await User.create({
    fullName: 'Rahul Sharma',
    username: 'rahul_test',
    email: 'rahul_test@example.com',
    passwordHash: await User.hashPassword('SecretPass123!'),
  });

  const strangerUser = await User.create({
    fullName: 'Stranger Dan',
    username: 'stranger_test',
    email: 'stranger_test@example.com',
    passwordHash: await User.hashPassword('SecretPass123!'),
  });

  // Test Dual-identifier Login Logic
  const userByEmail = await User.findOne({ email: 'rahul_test@example.com' }).select('+passwordHash');
  const isEmailMatch = await userByEmail.comparePassword('SecretPass123!');
  assert(isEmailMatch, 'Login succeeds with Email + Password');

  const userByUsername = await User.findOne({ username: 'adarsh_test' }).select('+passwordHash');
  const isUsernameMatch = await userByUsername.comparePassword('SecretPass123!');
  assert(isUsernameMatch, 'Login succeeds with @username + Password');

  // Test Friend Request & Friendship
  assert(
    (await Friendship.areFriends(adarshUser._id, rahulUser._id)) === false,
    'Users are initially not friends'
  );

  await FriendRequest.create({
    senderId: adarshUser._id,
    receiverId: rahulUser._id,
    status: 'ACCEPTED',
  });
  await Friendship.createFriendship(adarshUser._id, rahulUser._id);

  assert(
    (await Friendship.areFriends(adarshUser._id, rahulUser._id)) === true,
    'Users are now confirmed bidirectional friends'
  );

  // Test Trip Creation Rule: Cannot invite non-friends
  const isStrangerFriend = await Friendship.areFriends(adarshUser._id, strangerUser._id);
  assert(isStrangerFriend === false, 'Stranger is correctly identified as not a friend');

  // Create valid trip with friend Rahul
  const trip = await Trip.create({
    name: 'Goa Test Trip 2026',
    destination: 'Goa, India',
    startDate: new Date('2026-10-15'),
    endDate: new Date('2026-10-20'),
    currency: 'INR',
    ownerId: adarshUser._id,
    members: [
      { userId: adarshUser._id, role: 'OWNER' },
      { userId: rahulUser._id, role: 'MEMBER' },
    ],
  });
  assert(trip.members.length === 2, 'Trip created with 2 members');

  // Test Expense Dynamic Ledger
  const splits = calculateEqualSplits(400000, [adarshUser._id, rahulUser._id]);
  const expense = await Expense.create({
    tripId: trip._id,
    title: 'Dinner at Fisherman Wharf',
    amountMinor: 400000, // ₹4,000
    currency: 'INR',
    category: 'FOOD',
    paidById: rahulUser._id, // Rahul paid ₹4,000
    splitBetween: splits.map((s) => ({ ...s, status: 'ACCEPTED' })), // ₹2,000 each (accepted)
  });
  assert(expense.amountMinor === 400000, 'Expense saved in minor units (paise)');

  // Test Dynamic Balance Computation
  const { computeTripBalances } = require('../services/balanceEngine');
  const balanceData = await computeTripBalances(trip._id);

  const rahulBal = balanceData.memberBalances.find((m) => m.userId === rahulUser._id.toString());
  const adarshBal = balanceData.memberBalances.find((m) => m.userId === adarshUser._id.toString());

  assert(rahulBal.netBalanceMinor === 200000, 'Rahul is dynamically owed +₹2,000 (+200000 paise)');
  assert(rahulBal.status === 'IS_OWED', 'Rahul status is IS_OWED');
  assert(adarshBal.netBalanceMinor === -200000, 'Adarsh dynamically owes -₹2,000 (-200000 paise)');
  assert(adarshBal.status === 'OWES', 'Adarsh status is OWES');

  // Test Dynamic Settlement Computation
  const { computeTripSettlement } = require('../services/settlementEngine');
  const settlement = await computeTripSettlement(trip._id);
  assert(settlement.settlementPlan.length === 1, 'Exactly 1 settlement transaction required');
  assert(
    settlement.settlementPlan[0].fromUserId === adarshUser._id.toString() &&
    settlement.settlementPlan[0].toUserId === rahulUser._id.toString() &&
    settlement.settlementPlan[0].amountMinor === 200000,
    'Settlement plan: Adarsh -> Rahul for ₹2,000'
  );

  // Test Percentage Split Calculation
  const { calculatePercentageSplits, calculateExactSplits } = require('../services/balanceEngine');
  const pctSplits = calculatePercentageSplits(10000, [
    { userId: adarshUser._id, percentage: 60 },
    { userId: rahulUser._id, percentage: 40 },
  ]);
  assert(pctSplits[0].shareAmountMinor === 6000 && pctSplits[1].shareAmountMinor === 4000, 'Percentage 60/40 split sums to exactly 10000');

  // Test Exact Split Calculation
  const exactSplits = calculateExactSplits(50000, [
    { userId: adarshUser._id, amountMinor: 20000 },
    { userId: rahulUser._id, amountMinor: 30000 },
  ]);
  assert(exactSplits[0].shareAmountMinor === 20000 && exactSplits[1].shareAmountMinor === 30000, 'Exact split validates and preserves exact minor units');

  // Test One-Tap Settle Up Flow
  // Adarsh settles his ₹2,000 debt by paying Rahul
  const settlementExpense = await Expense.create({
    tripId: trip._id,
    title: `Settlement: @${adarshUser.username} → @${rahulUser.username}`,
    amountMinor: 200000,
    currency: 'INR',
    category: 'SETTLEMENT',
    splitType: 'EXACT',
    paidById: adarshUser._id, // Adarsh pays 200000
    splitBetween: [{ userId: rahulUser._id, shareAmountMinor: 200000 }],
    expenseDate: new Date(),
  });
  assert(settlementExpense.category === 'SETTLEMENT', 'Settlement expense created with category SETTLEMENT');

  // Verify balances after settlement are both exactly 0
  const postSettlementBalances = await computeTripBalances(trip._id);
  const postAdarshBal = postSettlementBalances.memberBalances.find((m) => m.userId === adarshUser._id.toString());
  const postRahulBal = postSettlementBalances.memberBalances.find((m) => m.userId === rahulUser._id.toString());
  assert(postAdarshBal.netBalanceMinor === 0 && postAdarshBal.status === 'SETTLED', 'Adarsh balance is 0 (SETTLED) after one-tap settle up');
  assert(postRahulBal.netBalanceMinor === 0 && postRahulBal.status === 'SETTLED', 'Rahul balance is 0 (SETTLED) after one-tap settle up');

  // Verify settlement plan is now empty
  const postSettlementPlan = await computeTripSettlement(trip._id);
  assert(postSettlementPlan.settlementPlan.length === 0, 'Settlement plan is 0 transactions (fully settled)');

  // --- 3. Testing 2-Step Settlement Verification Flow (Debtor Requests -> Creditor Approves) ---
  const SettlementRequest = require('../models/SettlementRequest');

  // Step 3a: Debtor creates a settlement request with UPI reference
  const newSettleReq = await SettlementRequest.create({
    tripId: trip._id,
    payerId: adarshUser._id,
    receiverId: rahulUser._id,
    amountMinor: 150000,
    currency: 'INR',
    paymentMethod: 'UPI',
    proofOrNote: 'UPI-99228811',
    status: 'PENDING',
  });
  assert(newSettleReq.status === 'PENDING', 'Settlement request created with status PENDING');
  assert(newSettleReq.paymentMethod === 'UPI', 'Payment method preserved as UPI');

  // Step 3b: Rejection flow
  newSettleReq.status = 'REJECTED';
  newSettleReq.resolvedAt = new Date();
  await newSettleReq.save();
  assert(newSettleReq.status === 'REJECTED', 'Creditor can reject settlement request with reason/status REJECTED');

  // Step 3c: Approval flow
  const verifiedReq = await SettlementRequest.create({
    tripId: trip._id,
    payerId: adarshUser._id,
    receiverId: rahulUser._id,
    amountMinor: 150000,
    currency: 'INR',
    paymentMethod: 'BANK_TRANSFER',
    proofOrNote: 'IMPS-REF-445566',
    status: 'PENDING',
  });
  assert(verifiedReq.status === 'PENDING', 'Second settlement request created as PENDING');

  // Creditor approves request -> Ledger expense created
  const approvedExpense = await Expense.create({
    tripId: trip._id,
    title: `Settlement: @${adarshUser.username} → @${rahulUser.username}`,
    amountMinor: verifiedReq.amountMinor,
    currency: verifiedReq.currency,
    category: 'SETTLEMENT',
    splitType: 'EXACT',
    paidById: verifiedReq.payerId,
    splitBetween: [{ userId: verifiedReq.receiverId, shareAmountMinor: verifiedReq.amountMinor }],
    expenseDate: new Date(),
    notes: `Confirmed via ${verifiedReq.paymentMethod} (Ref: ${verifiedReq.proofOrNote})`,
  });

  verifiedReq.status = 'APPROVED';
  verifiedReq.expenseId = approvedExpense._id;
  verifiedReq.resolvedAt = new Date();
  await verifiedReq.save();

  assert(verifiedReq.status === 'APPROVED', 'Settlement request officially transitioned to APPROVED');
  assert(approvedExpense.notes.includes('IMPS-REF-445566'), 'Approved ledger expense includes payment reference proof');

  // --- 4. Testing Bill Split Approval Flow (User B must approve before debt activates) ---
  await Expense.deleteMany({ tripId: trip._id });

  // Create an expense of ₹2,000 paid by Adarsh split 50/50 with Rahul
  const consentExpense = await Expense.create({
    tripId: trip._id,
    title: 'Water Sports Tour',
    amountMinor: 200000,
    currency: 'INR',
    category: 'ACTIVITIES',
    splitType: 'EQUAL',
    paidById: adarshUser._id,
    splitBetween: [
      { userId: adarshUser._id, shareAmountMinor: 100000, status: 'ACCEPTED', respondedAt: new Date() },
      { userId: rahulUser._id, shareAmountMinor: 100000, status: 'PENDING', respondedAt: null },
    ],
    expenseDate: new Date(),
  });

  assert(consentExpense.splitBetween[0].status === 'ACCEPTED', 'Payer split is auto-ACCEPTED');
  assert(consentExpense.splitBetween[1].status === 'PENDING', 'Invited member split is initially PENDING');

  // Check balances while Rahul is PENDING: Rahul should NOT owe money yet
  const balancesPending = await computeTripBalances(trip._id);
  const rahulBalPending = balancesPending.memberBalances.find((m) => m.userId === rahulUser._id.toString());
  assert(rahulBalPending.netBalanceMinor === 0, 'Rahul net balance is 0 while split is PENDING approval');
  assert(rahulBalPending.pendingShareMinor === 100000, 'Rahul has ₹1,000 recorded in pendingShareMinor');

  // Rahul accepts the split
  consentExpense.splitBetween[1].status = 'ACCEPTED';
  consentExpense.splitBetween[1].respondedAt = new Date();
  await consentExpense.save();

  // Check balances after Rahul ACCEPTED: Rahul now owes ₹1,000 and Adarsh is owed ₹1,000
  const balancesAccepted = await computeTripBalances(trip._id);
  const rahulBalAccepted = balancesAccepted.memberBalances.find((m) => m.userId === rahulUser._id.toString());
  const adarshBalAccepted = balancesAccepted.memberBalances.find((m) => m.userId === adarshUser._id.toString());

  assert(rahulBalAccepted.netBalanceMinor === -100000 && rahulBalAccepted.status === 'OWES', 'Rahul balance is -₹1,000 (OWES) after accepting split');
  assert(adarshBalAccepted.netBalanceMinor === 100000 && adarshBalAccepted.status === 'IS_OWED', 'Adarsh balance is +₹1,000 (IS_OWED) after Rahul accepts split');

  // Clean up test documents
  await User.deleteMany({ username: { $in: ['adarsh_test', 'rahul_test', 'priya_test', 'stranger_test'] } });
  await Friendship.deleteMany({});
  await FriendRequest.deleteMany({});
  await SettlementRequest.deleteMany({ tripId: trip._id });
  await Trip.deleteMany({ name: 'Goa Test Trip 2026' });
  await Expense.deleteMany({ tripId: trip._id });

  await mongoose.disconnect();
}

async function main() {
  console.log('====================================================');
  console.log('  DIVIDE & RULE V1 — AUTOMATED TEST SUITE EXECUTION');
  console.log('====================================================');

  try {
    await runAlgorithmsTest();
    await runDatabaseIntegrationTests();

    console.log('\n====================================================');
    console.log(`🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED!`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n🚨 TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

main();
