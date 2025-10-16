import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
import apiRoutes from '../../routes/api.js';
app.use('/api', apiRoutes);

export default app;
