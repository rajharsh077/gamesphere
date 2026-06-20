const User = require('../models/User');

const getLeaderboard = async (req, res, next) => {
  try {
    const type = req.query.type === 'xp' ? 'xp' : 'elo';
    const sortKey = type === 'xp' ? { xp: -1 } : { elo: -1 };

    const leaderboard = await User.find({})
      .select('username avatarUrl xp elo')
      .sort(sortKey)
      .limit(50)
      .lean();

    return res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeaderboard
};