const User = require('../models/User');

const findUserById = async (userId) => {
  return User.findById(userId).select('-passwordHash');
};

const updateUser = async (userId, updates) => {
  return User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-passwordHash');
};

module.exports = {
  findUserById,
  updateUser
};
