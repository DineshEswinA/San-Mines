import { Router, Request, Response } from 'express';
import { getDistance } from '../utils/geo';
import { requireAuth, authorizeRole } from '../middleware/auth';
import { tripsRouter, configRouter } from './trips';

const router = Router();

// Mount routers
router.use('/trips', tripsRouter);
router.use('/config', configRouter);

/**
 * @route GET /health
 * @desc System health check endpoint.
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route POST /distance
 * @desc Calculates distance between two GPS coordinates using the Haversine formula.
 */
router.post('/distance', (req: Request, res: Response) => {
  const { lat1, lon1, lat2, lon2 } = req.body;

  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number'
  ) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Coordinates lat1, lon1, lat2, and lon2 must be valid numbers.',
    });
  }

  try {
    const distanceMeters = getDistance(lat1, lon1, lat2, lon2);
    return res.json({
      distanceMeters,
      coordinates: {
        point1: { lat: lat1, lon: lon1 },
        point2: { lat: lat2, lon: lon2 },
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Calculation Error',
      message: err.message,
    });
  }
});

/**
 * @route GET /profile
 * @desc Protected user profile route requiring a verified Bearer token.
 */
router.get('/profile', requireAuth, (req: Request, res: Response) => {
  return res.json({
    message: 'Authorized access to profile metadata successful.',
    user: req.user,
  });
});

/**
 * @route GET /admin
 * @desc Restricted administrative route requiring verified Bearer token and 'admin' role.
 */
router.get('/admin', requireAuth, authorizeRole(['SUPER_ADMIN']), (req: Request, res: Response) => {
  return res.json({
    message: 'Welcome to the administrative portal.',
    user: req.user,
  });
});

export default router;
