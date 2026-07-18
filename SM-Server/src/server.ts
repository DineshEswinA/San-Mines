import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes';
import { requestIdMiddleware, requestLoggerMiddleware } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Register Request ID and Request Logging middleware at the very top of the stack
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Standard boilerplate configurations with whitelisted development origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like native mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(origin) ||
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Mount API routes
app.use('/api', apiRouter);

// Root endpoint descriptive handler
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to the Sam Mines API service.',
    endpoints: {
      health: '/api/health',
      distance: '/api/distance (POST)',
      profile: '/api/profile (GET, Requires JWT Bearer Token)',
      admin: '/api/admin (GET, Requires JWT Bearer Token & admin Role)',
    },
  });
});

// Register Global Error Handler (must be registered after all route handlers)
app.use(errorHandler);

// Establish dynamic port listener
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.info(`[Server] Initialization completed successfully.`);
    logger.info(`[Server] Listening on Port: ${PORT}`);
    logger.info(`[Server] API Base URL: http://localhost:${PORT}/api`);
  });
}

export default app;
