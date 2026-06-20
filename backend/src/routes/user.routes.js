const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { getUserProfile, updateUserProfile, getUserMatchHistory, searchUsers } = require('../controllers/user.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/search', searchUsers);
router.get('/:userId', getUserProfile);
router.patch('/:userId', updateUserProfile);
router.get('/:userId/match-history', getUserMatchHistory);

module.exports = router;
