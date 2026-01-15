const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Define potential paths for .env
const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env')
];

let envLoaded = false;

// Helpers to parse env file content manually
const parseEnvFile = (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`DEBUG: File content length: ${content.length}`);
        const config = {};
        const lines = content.split(/\r?\n/); // Handle both \n and \r\n
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const parts = trimmed.split('=');
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                config[key] = value;
                console.log(`DEBUG: Line ${index}: Found key '${key}'`); // Log found keys
            }
        });
        return config;
    } catch (e) {
        console.log("DEBUG: Parse error:", e);
        return null;
    }
};

// Try loading
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        console.log(`DEBUG: Found .env at: ${envPath}`);

        // Try dotenv first
        const result = dotenv.config({ path: envPath });

        // If dotenv fails or doesn't set JWT_SECRET, try manual parse
        if (result.error || !process.env.JWT_SECRET) {
            console.log("DEBUG: dotenv failed or incomplete, using manual parser...");
            const manuallyParsed = parseEnvFile(envPath);
            if (manuallyParsed) {
                Object.keys(manuallyParsed).forEach(key => {
                    if (!process.env[key]) {
                        process.env[key] = manuallyParsed[key];
                    }
                });
                envLoaded = true;
                console.log("DEBUG: Manual parse applied.");
            }
        } else {
            envLoaded = true;
            console.log("DEBUG: dotenv loaded safely.");
        }

        if (process.env.JWT_SECRET) break;
    }
}

console.log("DEBUG: Final Status - JWT_SECRET exists:", !!process.env.JWT_SECRET);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const holdingRoutes = require('./routes/holdingRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coinvista';

mongoose
    .connect(MONGO_URI)
    .then(() => console.log(`MongoDB Connected: ${MONGO_URI}`))
    .catch((err) => console.error(`Error connecting to MongoDB: ${err.message}`));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/holdings', holdingRoutes);
app.use('/api/crypto', require('./routes/cryptoRoutes'));

// Basic health check route
app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
