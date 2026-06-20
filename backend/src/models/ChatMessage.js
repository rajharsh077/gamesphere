const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['lobby', 'direct', 'game'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    message: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
