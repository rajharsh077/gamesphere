const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    const users = await User.find({
      $or: [
        { friendRequests: { $exists: false } },
        { 'friendRequests.incoming': { $exists: false } },
        { 'friendRequests.outgoing': { $exists: false } }
      ]
    });

    if (users.length === 0) {
      console.log('No users required migration.');
      return;
    }

    console.log(`Migrating ${users.length} user(s)...`);

    for (const user of users) {
      if (!user.friendRequests) {
        user.friendRequests = { incoming: [], outgoing: [] };
      } else {
        user.friendRequests.incoming = user.friendRequests.incoming || [];
        user.friendRequests.outgoing = user.friendRequests.outgoing || [];
      }
      await user.save();
    }

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
