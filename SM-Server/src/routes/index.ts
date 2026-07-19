import { Router, Request, Response } from 'express';
import { getDistance } from '../utils/geo';
import { requireAuth, authorizeRole } from '../middleware/auth';
import { tripsRouter, configRouter } from './trips';
import { supabase } from '../config/supabase';

const router = Router();

// Mount routers
router.use('/trips', tripsRouter);
router.use('/config', configRouter);

/**
 * @route GET /api/users
 * @desc Retrieve all staff profiles (SUPER_ADMIN only)
 */
router.get('/users', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve user profiles.',
        details: error.message,
      });
    }

    return res.json(profiles);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while fetching profiles.',
      details: err.message,
    });
  }
});

/**
 * @route POST /api/users
 * @desc Admin-level user creation bypassing email confirmation (SUPER_ADMIN only)
 */
router.post('/users', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const { email, password, role, full_name } = req.body;

  if (!email || !password || !role || !full_name) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'All fields (email, password, role, full_name) are required.',
    });
  }

  if (!['QUARRY_OPERATOR', 'UNLOAD_OPERATOR', 'SUPER_ADMIN'].includes(role)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid role value. Must be QUARRY_OPERATOR, UNLOAD_OPERATOR, or SUPER_ADMIN.',
    });
  }

  try {
    // 1. Create the user in Supabase Auth using the administrative Service Role client
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Bypasses email confirmation completely!
      user_metadata: { full_name: full_name.trim(), role },
      app_metadata: { role },
    });

    if (authError || !authData.user) {
      return res.status(500).json({
        error: 'Authentication Error',
        message: 'Failed to create auth credentials.',
        details: authError?.message,
      });
    }

    // 2. Create the profile row in the public.profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.trim(),
        role: role,
        full_name: full_name.trim(),
      })
      .select()
      .single();

    if (profileError) {
      // Clean up created auth user if profile insert fails to prevent orphaned auth accounts
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to create public user profile.',
        details: profileError.message,
      });
    }

    return res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: profile.role,
        full_name: profile.full_name,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete user registration.',
      details: err.message,
    });
  }
});

/**
 * @route PATCH /api/users/:id/role
 * @desc Update user role in profiles table and Supabase auth metadata (SUPER_ADMIN only)
 */
router.patch('/users/:id/role', requireAuth, authorizeRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['QUARRY_OPERATOR', 'UNLOAD_OPERATOR', 'SUPER_ADMIN'].includes(role)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid role value. Must be QUARRY_OPERATOR, UNLOAD_OPERATOR, or SUPER_ADMIN.',
    });
  }

  try {
    // 1. Update the profile role in the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (profileError) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to update user profile role in the database.',
        details: profileError.message,
      });
    }

    // 2. Also update auth user metadata & app metadata so that the JWT reflects it
    const { error: authError } = await supabase.auth.admin.updateUserById(id as string, {
      app_metadata: { role },
      user_metadata: { role }
    });

    if (authError) {
      console.error('Error updating auth metadata for user:', authError);
    }

    return res.json({
      message: `Successfully updated user role to ${role}`,
      profile,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during user role update.',
      details: err.message,
    });
  }
});


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
