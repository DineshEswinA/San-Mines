import { Request, Response, NextFunction } from 'express';
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

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired access token.',
        details: userError?.message,
      });
    }

    const decoded = user;

    // Resolve user role prioritizing app_metadata role claims, falling back to general role
    let role =
      decoded.app_metadata?.role ||
      decoded.role ||
      decoded.user_metadata?.role ||
      'authenticated';

    // If role resolves to default 'authenticated', query profiles table for custom role
    if (role === 'authenticated') {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', decoded.id)
        .single();

      if (profileError) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Unable to verify user role. Please retry in a moment.',
        });
      }

      if (profileData?.role) {
        role = profileData.role;
      }
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role
      // ...decoded,
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
