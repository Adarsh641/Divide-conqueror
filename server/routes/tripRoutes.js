const express = require('express');
const router = express.Router();
const {
  createTrip,
  getTrips,
  getTripDetails,
  updateTrip,
  deleteTrip,
} = require('../controllers/tripController');
const {
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
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Trip routes
router.post('/', createTrip);
router.get('/', getTrips);
router.get('/:tripId', getTripDetails);
router.patch('/:tripId', updateTrip);
router.delete('/:tripId', deleteTrip);

// Expense routes for a trip
router.post('/:tripId/expenses', addExpense);
router.get('/:tripId/expenses', getTripExpenses);
router.get('/:tripId/expenses/pending-splits', getPendingSplits);
router.post('/:tripId/expenses/:expenseId/splits/respond', respondToSplit);
router.delete('/:tripId/expenses/:expenseId', deleteExpense);

// Dynamic calculation & settlement routes
router.get('/:tripId/balances', getBalances);
router.get('/:tripId/settlements', getSettlements);
router.post('/:tripId/settlements/record', recordSettlement);

// 2-Step Peer Settlement Verification routes
router.post('/:tripId/settlements/request', requestSettlement);
router.get('/:tripId/settlements/pending', getPendingSettlements);
router.post('/:tripId/settlements/:requestId/respond', respondToSettlementRequest);

module.exports = router;
