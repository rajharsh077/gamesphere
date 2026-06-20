const http = require('http');
const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/db');
const { initSockets } = require('./sockets');
const Lobby = require('./models/Lobby');

dotenv.config();

const PORT = process.env.PORT || 4000;

const cleanupExpiredLobbies = async () => {
  try {
    const result = await Lobby.updateMany(
      {
        durationType: 'one-hour',
        expiresAt: { $lte: new Date() },
        status: { $ne: 'completed' }
      },
      { status: 'completed' }
    );
    if (result.modifiedCount > 0) {
      console.log(`✓ Cleaned up ${result.modifiedCount} expired one-hour lobbies`);
    }
  } catch (error) {
    console.error('Error cleaning up expired lobbies:', error);
  }
};

connectDB()
  .then(async () => {
    await cleanupExpiredLobbies();

    try {
      const User = require('./models/User');
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const updateResult = await User.updateMany(
        { lastActive: { $exists: false } },
        { $set: { lastActive: thirtyMinsAgo } }
      );
      if (updateResult.modifiedCount > 0) {
        console.log(`✓ Set default lastActive for ${updateResult.modifiedCount} users`);
      }
    } catch (err) {
      console.error('Error migrating user lastActive timestamps:', err);
    }

    const server = http.createServer(app);
    initSockets(server, app);

    server.listen(PORT, () => {
      console.log(`GameSphere Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
