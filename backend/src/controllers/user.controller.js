const userService = require('../services/user.service');

const getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ profile: user });
  } catch (error) {
    next(error);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await userService.searchUsers(query);
    return res.json({ users });
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const user = await userService.updateUserById(userId, updates);
    return res.json({ profile: user });
  } catch (error) {
    next(error);
  }
};

const getUserMatchHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const matches = await userService.getMatchHistoryForUser(userId);
    return res.json({ matches });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  searchUsers,
  updateUserProfile,
  getUserMatchHistory
};
