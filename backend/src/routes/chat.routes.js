const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { getDirectConversation, getLobbyChat, getGameChat } = require('../controllers/chat.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/direct/:userId', getDirectConversation);
router.get('/lobby/:lobbyId', getLobbyChat);
router.get('/game/:gameId', getGameChat);

module.exports = router;
