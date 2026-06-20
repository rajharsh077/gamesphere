const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const friendsRoutes = require('./friends.routes');
const lobbiesRoutes = require('./lobbies.routes');
const gamesRoutes = require('./games.routes');
const chatRoutes = require('./chat.routes');
const leaderboardsRoutes = require('./leaderboards.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/friends', friendsRoutes);
router.use('/lobbies', lobbiesRoutes);
router.use('/games', gamesRoutes);
router.use('/chat', chatRoutes);
router.use('/leaderboards', leaderboardsRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'GameSphere API is live' });
});

module.exports = router;
