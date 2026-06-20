const User = require('../models/User');
const Match = require('../models/Match');

const getUserById = async (userId) => {
  return User.findById(userId).select('-passwordHash');
};

const searchUsers = async (query) => {
  const regex = new RegExp(query, 'i');
  return User.find({ username: regex })
    .select('username avatarUrl elo xp')
    .limit(20);
};

const updateUserById = async (userId, updates) => {
  return User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-passwordHash');
};

const getMatchHistoryForUser = async (userId) => {
  return Match.find({ 'players.userId': userId, status: 'completed' })
    .populate('players.userId', 'username avatarUrl')
    .sort({ completedAt: -1 })
    .lean();
};

module.exports = {
  getUserById,
  searchUsers,
  updateUserById,
  getMatchHistoryForUser
};
