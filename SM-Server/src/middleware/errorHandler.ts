import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Global Express error handling middleware.
 * Catches all unhandled exceptions thrown in route handlers, logs them with the
 * request correlation ID, and returns a sanitized JSON error response to the client.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const isProduction = process.env.NODE_ENV === 'production';

  // Use request-scoped logger if available, else fallback to global logger
  const logInstance = req.log || logger;

  // Log error with request ID and metadata
  logInstance.error(`Unhandled error during request: ${message}`, {
    error: err,
    url: req.originalUrl,
    method: req.method,
  });

  // If headers have already been sent, hand off to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Standardized error JSON structure
  const responsePayload: any = {
    error: statusCode >= 500 ? 'Internal Server Error' : (err.name || 'Request Error'),
    message: statusCode >= 500 && isProduction
      ? 'An unexpected error occurred on the server.'
      : message,
    requestId: req.id || undefined,
  };

  // Include debugging context in non-production environments
  if (!isProduction) {
    responsePayload.details = err.details || undefined;
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
}
