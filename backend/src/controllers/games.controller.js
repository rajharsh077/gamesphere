const gamesService = require('../services/games.service');

const startGame = async (req, res, next) => {
  try {
    const { gameType } = req.params;
    const { lobbyId } = req.body;

    const match = await gamesService.startMatch(gameType, lobbyId);
    return res.status(201).json({ gameSession: match });
  } catch (error) {
    if (error.message === 'Lobby not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'At least two players are required to start a game' || error.message === 'Lobby game type does not match requested game type') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

const getGameState = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const match = await gamesService.getMatchById(gameId, true);

    if (!match) {
      return res.status(404).json({ message: 'Game not found' });
    }

    return res.json({ gameState: match });
  } catch (error) {
    next(error);
  }
};

const makeMove = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { move } = req.body;
    const playerId = req.user._id;

    const match = await gamesService.makeMatchMove(gameId, playerId, move);
    return res.json({ gameState: match });
  } catch (error) {
    if (error.message === 'Move payload is required' || error.message === 'Game is already completed' || error.message === 'At least two players are required to start a game') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Game not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'You are not a participant in this game' || error.message === 'It is not your turn') {
      return res.status(403).json({ message: error.message });
    }
    next(error);
  }
};

module.exports = {
  startGame,
  getGameState,
  makeMove
};