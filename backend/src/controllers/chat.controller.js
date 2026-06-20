const ChatMessage = require('../models/ChatMessage');
const Lobby = require('../models/Lobby');

const getDirectConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { userId: targetUserId } = req.params;

    const messages = await ChatMessage.find({
      targetType: 'direct',
      $or: [
        { sender: userId, targetId: targetUserId },
        { sender: targetUserId, targetId: userId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatarUrl')
      .lean();

    return res.json({ conversation: messages });
  } catch (error) {
    next(error);
  }
};

const getLobbyChat = async (req, res, next) => {
  try {
    const { lobbyId } = req.params;
    const userId = req.user._id;

    const lobby = await Lobby.findById(lobbyId);
    let joinTime = null;
    if (lobby && lobby.joinedAt) {
      joinTime = lobby.joinedAt.get(userId.toString());
    }

    const query = { targetType: 'lobby', targetId: lobbyId };
    if (joinTime) {
      query.createdAt = { $gte: joinTime };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatarUrl')
      .lean();

    return res.json({ messages });
  } catch (error) {
    next(error);
  }
};

const getGameChat = async (req, res, next) => {
  try {
    const { gameId } = req.params;

    const messages = await ChatMessage.find({ targetType: 'game', targetId: gameId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatarUrl')
      .lean();

    return res.json({ messages });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDirectConversation,
  getLobbyChat,
  getGameChat
};