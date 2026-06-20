const User = require('../models/User');

const createUser = async ({ username, email, passwordHash, avatarUrl }) => {
  return User.create({ username, email, passwordHash, avatarUrl });
};

const findByEmail = async (email) => {
  return User.findOne({ email });
};

module.exports = {
  createUser,
  findByEmail
};
