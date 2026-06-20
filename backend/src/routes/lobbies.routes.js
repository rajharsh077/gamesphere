const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const {
  createLobby,
  listLobbies,
  getLobby,
  joinLobby,
  inviteToLobby,
  leaveLobby,
  kickPlayer,
  createQuickAILobby
} = require('../controllers/lobbies.controller');

const router = express.Router();
router.use(authMiddleware);

router.post('/quick-ai', createQuickAILobby);
router.post('/', createLobby);
router.get('/', listLobbies);
router.get('/:lobbyId', getLobby);
router.post('/:lobbyId/join', joinLobby);
router.post('/:lobbyId/invite', inviteToLobby);
router.post('/:lobbyId/leave', leaveLobby);
router.post('/:lobbyId/kick', kickPlayer);

module.exports = router;
