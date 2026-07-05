import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Standard boilerplate configurations
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRouter);

// Root endpoint descriptive handler
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to the Q-Track API service.',
    endpoints: {
      health: '/api/health',
      distance: '/api/distance (POST)',
      profile: '/api/profile (GET, Requires JWT Bearer Token)',
      admin: '/api/admin (GET, Requires JWT Bearer Token & admin Role)',
    },
  });
});

// Establish dynamic port listener
const server = app.listen(PORT, () => {
  console.log(`[Server] Initialization completed successfully.`);
  console.log(`[Server] Listening on Port: ${PORT}`);
  console.log(`[Server] API Base URL: http://localhost:${PORT}/api`);
});

export default server;
