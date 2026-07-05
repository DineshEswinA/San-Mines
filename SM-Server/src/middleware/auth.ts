import { Request, Response, NextFunction } from 'express';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

// Augment Express Request interface globally to attach user info to requests cleanly
declare global {
  namespace Express {
    interface Request {
      user?: User & { role?: string };
    }
  }
}

/**
 * Authentication middleware that extracts a Bearer JWT token from the Authorization header,
 * verifies it using Supabase Auth, and attaches the user information to the request object.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Format: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Local offline mock tokens for testing and verification
    if (token === 'mock-quarry-operator') {
      req.user = {
        id: 'c0000000-0000-0000-0000-000000000001',
        email: 'quarry@qtrack.com',
        role: 'QUARRY_OPERATOR',
        app_metadata: { role: 'QUARRY_OPERATOR' },
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };
      return next();
    }

    if (token === 'mock-unload-operator') {
      req.user = {
        id: 'c0000000-0000-0000-0000-000000000002',
        email: 'unload@qtrack.com',
        role: 'UNLOAD_OPERATOR',
        app_metadata: { role: 'UNLOAD_OPERATOR' },
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };
      return next();
    }

    // Retrieve user profile based on JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired access token.',
      });
    }

    // Resolve user role prioritizing app_metadata role claims, falling back to general role
    const role = (user.app_metadata?.role as string) || user.role || (user.user_metadata?.role as string) || 'authenticated';

    req.user = {
      ...user,
      role,
    };

    return next();
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during authentication verification.',
      details: err.message,
    });
  }
}

/**
 * Secondary middleware to reject requests with a 403 Forbidden error
 * if the authenticated user's role does not match the list of allowed roles.
 *
 * @param allowedRoles Array of roles authorized to access the route.
 */
export function authorizeRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication info missing from request.',
      });
    }

    const userRole = req.user.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${userRole || 'none'}`,
      });
    }

    return next();
  };
}
