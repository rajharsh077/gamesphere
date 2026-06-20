const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { sendFriendRequest, acceptFriendRequest, getFriends, removeFriend } = require('../controllers/friends.controller');

const router = express.Router();
router.use(authMiddleware);

router.post('/request', sendFriendRequest);
router.post('/accept', acceptFriendRequest);
router.get('/', getFriends);
router.delete('/:friendId', removeFriend);

module.exports = router;
