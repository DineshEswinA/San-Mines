import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Logger } from '../utils/logger';

// Augment Express Request interface to hold custom request id and logger properties
declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
    }
  }
}

/**
 * Middleware to assign a unique Request ID to each incoming request.
 * It reads the 'x-request-id' header from the client or generates a new UUID.
 * The request ID is attached to the Request object and the response headers.
 * Additionally, a request-scoped logger is attached to 'req.log' which
 * automatically tags all log statements with this request ID.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Read request ID from header or generate a new one
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  // Attach to request
  req.id = requestId;
  req.log = new Logger({ requestId });

  // Set response header
  res.setHeader('x-request-id', requestId);

  next();
}

/**
 * Middleware to trace and log details of all incoming requests and completed responses.
 * Timing is measured with high precision using process.hrtime().
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  const { method, originalUrl } = req;
  const userAgent = req.headers['user-agent'] || '';

  // Extract client IP safely (handling proxies via x-forwarded-for)
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';

  // Log incoming request as debug/verbose
  req.log.debug(`--> ${method} ${originalUrl}`, {
    ip: clientIp,
    userAgent,
    contentLength: req.headers['content-length'] ? parseInt(req.headers['content-length'] as string, 10) : undefined,
  });

  let logged = false;

  const logResponse = () => {
    if (logged) return;
    logged = true;

    // Remove event listeners
    res.removeListener('finish', logResponse);
    res.removeListener('close', logResponse);

    // Calculate response latency
    const diff = process.hrtime(start);
    const durationMs = diff[0] * 1e3 + diff[1] * 1e-6;
    const durationStr = durationMs.toFixed(2);

    const statusCode = res.statusCode;
    const contentLength = res.getHeader('content-length') || '0';

    // Safely fetch user context if it was populated by auth middleware
    const userMeta = req.user
      ? {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        }
      : undefined;

    const message = `<-- ${method} ${originalUrl} ${statusCode} - ${durationStr}ms`;
    const meta = {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: parseFloat(durationStr),
      contentLength: parseInt(contentLength as string, 10),
      ip: clientIp,
      userAgent,
      user: userMeta,
    };

    // Log with appropriate level based on HTTP status code
    if (statusCode >= 500) {
      req.log.error(message, meta);
    } else if (statusCode >= 400) {
      req.log.warn(message, meta);
    } else {
      req.log.info(message, meta);
    }
  };

  // Attach to finish (completed response) or close (aborted request)
  res.on('finish', logResponse);
  res.on('close', logResponse);

  next();
}
