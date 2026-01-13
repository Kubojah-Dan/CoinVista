const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  symbol: {
    type: String,
    required: true,
  },
  targetPrice: {
    type: Number,
    required: true,
  },
  direction: {
    type: String,
    enum: ['above', 'below'],
    required: true,
  },
  isTriggered: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Alert', alertSchema);
