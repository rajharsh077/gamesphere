const bcrypt = require('bcryptjs');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const { generateToken } = require('../config/jwt');

const register = async (req, res, next) => {
  try {
    const { username, email, password, avatarUrl } = req.body;

    const existing = await authService.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await authService.createUser({ username, email, passwordHash, avatarUrl });

    const accessToken = generateToken({ userId: user._id });
    const profile = await userService.getUserById(user._id);

    return res.status(201).json({ user: profile, accessToken });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = generateToken({ userId: user._id });
    const profile = await userService.getUserById(user._id);

    return res.json({ user: profile, accessToken });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res) => {
  return res.json({ message: 'Logout successful' });
};

const getProfile = async (req, res, next) => {
  try {
    return res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile
};
