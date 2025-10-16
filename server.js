import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
}

// Import routes
import apiRoutes from './routes/api.js';

// Routes
app.use('/api', apiRoutes);

// Serve the main page
app.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        // In development, redirect to React dev server
        res.redirect('http://localhost:3001');
    }
});

// Handle React Router (return index.html for all non-API routes in production)
if (process.env.NODE_ENV === 'production') {
    // Serve index.html for all non-API routes (Express 5 uses path-to-regexp v6 – use RegExp)
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Ethereum Transactions Explorer running on http://localhost:${PORT}`);
    console.log(`📊 View transactions at http://localhost:${PORT}`);
});

export default app;
