const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { getLeaderboard } = require('../controllers/leaderboards.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/top', getLeaderboard);

module.exports = router;
