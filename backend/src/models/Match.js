const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String },
  result: { type: String, enum: ['win', 'loss', 'draw', 'pending'], default: 'pending' },
  xpChange: { type: Number, default: 0 },
  eloChange: { type: Number, default: 0 }
});

const matchSchema = new mongoose.Schema(
  {
    gameType: { type: String, required: true, enum: ['tic-tac-toe', 'connect4', 'chess'] },
    players: [playerSchema],
    winner: { type: mongoose.Schema.Types.Mixed, default: null },
    moves: { type: Array, default: [] },
    board: { type: Array, default: [] },
    currentTurn: { type: String, enum: ['X', 'O', 'white', 'black'], default: 'X' },
    status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
    durationSeconds: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    lobbyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Match', matchSchema);
