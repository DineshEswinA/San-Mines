import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

// Augment Express Request interface globally to attach user info to requests cleanly
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Authentication middleware that extracts a Bearer JWT token from the Authorization header,
 * verifies/decodes it using jsonwebtoken, and attaches the user information to the request object.
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

  // Local offline mock tokens for testing and verification
  if (token === 'mock-quarry-operator') {
    req.user = {
      id: 'c0000000-0000-0000-0000-000000000001',
      email: 'quarry@sammines.com',
      role: 'QUARRY_OPERATOR',
    };
    return next();
  }

  if (token === 'mock-unload-operator') {
    req.user = {
      id: 'c0000000-0000-0000-0000-000000000002',
      email: 'unload@sammines.com',
      role: 'UNLOAD_OPERATOR',
    };
    return next();
  }

  try {
    const secret = process.env.SUPABASE_JWT_SECRET || 'your-supabase-jwt-secret';
    let decoded: any;

    try {
      decoded = jwt.verify(token, secret);
    } catch (verifyError) {
      // Fallback: decode without signature verification if in development mode or if secret isn't set
      if (process.env.NODE_ENV === 'development' || !process.env.SUPABASE_JWT_SECRET) {
        decoded = jwt.decode(token);
        if (!decoded) {
          throw new Error('Invalid JWT token format and signature could not be verified.');
        }
      } else {
        throw verifyError;
      }
    }

    if (!decoded || typeof decoded === 'string') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired access token.',
      });
    }

    // Resolve user role prioritizing app_metadata role claims, falling back to general role
    let role =
      decoded.app_metadata?.role ||
      decoded.role ||
      decoded.user_metadata?.role ||
      'authenticated';

    // If role resolves to default 'authenticated', query profiles table for custom role
    if (role === 'authenticated') {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', decoded.sub || decoded.id)
          .single();
        if (profileData && profileData.role) {
          role = profileData.role;
        }
      } catch (err) {
        console.error('Error fetching role from profiles table:', err);
      }
    }

    req.user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      role,
      ...decoded,
    };

    return next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token verification failed.',
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
