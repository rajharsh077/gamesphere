const Lobby = require('../models/Lobby');
const Match = require('../models/Match');

const getLobbyWithStatuses = async (lobbyId, io) => {
  const lobby = await Lobby.findById(lobbyId)
    .populate({
      path: 'host players invitedUsers readyPlayers',
      select: 'username avatarUrl elo xp matchHistory',
      populate: {
        path: 'matchHistory',
        select: 'gameType players'
      }
    });
  if (!lobby) return null;

  const lobbyObj = lobby.toObject();
  const activeMatch = await Match.findOne({ lobbyId: lobby._id, status: 'active' });

  if (lobbyObj.players && io) {
    lobbyObj.players = lobbyObj.players.map(p => {
      const pIdStr = p._id.toString();
      let status = 'offline';
      const isOnline = io._onlineUsers && io._onlineUsers.has(pIdStr) && io._onlineUsers.get(pIdStr).size > 0;

      if (isOnline) {
        status = 'in-lobby';
        if (activeMatch) {
          const gameRoomName = `game:${activeMatch._id}`;
          const gameRoomSockets = io.sockets.adapter.rooms.get(gameRoomName);
          const userSockets = io._onlineUsers.get(pIdStr);
          if (gameRoomSockets && userSockets) {
            const inGameRoom = [...userSockets].some(sid => gameRoomSockets.has(sid));
            if (inGameRoom) {
              status = 'in-game';
            }
          }
        }
      }

      // Calculate ELO of each game type dynamically based on matchHistory
      const gameType = (lobbyObj.gameType || '').toLowerCase();
      let gameElo = 1200;
      if (p.matchHistory) {
        for (const m of p.matchHistory) {
          const mGameType = (m.gameType || '').toLowerCase();
          const targetGameType = gameType;
          const isMatchGame = mGameType === targetGameType || 
            (targetGameType.includes('tic-tac-toe') && mGameType.includes('tic-tac-toe'));
            
          if (isMatchGame && m.players) {
            const playerEntry = m.players.find(pe => {
              if (!pe.userId) return false;
              const peUserIdStr = pe.userId._id ? pe.userId._id.toString() : pe.userId.toString();
              return peUserIdStr === pIdStr;
            });
            if (playerEntry) {
              gameElo = Math.max(0, gameElo + (playerEntry.eloChange || 0));
            }
          }
        }
      }

      return {
        ...p,
        gameStatus: status,
        gameElo
      };
    });
  }

  return lobbyObj;
};

module.exports = {
  getLobbyWithStatuses
};
