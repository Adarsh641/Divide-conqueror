const express = require('express');
const router = express.Router();
const {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  listFriends,
} = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/search', searchUsers);
router.post('/request', sendFriendRequest);
router.get('/requests', getFriendRequests);
router.post('/requests/:id/respond', respondToFriendRequest);
router.get('/', listFriends);

module.exports = router;
