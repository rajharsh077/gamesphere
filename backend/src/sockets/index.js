const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const { verifyToken } = require('../config/jwt');
const Lobby = require('../models/Lobby');
const ChatMessage = require('../models/ChatMessage');
const gamesService = require('../services/games.service');
const User = require('../models/User');
const { getLobbyWithStatuses } = require('../utils/lobbyHelper');

const initSockets = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  if (app) {
    app.set('io', io);
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = verifyToken(token);
      socket.user = { userId: decoded.userId };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.user;
    socket.join(`user:${userId}`);

    console.log('Socket connected:', socket.id, 'user:', userId);

    // track online sockets per user for robust presence
    if (!io._onlineUsers) io._onlineUsers = new Map();
    if (!io._userLobby) io._userLobby = new Map();

    const sockets = io._onlineUsers.get(userId) || new Set();
    sockets.add(socket.id);
    io._onlineUsers.set(userId, sockets);

    // if first connection for this user, broadcast online
    if (sockets.size === 1) {
      console.log(`[Socket] User ${userId} is now online (first socket). Broadcasting presence:update online.`);
      io.emit('presence:update', { userId, status: 'online' });
      io.to(`watch:${userId}`).emit('friend:presence', { userId, online: true, currentLobbyId: io._userLobby.get(userId) || null });
    } else {
      console.log(`[Socket] User ${userId} is connected with multiple sockets (${sockets.size}). Notifying watchers.`);
      // still notify watchers of this socket's connection state
      io.to(`watch:${userId}`).emit('friend:presence', { userId, online: true, currentLobbyId: io._userLobby.get(userId) || null });
    }

    // broadcast online count
    io.emit('online:count', { count: io._onlineUsers ? io._onlineUsers.size : 0 });

    socket.on('online:get_count', (callback) => {
      if (typeof callback === 'function') {
        callback({ count: io._onlineUsers ? io._onlineUsers.size : 0 });
      }
    });

    // handle friend subscriptions
    socket.on('friends:subscribe', async ({ friendIds } = {}) => {
      try {
        if (!Array.isArray(friendIds)) return;

        console.log(`[Socket] User ${userId} subscribing to friends:`, friendIds);
        const users = await User.find({ _id: { $in: friendIds } }).select('_id lastActive').lean();
        const lastActiveMap = {};
        users.forEach(u => {
          lastActiveMap[u._id.toString()] = u.lastActive;
        });

        friendIds.forEach((fid) => {
          if (!fid) return;
          socket.join(`watch:${fid}`);
          const isOnline = io._onlineUsers.has(fid.toString()) && (io._onlineUsers.get(fid.toString()).size > 0);
          console.log(`[Socket] User ${userId} joined room watch:${fid}. Online status: ${isOnline}`);
          const currentLobbyId = io._userLobby.get(fid.toString()) || null;
          const lastActive = lastActiveMap[fid.toString()] || null;
          socket.emit('friend:presence', { userId: fid, online: !!isOnline, currentLobbyId, lastActive });
        });
      } catch (err) {
        console.error('Error in friends:subscribe', err);
      }
    });

    socket.on('lobby:join', async ({ lobbyId, password }, callback) => {
      try {
        const lobby = await Lobby.findById(lobbyId);
        if (!lobby) {
          return callback({ status: 'error', message: 'Lobby not found' });
        }

        const isHost = lobby.host && lobby.host.toString() === userId.toString();

        if (isHost || lobby.players.some((playerId) => playerId.toString() === userId.toString())) {
          socket.join(`lobby:${lobbyId}`);
          if (!io._userLobby) io._userLobby = new Map();
          io._userLobby.set(userId, lobbyId);
          const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
          return callback({ status: 'ok', lobby: populatedLobby });
        }

        if (lobby.players.length >= (lobby.maxPlayers || 2)) {
          return callback({ status: 'error', message: 'Lobby is full' });
        }

        if (lobby.isPrivate) {
          const isInvited = lobby.invitedUsers.some((inviteId) => inviteId.toString() === userId.toString());
          if (!isInvited) {
            const validPassword = await bcrypt.compare(password || '', lobby.passwordHash);
            if (!validPassword) {
              return callback({ status: 'error', message: 'Invalid password' });
            }
          }
        }

        lobby.players.push(userId);
        lobby.readyPlayers = lobby.readyPlayers.filter((p) => p.toString() !== userId.toString());
        if (!lobby.joinedAt) lobby.joinedAt = new Map();
        lobby.joinedAt.set(userId.toString(), new Date());
        lobby.invitedUsers = lobby.invitedUsers.filter((inviteId) => inviteId.toString() !== userId.toString());
        await lobby.save();

        if (!io._userLobby) io._userLobby = new Map();
        io._userLobby.set(userId, lobbyId);

        const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
        socket.join(`lobby:${lobbyId}`);
        io.to(`watch:${userId}`).emit('friend:presence', { userId, online: true, currentLobbyId: lobbyId });
        io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
        return callback({ status: 'ok', lobby: populatedLobby });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('lobby:leave', async ({ lobbyId }, callback) => {
      try {
        const lobby = await Lobby.findById(lobbyId);
        if (!lobby) {
          return callback({ status: 'error', message: 'Lobby not found' });
        }

        lobby.players = lobby.players.filter((playerId) => playerId.toString() !== userId.toString());
        lobby.readyPlayers = lobby.readyPlayers.filter((playerId) => playerId.toString() !== userId.toString());
        if (lobby.host && lobby.host.toString() === userId.toString()) {
          lobby.host = lobby.players.length ? lobby.players[0] : lobby.host;
        }
        if (lobby.host) {
          lobby.readyPlayers = lobby.readyPlayers.filter((p) => p.toString() !== lobby.host.toString());
        }

        if (lobby.status === 'completed' && !lobby.players.length) {
          await Lobby.findByIdAndDelete(lobbyId);
          socket.leave(`lobby:${lobbyId}`);
          io.to(`lobby:${lobbyId}`).emit('lobby:deleted', { lobbyId });
          io._userLobby.set(userId, null);
          io.to(`watch:${userId}`).emit('friend:presence', { userId, online: true, currentLobbyId: null });
          return callback({ status: 'ok', message: 'Lobby removed' });
        }

        if (!lobby.players.length) {
          lobby.invitedUsers = [];
        }

        await lobby.save();
        const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
        socket.leave(`lobby:${lobbyId}`);
        io._userLobby.set(userId, null);
        io.to(`watch:${userId}`).emit('friend:presence', { userId, online: true, currentLobbyId: null });
        io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
        return callback({ status: 'ok', lobby: populatedLobby });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('lobby:ready_toggle', async ({ lobbyId }, callback) => {
      try {
        const lobby = await Lobby.findById(lobbyId);
        if (!lobby) {
          return callback({ status: 'error', message: 'Lobby not found' });
        }

        const isHost = lobby.host && lobby.host.toString() === userId.toString();
        if (isHost) {
          return callback({ status: 'error', message: 'Host is always ready' });
        }

        const isPlayer = lobby.players.some((playerId) => playerId.toString() === userId.toString());
        if (!isPlayer) {
          return callback({ status: 'error', message: 'You are not a member of this lobby' });
        }

        const readyIdx = lobby.readyPlayers.findIndex((playerId) => playerId.toString() === userId.toString());
        if (readyIdx > -1) {
          lobby.readyPlayers.splice(readyIdx, 1);
        } else {
          lobby.readyPlayers.push(userId);
        }

        await lobby.save();

        const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
        io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });

        return callback({ status: 'ok', lobby: populatedLobby });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('lobby:toggle_host_play', async ({ lobbyId }, callback) => {
      try {
        const lobby = await Lobby.findById(lobbyId);
        if (!lobby) {
          return callback({ status: 'error', message: 'Lobby not found' });
        }

        const isHost = lobby.host && lobby.host.toString() === userId.toString();
        if (!isHost) {
          return callback({ status: 'error', message: 'Only the host can toggle their player status' });
        }

        const hostIdStr = userId.toString();
        const isPlayer = lobby.players.some((p) => p.toString() === hostIdStr);

        if (isPlayer) {
          // Switch to spectator: remove host from players
          lobby.players = lobby.players.filter((p) => p.toString() !== hostIdStr);
          lobby.readyPlayers = lobby.readyPlayers.filter((p) => p.toString() !== hostIdStr);
        } else {
          // Switch to player: check if slot is available
          if (lobby.players.length >= (lobby.maxPlayers || 2)) {
            return callback({ status: 'error', message: 'Cannot join players: slots are full. Kick a player or ask them to leave first.' });
          }
          // Push host to players
          lobby.players.unshift(userId);
          if (!lobby.joinedAt) lobby.joinedAt = new Map();
          lobby.joinedAt.set(hostIdStr, new Date());
        }

        await lobby.save();

        const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
        io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });

        return callback({ status: 'ok', lobby: populatedLobby });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('lobby:chat:message', async ({ lobbyId, message }, callback) => {
      try {
        if (!message || !lobbyId) {
          return callback({ status: 'error', message: 'Invalid chat payload' });
        }

        const chatMessage = await ChatMessage.create({
          sender: userId,
          targetType: 'lobby',
          targetId: lobbyId,
          message
        });
        await chatMessage.populate('sender', 'username avatarUrl');

        io.to(`lobby:${lobbyId}`).emit('lobby:chat:message', { message: chatMessage });
        return callback({ status: 'ok', message: chatMessage });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('game:chat:message', async ({ gameId, message }, callback) => {
      try {
        if (!message || !gameId) {
          return callback({ status: 'error', message: 'Invalid chat payload' });
        }

        const chatMessage = await ChatMessage.create({
          sender: userId,
          targetType: 'game',
          targetId: gameId,
          message
        });
        await chatMessage.populate('sender', 'username avatarUrl');

        io.to(`game:${gameId}`).emit('game:chat:message', { message: chatMessage });
        return callback({ status: 'ok', message: chatMessage });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('chat:direct:message', async ({ targetUserId, message }, callback) => {
      try {
        if (!message || !targetUserId) {
          return callback({ status: 'error', message: 'Invalid direct message payload' });
        }

        const chatMessage = await ChatMessage.create({
          sender: userId,
          targetType: 'direct',
          targetId: targetUserId,
          message
        });
        await chatMessage.populate('sender', 'username avatarUrl');

        io.to(`user:${targetUserId}`).emit('chat:direct:message', { message: chatMessage });
        io.to(`user:${userId}`).emit('chat:direct:message', { message: chatMessage });
        return callback({ status: 'ok', message: chatMessage });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('game:subscribe', async ({ gameId }, callback) => {
      try {
        if (!gameId) {
          return callback({ status: 'error', message: 'Game ID is required' });
        }

        socket.join(`game:${gameId}`);

        const match = await gamesService.getMatchById(gameId, true);
        if (!match) {
          return callback({ status: 'error', message: 'Game not found' });
        }

        if (match.lobbyId) {
          const populatedLobby = await getLobbyWithStatuses(match.lobbyId, io);
          io.to(`lobby:${match.lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
        }

        return callback({ status: 'ok', gameState: match });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('game:unsubscribe', async ({ gameId }, callback) => {
      try {
        if (!gameId) {
          return callback?.({ status: 'error', message: 'Game ID is required' });
        }

        socket.leave(`game:${gameId}`);

        const Match = require('../models/Match');
        const match = await Match.findById(gameId);
        if (match && match.lobbyId) {
          const populatedLobby = await getLobbyWithStatuses(match.lobbyId, io);
          io.to(`lobby:${match.lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
        }

        return callback?.({ status: 'ok' });
      } catch (error) {
        return callback?.({ status: 'error', message: error.message });
      }
    });

    socket.on('game:start', async ({ gameType, lobbyId }, callback) => {
      try {
        const match = await gamesService.startMatch(gameType, lobbyId);
        socket.join(`game:${match._id}`);
        io.to(`lobby:${lobbyId}`).emit('game:started', { match });
        io.to(`game:${match._id}`).emit('game:state', { match });
        return callback({ status: 'ok', match });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('game:move', async ({ gameId, move }, callback) => {
      try {
        let match = await gamesService.makeMatchMove(gameId, userId, move);
        io.to(`game:${gameId}`).emit('game:state', { match });
        if (match.lobbyId) {
          io.to(`lobby:${match.lobbyId}`).emit('game:state', { match });
        }
        callback({ status: 'ok', gameState: match });

        const nextPlayer = match.players.find(p => p.symbol === match.currentTurn);
        if (match.status === 'active' && nextPlayer && nextPlayer.userId && nextPlayer.userId.username === 'AlphaSphere AI') {
          setTimeout(async () => {
            try {
              match = await gamesService.makeAIMove(gameId);
              io.to(`game:${gameId}`).emit('game:state', { match });
              if (match.lobbyId) {
                io.to(`lobby:${match.lobbyId}`).emit('game:state', { match });
              }
            } catch (err) {
              console.error('Error executing AI move:', err);
            }
          }, 600);
        }
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('game:forfeit', async ({ gameId }, callback) => {
      try {
        const match = await gamesService.forfeitMatch(gameId, userId);
        io.to(`game:${gameId}`).emit('game:state', { match });
        if (match.lobbyId) {
          io.to(`lobby:${match.lobbyId}`).emit('game:state', { match });
        }
        return callback({ status: 'ok', gameState: match });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('game:draw', async ({ gameId }, callback) => {
      try {
        const match = await gamesService.drawMatch(gameId, userId);
        io.to(`game:${gameId}`).emit('game:state', { match });
        if (match.lobbyId) {
          io.to(`lobby:${match.lobbyId}`).emit('game:state', { match });
        }
        return callback({ status: 'ok', gameState: match });
      } catch (error) {
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('game:rematch:request', async ({ gameId }, callback) => {
      console.log('SOCKET: game:rematch:request received', { gameId, userId });
      try {
        if (!gameId) {
          console.log('SOCKET: game:rematch:request validation failed: Game ID is required');
          return callback({ status: 'error', message: 'Game ID is required' });
        }

        const match = await gamesService.getMatchById(gameId);
        if (!match) {
          console.log('SOCKET: game:rematch:request validation failed: Match not found');
          return callback({ status: 'error', message: 'Game not found' });
        }

        if (match.status !== 'completed') {
          console.log('SOCKET: game:rematch:request validation failed: Match is not completed');
          return callback({ status: 'error', message: 'Match is not completed yet' });
        }

        if (!match.lobbyId) {
          console.log('SOCKET: game:rematch:request validation failed: Lobby ID is missing');
          return callback({ status: 'error', message: 'Match does not belong to a lobby' });
        }

        const lobby = await Lobby.findById(match.lobbyId);
        if (!lobby) {
          console.log('SOCKET: game:rematch:request validation failed: Lobby not found');
          return callback({ status: 'error', message: 'Lobby not found' });
        }

        const hasAI = match.players.some(p => {
          if (!p.userId) return false;
          if (typeof p.userId === 'object') {
            return p.userId.username === 'AlphaSphere AI';
          }
          return false;
        });

        if (lobby.durationType === 'one-time' && !hasAI) {
          console.log('SOCKET: game:rematch:request validation failed: Cannot rematch in a one-time lobby');
          return callback({ status: 'error', message: 'Cannot rematch in a one-time lobby' });
        }

        const playerEntry = match.players.find(p => {
          const pId = p.userId && (p.userId._id || p.userId);
          return pId && pId.toString() === userId.toString();
        });
        if (!playerEntry) {
          console.log('SOCKET: game:rematch:request validation failed: User is not a participant');
          return callback({ status: 'error', message: 'You are not a participant in this game' });
        }

        if (!match.rematchRequests) {
          match.rematchRequests = [];
        }
        
        const alreadyRequested = match.rematchRequests.some(id => id.toString() === userId.toString());
        if (!alreadyRequested) {
          match.rematchRequests.push(userId);
          await match.save();
        }

        const updatedMatch = await gamesService.getMatchById(gameId, true);
        console.log('SOCKET: game:rematch:request broadcasting updated match state');
        io.to(`game:${gameId}`).emit('game:state', { match: updatedMatch });

        let startRematch = false;
        if (hasAI) {
          startRematch = true;
        } else {
          const humanPlayers = match.players.filter(p => {
            if (!p.userId) return true;
            if (typeof p.userId === 'object') {
              return p.userId.username !== 'AlphaSphere AI';
            }
            return true;
          });
          const humanIds = humanPlayers.map(p => {
            const val = p.userId && (p.userId._id || p.userId);
            return val ? val.toString() : '';
          }).filter(Boolean);
          const requestIds = (match.rematchRequests || []).map(id => id.toString());
          startRematch = humanIds.length > 0 && humanIds.every(hId => requestIds.includes(hId));
        }

        console.log('SOCKET: game:rematch:request status', { startRematch, hasAI });

        if (startRematch) {
          console.log('SOCKET: game:rematch:request starting new match');
          const newMatch = await gamesService.startMatch(match.gameType, match.lobbyId);
          console.log('SOCKET: game:rematch:request new match started', newMatch._id);
          io.to(`game:${gameId}`).emit('game:rematch:started', { match: newMatch });
          io.to(`lobby:${match.lobbyId}`).emit('game:started', { match: newMatch });
        }

        return callback({ status: 'ok', match: updatedMatch });
      } catch (error) {
        console.error('Error in game:rematch:request:', error);
        return callback({ status: 'error', message: error.message });
      }
    });

    socket.on('disconnect', async () => {
      console.log('Socket disconnected:', socket.id);
      const sockets = io._onlineUsers && io._onlineUsers.get(userId);
      const lastActive = new Date();
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          io._onlineUsers.delete(userId);
          io.emit('presence:update', { userId, status: 'offline' });
          
          const lobbyId = io._userLobby.get(userId);
          io._userLobby.set(userId, null);
          
          if (lobbyId) {
            const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
            io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
          }

          try {
            await User.findByIdAndUpdate(userId, { lastActive });
          } catch (err) {
            console.error('Error updating lastActive', err);
          }
          io.to(`watch:${userId}`).emit('friend:presence', { userId, online: false, currentLobbyId: null, lastActive });
        } else {
          io._onlineUsers.set(userId, sockets);
          
          const lobbyId = io._userLobby.get(userId);
          if (lobbyId) {
            const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
            io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
          }
        }
      } else {
        io.emit('presence:update', { userId, status: 'offline' });
        
        const lobbyId = io._userLobby.get(userId);
        io._userLobby.set(userId, null);
        
        if (lobbyId) {
          const populatedLobby = await getLobbyWithStatuses(lobbyId, io);
          io.to(`lobby:${lobbyId}`).emit('lobby:update', { lobby: populatedLobby });
        }

        try {
          await User.findByIdAndUpdate(userId, { lastActive });
        } catch (err) {
          console.error('Error updating lastActive', err);
        }
        io.to(`watch:${userId}`).emit('friend:presence', { userId, online: false, currentLobbyId: null, lastActive });
      }

      io.emit('online:count', { count: io._onlineUsers ? io._onlineUsers.size : 0 });
    });
  });
};

module.exports = {
  initSockets
};
