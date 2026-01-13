const Holding = require('../models/Holding');

exports.getHoldings = async (req, res) => {
    try {
        const holdings = await Holding.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(holdings);
    } catch (error) {
        console.error("Error fetching holdings:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.createHolding = async (req, res) => {
    try {
        const { symbol, name, amount, purchasePrice } = req.body;

        const newHolding = new Holding({
            user: req.user.id,
            symbol: symbol.toUpperCase(),
            name,
            amount,
            purchasePrice
        });

        const holding = await newHolding.save();
        res.json(holding);
    } catch (error) {
        console.error("Error creating holding:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteHolding = async (req, res) => {
    try {
        const holding = await Holding.findById(req.params.id);

        if (!holding) {
            return res.status(404).json({ message: "Holding not found" });
        }

        // Check user
        if (holding.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "User not authorized" });
        }

        await holding.deleteOne();
        res.json({ message: "Holding removed" });
    } catch (error) {
        console.error("Error deleting holding:", error);
        res.status(500).json({ message: "Server error" });
    }
};
