const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { startGame, getGameState, makeMove } = require('../controllers/games.controller');

const router = express.Router();
router.use(authMiddleware);

router.post('/:gameType/start', startGame);
router.get('/:gameId', getGameState);
router.post('/:gameId/move', makeMove);

module.exports = router;
