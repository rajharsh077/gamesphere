const Match = require('../models/Match');
const Lobby = require('../models/Lobby');
const User = require('../models/User');
const { createInitialBoard, getInitialPlayerSymbols, getNextTurn, applyMove } = require('../utils/gameRules');

const playerPopulateOption = {
  path: 'players.userId',
  select: 'username avatarUrl elo xp matchHistory',
  populate: {
    path: 'matchHistory',
    select: 'gameType players'
  }
};

const XP_REWARDS = {
  win: 50,
  draw: 20,
  loss: 10
};

const GAME_K_FACTORS = {
  chess: 32,          // Strategy game K-factor
  connect4: 20,       // Medium strategy K-factor
  'tic-tac-toe': 12   // Faster/simple game K-factor
};

const calculateExpectedScore = (rating, opponentRating) => {
  const ratingPower = Math.pow(10, rating / 400);
  const opponentPower = Math.pow(10, opponentRating / 400);
  return ratingPower / (ratingPower + opponentPower);
};

const calculateEloChange = (rating, opponentRating, score, gameType) => {
  const expected = calculateExpectedScore(rating, opponentRating);
  const kFactor = GAME_K_FACTORS[gameType] || 24;
  return Math.round(kFactor * (score - expected));
};

const startMatch = async (gameType, lobbyId) => {
  const lobby = await Lobby.findById(lobbyId);
  if (!lobby) {
    throw new Error('Lobby not found');
  }

  if (lobby.gameType !== gameType) {
    throw new Error('Lobby game type does not match requested game type');
  }

  if (lobby.players.length < 2) {
    throw new Error('At least two players are required to start a game');
  }

  const symbols = getInitialPlayerSymbols(gameType);
  const players = lobby.players.slice(0, 2).map((player, index) => ({
    userId: player,
    symbol: symbols[index],
    result: 'pending',
    xpChange: 0,
    eloChange: 0
  }));

  const match = await Match.create({
    gameType,
    players,
    lobbyId: lobby._id,
    board: createInitialBoard(gameType),
    currentTurn: symbols[0],
    status: 'active'
  });

  lobby.status = 'playing';
  await lobby.save();

  await match.populate(playerPopulateOption);
  return match;
};

const getMatchById = async (gameId, lean = false) => {
  if (lean) {
    return Match.findById(gameId).populate(playerPopulateOption).lean();
  }
  return Match.findById(gameId).populate(playerPopulateOption);
};

const makeMatchMove = async (gameId, playerId, move) => {
  if (!move) {
    throw new Error('Move payload is required');
  }

  const match = await Match.findById(gameId);
  if (!match) {
    throw new Error('Game not found');
  }

  if (match.status === 'completed') {
    throw new Error('Game is already completed');
  }

  const player = match.players.find((p) => p.userId.toString() === playerId.toString());
  if (!player) {
    throw new Error('You are not a participant in this game');
  }

  if (player.symbol !== match.currentTurn) {
    throw new Error('It is not your turn');
  }

  const { board, winner, draw } = applyMove(match.gameType, match.board, move, player.symbol);
  match.board = board;
  match.moves.push({
    playerId,
    symbol: player.symbol,
    move,
    timestamp: new Date()
  });

  if (winner || draw) {
    match.status = 'completed';
    match.completedAt = new Date();
    match.winner = draw ? 'draw' : { symbol: winner, userId: player.userId };

    match.players = match.players.map((opponent) => ({
      ...opponent.toObject(),
      result: draw ? 'draw' : opponent.userId.toString() === player.userId.toString() ? 'win' : 'loss'
    }));

    const users = await User.find({ _id: { $in: match.players.map((entry) => entry.userId) } });
    const eloById = new Map(users.map((user) => [user._id.toString(), user.elo || 1200]));

    match.players = match.players.map((opponent) => {
      const opponentEntry = match.players.find(
        (entry) => entry.userId.toString() !== opponent.userId.toString()
      );
      const playerRating = eloById.get(opponent.userId.toString()) ?? 1200;
      const opponentRating = eloById.get(opponentEntry.userId.toString()) ?? 1200;
      const score = opponent.result === 'win' ? 1 : opponent.result === 'draw' ? 0.5 : 0;
      const eloChange = calculateEloChange(playerRating, opponentRating, score, match.gameType);

      return {
        ...opponent,
        xpChange: XP_REWARDS[opponent.result] || 0,
        eloChange
      };
    });

    const userUpdates = users.map(async (user) => {
      const playerEntry = match.players.find(
        (entry) => entry.userId.toString() === user._id.toString()
      );
      if (!playerEntry) return;

      user.xp += playerEntry.xpChange;
      user.elo = Math.max(0, user.elo + playerEntry.eloChange);
      user.matchHistory = user.matchHistory || [];
      user.matchHistory.push(match._id);
      await user.save();
    });

    if (match.lobbyId) {
      const lobby = await Lobby.findById(match.lobbyId);
      if (lobby) {
        // For one-time lobbies, mark completed so they cannot be joined again
        if (lobby.durationType === 'one-time') {
          lobby.status = 'completed';
        } else if (lobby.durationType === 'one-hour') {
          // For one-hour lobbies, keep players so they can rematch, but reset ready status
          lobby.status = 'waiting';
          lobby.readyPlayers = [];
          // ensure expiresAt exists for one-hour lobbies (safety)
          if (!lobby.expiresAt) {
            lobby.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
          }
        } else {
          lobby.status = 'completed';
        }
        await lobby.save();
      }
    }

    await Promise.all(userUpdates);
  } else {
    match.currentTurn = getNextTurn(match.gameType, match.currentTurn);
  }

  await match.save();
  await match.populate(playerPopulateOption);
  return match;
};

