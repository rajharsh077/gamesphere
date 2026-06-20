const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  incoming: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  outgoing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    googleId: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    tagline: { type: String, default: '' },
    xp: { type: Number, default: 0 },
    elo: { type: Number, default: 1200 },
    lastActive: { type: Date, default: Date.now },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: {
      type: friendRequestSchema,
      default: { incoming: [], outgoing: [] }
    },
    matchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
