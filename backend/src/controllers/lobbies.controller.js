const bcrypt = require('bcryptjs');
const Lobby = require('../models/Lobby');
const User = require('../models/User');

const createLobby = async (req, res, next) => {
  try {
    const { name, gameType, isPrivate, password, durationType, maxPlayers } = req.body;
    const host = req.user._id;

    const lobbyData = {
      name,
      gameType,
      isPrivate: Boolean(isPrivate),
      durationType: durationType || 'one-time',
      host,
      players: [host],
      maxPlayers: maxPlayers ? Number(maxPlayers) : 2,
      joinedAt: {
        [host.toString()]: new Date()
      }
    };

    if (isPrivate && password) {
      lobbyData.passwordHash = await bcrypt.hash(password, 10);
    }

    // set expiresAt for one-hour lobbies
    if (lobbyData.durationType === 'one-hour') {
      lobbyData.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    }

    const lobby = await Lobby.create(lobbyData);

    return res.status(201).json({ lobby });
  } catch (error) {
    next(error);
  }
};

const listLobbies = async (req, res, next) => {
  try {
    // expire any one-hour lobbies whose time has passed
    await Lobby.updateMany({ durationType: 'one-hour', expiresAt: { $lte: new Date() }, status: { $ne: 'completed' } }, { $set: { status: 'completed' } });

    const filter = { status: { $in: ['waiting', 'playing'] } };
    if (req.query.isPrivate !== undefined) {
      filter.isPrivate = req.query.isPrivate === 'true';
    }
    if (req.query.gameType) {
      filter.gameType = req.query.gameType;
    }

    const lobbies = await Lobby.find(filter).populate('host', 'username avatarUrl');
    return res.json({ lobbies });
  } catch (error) {
    next(error);
  }
};

const getLobby = async (req, res, next) => {
  try {
    const { lobbyId } = req.params;
    let lobby = await Lobby.findById(lobbyId);

    if (!lobby) {
      return res.status(404).json({ message: 'Lobby not found' });
    }

    if (lobby.durationType === 'one-hour' && lobby.expiresAt && lobby.expiresAt <= new Date() && lobby.status !== 'completed') {
      lobby.status = 'completed';
      await lobby.save();
    }

    const { getLobbyWithStatuses } = require('../utils/lobbyHelper');
    const Match = require('../models/Match');
    const activeMatch = await Match.findOne({ lobbyId: lobby._id, status: 'active' }).select('_id');
    const io = req.app.get('io');
    const lobbyWithStatuses = await getLobbyWithStatuses(lobbyId, io);

    return res.json({
      lobby: lobbyWithStatuses,
      activeMatchId: activeMatch ? activeMatch._id : null
    });
  } catch (error) {
    next(error);
  }
};

const joinLobby = async (req, res, next) => {
  try {
    const { lobbyId } = req.params;
    const { password } = req.body;
    const userId = req.user._id;

    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ message: 'Lobby not found' });
    }

    if (lobby.durationType === 'one-hour' && lobby.expiresAt && lobby.expiresAt <= new Date() && lobby.status !== 'completed') {
      lobby.status = 'completed';
      await lobby.save();
    }

    if (lobby.status === 'completed') {
      return res.status(403).json({ message: 'Lobby is no longer available' });
    }

    if (lobby.host.toString() === userId.toString()) {
      return res.json({ lobby });
    }

    if (lobby.players.includes(userId)) {
      return res.status(400).json({ message: 'Already joined' });
    }

    if (lobby.players.length >= (lobby.maxPlayers || 2)) {
      return res.status(400).json({ message: 'Lobby is full' });
    }

    if (lobby.isPrivate) {
      if (!password) {
        return res.status(403).json({ message: 'Password required' });
      }

      const isValid = await bcrypt.compare(password, lobby.passwordHash);
      if (!isValid) {
        return res.status(403).json({ message: 'Invalid lobby password' });
      }
    }

    lobby.players.push(userId);
    lobby.readyPlayers = lobby.readyPlayers.filter((p) => p.toString() !== userId.toString());
    if (!lobby.joinedAt) lobby.joinedAt = new Map();
    lobby.joinedAt.set(userId.toString(), new Date());
    await lobby.save();

    return res.json({ lobby });
  } catch (error) {
    next(error);
  }
};