const forfeitMatch = async (gameId, forfeitingUserId) => {
  const match = await Match.findById(gameId);
  if (!match) {
    throw new Error('Game not found');
  }

  if (match.status === 'completed') {
    throw new Error('Game is already completed');
  }

  const forfeitingPlayer = match.players.find((p) => p.userId.toString() === forfeitingUserId.toString());
  if (!forfeitingPlayer) {
    throw new Error('You are not a participant in this game');
  }

  const winningPlayer = match.players.find((p) => p.userId.toString() !== forfeitingUserId.toString());
  if (!winningPlayer) {
    throw new Error('Opponent not found');
  }

  match.status = 'completed';
  match.completedAt = new Date();
  match.winner = { symbol: winningPlayer.symbol, userId: winningPlayer.userId };

  // Set the result: win for winner, loss for forfeiter
  match.players = match.players.map((p) => {
    const pObj = p.toObject ? p.toObject() : p;
    return {
      ...pObj,
      result: p.userId.toString() === forfeitingUserId.toString() ? 'loss' : 'win'
    };
  });

  const users = await User.find({ _id: { $in: match.players.map((entry) => entry.userId) } });
  const eloById = new Map(users.map((user) => [user._id.toString(), user.elo || 1200]));

  match.players = match.players.map((opponent) => {
    const opponentEntry = match.players.find(
      (entry) => entry.userId.toString() !== opponent.userId.toString()
    );
    const playerRating = eloById.get(opponent.userId.toString()) ?? 1200;
    const opponentRating = eloById.get(opponentEntry.userId.toString()) ?? 1200;
    const score = opponent.result === 'win' ? 1 : 0;
    const eloChange = calculateEloChange(playerRating, opponentRating, score, match.gameType);

    return {
      ...opponent,
      xpChange: XP_REWARDS[opponent.result] || 0,
      eloChange
    };
  });

  const userUpdates = users.map(async (user) => {
    const playerEntry = match.players.find(
      (entry) => entry.userId.toString() === user._id.toString()
    );
    if (!playerEntry) return;

    user.xp += playerEntry.xpChange;
    user.elo = Math.max(0, user.elo + playerEntry.eloChange);
    user.matchHistory = user.matchHistory || [];
    user.matchHistory.push(match._id);
    await user.save();
  });

  if (match.lobbyId) {
    const lobby = await Lobby.findById(match.lobbyId);
    if (lobby) {
      if (lobby.durationType === 'one-time') {
        lobby.status = 'completed';
      } else if (lobby.durationType === 'one-hour') {
        lobby.status = 'waiting';
        lobby.readyPlayers = [];
        if (!lobby.expiresAt) {
          lobby.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        }
      } else {
        lobby.status = 'completed';
      }
      await lobby.save();
    }
  }

  await Promise.all(userUpdates);
  await match.save();
  await match.populate(playerPopulateOption);
  return match;
};

const drawMatch = async (gameId, userId) => {
  const match = await Match.findById(gameId);
  if (!match) {
    throw new Error('Game not found');
  }

  if (match.status === 'completed') {
    throw new Error('Game is already completed');
  }

  const player = match.players.find((p) => p.userId.toString() === userId.toString());
  if (!player) {
    throw new Error('You are not a participant in this game');
  }

  match.status = 'completed';
  match.completedAt = new Date();
  match.winner = 'draw';

  match.players = match.players.map((p) => {
    const pObj = p.toObject ? p.toObject() : p;
    return {
      ...pObj,
      result: 'draw'
    };
  });

  const users = await User.find({ _id: { $in: match.players.map((entry) => entry.userId) } });
  const eloById = new Map(users.map((user) => [user._id.toString(), user.elo || 1200]));

  match.players = match.players.map((opponent) => {
    const opponentEntry = match.players.find(
      (entry) => entry.userId.toString() !== opponent.userId.toString()
    );
    const playerRating = eloById.get(opponent.userId.toString()) ?? 1200;
    const opponentRating = eloById.get(opponentEntry.userId.toString()) ?? 1200;
    const score = 0.5;
    const eloChange = calculateEloChange(playerRating, opponentRating, score, match.gameType);

    return {
      ...opponent,
      xpChange: XP_REWARDS[opponent.result] || 0,
      eloChange
    };
  });

  const userUpdates = users.map(async (user) => {
    const playerEntry = match.players.find(
      (entry) => entry.userId.toString() === user._id.toString()
    );
    if (!playerEntry) return;

    user.xp += playerEntry.xpChange;
    user.elo = Math.max(0, user.elo + playerEntry.eloChange);
    user.matchHistory = user.matchHistory || [];
    user.matchHistory.push(match._id);
    await user.save();
  });

  if (match.lobbyId) {
    const lobby = await Lobby.findById(match.lobbyId);
    if (lobby) {
      if (lobby.durationType === 'one-time') {
        lobby.status = 'completed';
      } else if (lobby.durationType === 'one-hour') {
        lobby.status = 'waiting';
        lobby.readyPlayers = [];
        if (!lobby.expiresAt) {
          lobby.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        }
      } else {
        lobby.status = 'completed';
      }
      await lobby.save();
    }
  }

  await Promise.all(userUpdates);
  await match.save();
  await match.populate(playerPopulateOption);
  return match;
};

