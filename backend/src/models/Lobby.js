const mongoose = require('mongoose');

const lobbySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    gameType: { type: String, required: true, enum: ['tic-tac-toe', 'connect4', 'chess'] },
    isPrivate: { type: Boolean, default: false },
    passwordHash: { type: String, default: '' },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readyPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    invitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxPlayers: { type: Number, default: 2 },
    durationType: { type: String, enum: ['one-time', 'one-hour'], default: 'one-time' },
    expiresAt: { type: Date },
    status: { type: String, enum: ['waiting', 'playing', 'completed'], default: 'waiting' },
    chatMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' }],
    joinedAt: { type: Map, of: Date, default: {} }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Lobby', lobbySchema);