const inviteToLobby = async (req, res, next) => {
  try {
    const { lobbyId } = req.params;
    const { targetUserId } = req.body;
    const currentUserId = req.user._id;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user id is required' });
    }

    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ message: 'Lobby not found' });
    }

    const isHost = lobby.host.toString() === currentUserId.toString();
    const isPlayer = lobby.players.some((playerId) => playerId.toString() === currentUserId.toString());
    if (!isHost && !isPlayer) {
      return res.status(403).json({ message: 'Only lobby members may invite friends' });
    }

    if (lobby.players.some((playerId) => playerId.toString() === targetUserId.toString())) {
      return res.status(400).json({ message: 'User is already in the lobby' });
    }

    if (lobby.players.length >= (lobby.maxPlayers || 2)) {
      return res.status(400).json({ message: 'Lobby is full' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    if (!currentUser.friends.some((friendId) => friendId.toString() === targetUserId.toString())) {
      return res.status(403).json({ message: 'You can only invite people from your friends list' });
    }

    const alreadyInvited = lobby.invitedUsers.some((inviteId) => inviteId.toString() === targetUserId.toString());
    if (!alreadyInvited) {
      lobby.invitedUsers.push(targetUserId);
      await lobby.save();
    }

    const io = req.app.get('io');
    const { getLobbyWithStatuses } = require('../utils/lobbyHelper');
    const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
    if (io) {
      io.to(`user:${targetUserId}`).emit('lobby:invite', { lobby: populatedLobby, reinvite: alreadyInvited });
    }

    return res.json({ lobby: populatedLobby, reinvited: alreadyInvited });
  } catch (error) {
    next(error);
  }
};

const leaveLobby = async (req, res, next) => {
  try {
    const { lobbyId } = req.params;
    const userId = req.user._id;

    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ message: 'Lobby not found' });
    }

    lobby.players = lobby.players.filter((playerId) => playerId.toString() !== userId.toString());
    lobby.readyPlayers = lobby.readyPlayers.filter((playerId) => playerId.toString() !== userId.toString());
    const hostIdStr = (lobby.host && lobby.host._id ? lobby.host._id : lobby.host || '').toString();
    if (hostIdStr === userId.toString()) {
      lobby.host = lobby.players.length ? lobby.players[0] : lobby.host;
    }
    if (lobby.host) {
      const currentHostIdStr = (lobby.host && lobby.host._id ? lobby.host._id : lobby.host || '').toString();
      lobby.readyPlayers = lobby.readyPlayers.filter((p) => p.toString() !== currentHostIdStr);
    }

    if (lobby.status === 'completed' && !lobby.players.length) {
      await Lobby.findByIdAndDelete(lobbyId);
      const io = req.app.get('io');
      if (io) {
        io.to(`lobby:${lobbyId}`).emit('lobby:deleted', { lobbyId });
      }
      return res.json({ message: 'Left lobby; lobby removed' });
    }

    if (!lobby.players.length) {
      lobby.invitedUsers = [];
    }

    await lobby.save();

    const io = req.app.get('io');
    let populatedLobby = lobby;
    if (io) {
      const { getLobbyWithStatuses } = require('../utils/lobbyHelper');
      populatedLobby = await getLobbyWithStatuses(lobbyId, io);
      io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
    }

    return res.json({ lobby: populatedLobby || lobby });
  } catch (error) {
    next(error);
  }
};

const kickPlayer = async (req, res, next) => {
  try {
    const { lobbyId } = req.params;
    const { targetUserId } = req.body;
    const userId = req.user._id;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ message: 'Lobby not found' });
    }

    if (lobby.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the host can kick players' });
    }

    if (targetUserId.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You cannot kick yourself' });
    }

    if (!lobby.players.some(p => p.toString() === targetUserId.toString())) {
      return res.status(400).json({ message: 'Player is not in this lobby' });
    }

    // Remove player
    lobby.players = lobby.players.filter(p => p.toString() !== targetUserId.toString());
    lobby.readyPlayers = lobby.readyPlayers.filter(p => p.toString() !== targetUserId.toString());
    await lobby.save();

    const io = req.app.get('io');
    let populatedLobby = lobby;
    if (io) {
      const { getLobbyWithStatuses } = require('../utils/lobbyHelper');
      populatedLobby = await getLobbyWithStatuses(lobbyId, io);
      // Emit update to the lobby room
      io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
      // Emit a specific kicked event to the user's private room
      io.to(`user:${targetUserId}`).emit('lobby:kicked', { lobbyId });
    }

    return res.json({ lobby: populatedLobby || lobby });
  } catch (error) {
    next(error);
  }
};

const createQuickAILobby = async (req, res, next) => {
  try {
    const { gameType } = req.body;
    const userId = req.user._id;

    if (!['tic-tac-toe', 'connect4', 'chess'].includes(gameType)) {
      return res.status(400).json({ message: 'Invalid game type' });
    }

    const gamesService = require('../services/games.service');
    const aiUser = await gamesService.getOrCreateAIUser();

    const gameLabel = gameType === 'tic-tac-toe' ? 'Tic Tac Toe' : gameType === 'connect4' ? 'Connect 4' : 'Chess';
    const lobbyName = `Quick AI Match - ${gameLabel}`;
    
    const lobbyData = {
      name: lobbyName,
      gameType,
      isPrivate: false,
      durationType: 'one-time',
      host: userId,
      players: [userId, aiUser._id],
      status: 'playing',
      joinedAt: {
        [userId.toString()]: new Date(),
        [aiUser._id.toString()]: new Date()
      }
    };

    const lobby = await Lobby.create(lobbyData);
    const match = await gamesService.startMatch(gameType, lobby._id);

    return res.status(201).json({ lobby, match });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLobby,
  listLobbies,
  getLobby,
  joinLobby,
  inviteToLobby,
  leaveLobby,
  kickPlayer,
  createQuickAILobby
};