const User = require('../models/User');

const ensureFriendRequests = (user) => {
  if (!user.friendRequests) {
    user.friendRequests = { incoming: [], outgoing: [] };
  } else {
    user.friendRequests.incoming = user.friendRequests.incoming || [];
    user.friendRequests.outgoing = user.friendRequests.outgoing || [];
  }
};

const sendFriendRequest = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const { _id: currentUserId } = req.user;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    ensureFriendRequests(targetUser);
    ensureFriendRequests(currentUser);

    if (targetUser.friendRequests.incoming.some((id) => id.toString() === currentUserId.toString())) {
      return res.status(409).json({ message: 'Friend request already sent' });
    }

    if (
      currentUser.friends.some((id) => id.toString() === targetUserId) ||
      targetUser.friends.some((id) => id.toString() === currentUserId.toString())
    ) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    targetUser.friendRequests.incoming.push(currentUserId);
    currentUser.friendRequests.outgoing.push(targetUserId);

    await targetUser.save();
    await currentUser.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUserId}`).emit('friend:request:incoming', {
        requester: {
          _id: currentUser._id,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl
        }
      });
    }

    return res.status(200).json({ message: 'Friend request sent' });
  } catch (error) {
    next(error);
  }
};

const acceptFriendRequest = async (req, res, next) => {
  try {
    const { requestUserId } = req.body;
    const { _id: currentUserId } = req.user;

    const currentUser = await User.findById(currentUserId);
    const requestingUser = await User.findById(requestUserId);

    if (!currentUser || !requestingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    ensureFriendRequests(currentUser);
    ensureFriendRequests(requestingUser);

    const incomingIndex = currentUser.friendRequests.incoming.findIndex((id) => id.toString() === requestUserId);
    const outgoingIndex = requestingUser.friendRequests.outgoing.findIndex((id) => id.toString() === currentUserId.toString());

    if (incomingIndex === -1 || outgoingIndex === -1) {
      return res.status(400).json({ message: 'No pending friend request from this user' });
    }

    currentUser.friendRequests.incoming.splice(incomingIndex, 1);
    requestingUser.friendRequests.outgoing.splice(outgoingIndex, 1);

    currentUser.friends.push(requestUserId);
    requestingUser.friends.push(currentUserId);

    await currentUser.save();
    await requestingUser.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${requestUserId}`).emit('friend:request:accepted', {
        friend: {
          _id: currentUser._id,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl,
          elo: currentUser.elo,
          xp: currentUser.xp,
          lastActive: currentUser.lastActive,
          tagline: currentUser.tagline,
          online: true
        }
      });
    }

    return res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
};

const getFriends = async (req, res, next) => {
  try {
    const { _id: currentUserId } = req.user;
    const user = await User.findById(currentUserId)
      .populate({
        path: 'friends',
        select: 'username avatarUrl elo xp lastActive tagline matchHistory',
        populate: {
          path: 'matchHistory',
          select: 'gameType players'
        }
      })
      .populate('friendRequests.incoming', 'username avatarUrl')
      .populate('friendRequests.outgoing', 'username avatarUrl')
      .lean();

    const friendRequests = user.friendRequests || { incoming: [], outgoing: [] };

    return res.json({
      friends: user.friends,
      pendingRequests: {
        incoming: friendRequests.incoming,
        outgoing: friendRequests.outgoing
      }
    });
  } catch (error) {
    next(error);
  }
};

const removeFriend = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const { _id: currentUserId } = req.user;

    const currentUser = await User.findById(currentUserId);
    const friendUser = await User.findById(friendId);

    if (!currentUser || !friendUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    currentUser.friends = currentUser.friends.filter((id) => id.toString() !== friendId);
    friendUser.friends = friendUser.friends.filter((id) => id.toString() !== currentUserId.toString());

    await currentUser.save();
    await friendUser.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${friendId}`).emit('friend:removed', {
        friendId: currentUserId
      });
    }

    return res.status(200).json({ message: 'Friend removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  removeFriend
};