const getOrCreateAIUser = async () => {
  let aiUser = await User.findOne({ username: 'AlphaSphere AI' });
  if (!aiUser) {
    const bcrypt = require('bcryptjs');
    const dummyPasswordHash = await bcrypt.hash('alphasphere_ai_secret_123', 10);
    aiUser = await User.create({
      username: 'AlphaSphere AI',
      email: 'ai@gamesphere.com',
      passwordHash: dummyPasswordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=AlphaSphere',
      elo: 1200,
      xp: 0
    });
  }
  return aiUser;
};

const makeAIMove = async (gameId) => {
  const match = await Match.findById(gameId);
  if (!match) {
    throw new Error('Game not found');
  }

  if (match.status === 'completed') {
    throw new Error('Game is already completed');
  }

  await match.populate(playerPopulateOption);

  const aiPlayerEntry = match.players.find((p) => p.userId && p.userId.username === 'AlphaSphere AI');
  if (!aiPlayerEntry) {
    throw new Error('AI player not found in this match');
  }

  if (aiPlayerEntry.symbol !== match.currentTurn) {
    throw new Error('It is not the AI turn');
  }

  const { getAIMove } = require('../utils/aiOpponent');
  const move = getAIMove(match.gameType, match.board, aiPlayerEntry.symbol);
  if (!move) {
    throw new Error('No valid moves available for AI');
  }

  const { board, winner, draw } = applyMove(match.gameType, match.board, move, aiPlayerEntry.symbol);
  match.board = board;
  match.moves.push({
    playerId: aiPlayerEntry.userId._id,
    symbol: aiPlayerEntry.symbol,
    move,
    timestamp: new Date()
  });

  if (winner || draw) {
    match.status = 'completed';
    match.completedAt = new Date();
    match.winner = draw ? 'draw' : { symbol: winner, userId: aiPlayerEntry.userId._id };

    match.players = match.players.map((opponent) => ({
      ...opponent.toObject(),
      result: draw ? 'draw' : opponent.userId._id.toString() === aiPlayerEntry.userId._id.toString() ? 'win' : 'loss'
    }));

    const users = await User.find({ _id: { $in: match.players.map((entry) => entry.userId._id) } });
    const eloById = new Map(users.map((user) => [user._id.toString(), user.elo || 1200]));

    match.players = match.players.map((opponent) => {
      const opponentEntry = match.players.find(
        (entry) => entry.userId._id.toString() !== opponent.userId._id.toString()
      );
      const playerRating = eloById.get(opponent.userId._id.toString()) ?? 1200;
      const opponentRating = eloById.get(opponentEntry.userId._id.toString()) ?? 1200;
      const score = opponent.result === 'win' ? 1 : opponent.result === 'draw' ? 0.5 : 0;
      const eloChange = calculateEloChange(playerRating, opponentRating, score, match.gameType);

      return {
        ...opponent,
        xpChange: XP_REWARDS[opponent.result] || 0,
        eloChange
      };
    });

    const userUpdates = users.map(async (user) => {
      const playerEntry = match.players.find(
        (entry) => entry.userId._id.toString() === user._id.toString()
      );
      if (!playerEntry) return;

      user.xp += playerEntry.xpChange;
      user.elo = Math.max(0, user.elo + playerEntry.eloChange);
      user.matchHistory = user.matchHistory || [];
      user.matchHistory.push(match._id);
      await user.save();
    });

    if (match.lobbyId) {
      const lobby = await Lobby.findById(match.lobbyId);
      if (lobby) {
        lobby.status = 'completed';
        await lobby.save();
      }
    }

    await Promise.all(userUpdates);
  } else {
    match.currentTurn = getNextTurn(match.gameType, match.currentTurn);
  }

  await match.save();
  await match.populate(playerPopulateOption);
  return match;
};

module.exports = {
  startMatch,
  getMatchById,
  makeMatchMove,
  forfeitMatch,
  drawMatch,
  getOrCreateAIUser,
  makeAIMove
};
