const Alert = require('../models/Alert');

exports.getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(alerts);
    } catch (error) {
        console.error("Error fetching alerts:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.createAlert = async (req, res) => {
    try {
        const { symbol, targetPrice, direction } = req.body;

        const newAlert = new Alert({
            user: req.user.id,
            symbol: symbol.toUpperCase(),
            targetPrice,
            direction
        });

        const alert = await newAlert.save();
        res.json(alert);
    } catch (error) {
        console.error("Error creating alert:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteAlert = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        // Check user
        if (alert.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "User not authorized" });
        }

        await alert.deleteOne();
        res.json({ message: "Alert removed" });
    } catch (error) {
        console.error("Error deleting alert:", error);
        res.status(500).json({ message: "Server error" });
    }
};
