const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const userService = require('../services/user.service');
const { generateToken } = require('../config/jwt');
const https = require('https');

// If GOOGLE_CLIENT_ID is not yet configured, we will fall back to tokeninfo check (useful for quick local dev)
const client = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const googleAuth = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    let payload;
    const isIdToken = token.startsWith('ey');

    if (isIdToken) {
      if (client) {
        try {
          const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
          });
          payload = ticket.getPayload();
        } catch (err) {
          console.error('google-auth-library verification failed, trying tokeninfo fallback:', err.message);
          payload = await fetchTokenInfo(token);
        }
      } else {
        console.warn('GOOGLE_CLIENT_ID not configured in backend .env. Using tokeninfo API fallback.');
        payload = await fetchTokenInfo(token);
      }
    } else {
      payload = await fetchUserInfoFromAccessToken(token);
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google account' });
    }

    // 1. Check if user already has this Google account linked
    let user = await User.findOne({ googleId });

    if (!user) {
      // 2. Check if a user with this email already exists
      user = await User.findOne({ email });

      if (user) {
        // Link Google ID to existing user
        user.googleId = googleId;
        if (!user.avatarUrl && picture) {
          user.avatarUrl = picture;
        }
        await user.save();
      } else {
        // 3. Create a new user with Google details
        let baseUsername = name ? name.replace(/\s+/g, '') : 'Gamer';
        // Clean special characters
        baseUsername = baseUsername.replace(/[^a-zA-Z0-9]/g, '');
        if (!baseUsername) baseUsername = 'Gamer';

        let username = baseUsername;
        let suffix = 1;
        while (await User.findOne({ username })) {
          username = `${baseUsername}${suffix}`;
          suffix++;
        }

        user = await User.create({
          username,
          email,
          googleId,
          avatarUrl: picture || '',
          passwordHash: '' // Google users do not have a password hash
        });
      }
    }

    // Generate JWT access token for our app session
    const accessToken = generateToken({ userId: user._id });
    const profile = await userService.getUserById(user._id);

    return res.json({ user: profile, accessToken });
  } catch (error) {
    console.error('Google Auth Controller Error:', error);
    return res.status(401).json({ message: 'Google authentication failed' });
  }
};

// Helper utility to verify tokeninfo directly from Google API using native https
const fetchTokenInfo = (token) => {
  return new Promise((resolve, reject) => {
    https.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error_description || 'Invalid token'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Helper utility to get userinfo with an access token from Google API
const fetchUserInfoFromAccessToken = (accessToken) => {
  return new Promise((resolve, reject) => {
    https.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error_description || 'Invalid access token'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

module.exports = {
  googleAuth
};
