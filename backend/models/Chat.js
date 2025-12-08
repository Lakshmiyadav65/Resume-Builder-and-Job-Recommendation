const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

const chatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  resumeText: {
    type: String,
    required: true,
  },
  messages: [messageSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Chat', chatSchema);
