const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    symbol: {
        type: String,
        required: true,
        uppercase: true,
    },
    name: {
        type: String, // Optional, can be derived or stored
        required: false,
    },
    amount: {
        type: Number,
        required: true,
    },
    purchasePrice: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Holding = mongoose.model('Holding', holdingSchema);

module.exports = Holding;
