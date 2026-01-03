/**
 * Express Integration for Audit Trail Module
 * 
 * Provides middleware and helper functions for integrating
 * audit logging with Express.js applications.
 */

import { Request, Response, NextFunction } from 'express';
import { logEvent } from '../logger';
import { AuditLogMetadata } from '../types';

/**
 * Extract metadata from an Express request.
 * 
 * @param req - Express request object
 * @returns Metadata object for audit logging
 */
export function extractMetadata(req: Request): AuditLogMetadata {
  return {
    userId: (req as Request & { user?: { id?: string } }).user?.id,
    sessionId: req.body?.sessionId || req.params?.sessionId,
    ipAddress: getClientIp(req)
  };
}

/**
 * Get the client IP address from an Express request.
 * Handles proxied requests (X-Forwarded-For header).
 * 
 * @param req - Express request object
 * @returns Client IP address
 */
export function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0];
    return ips.trim();
  }
  return req.ip || req.socket?.remoteAddress;
}

/**
 * Middleware to automatically log API requests.
 * 
 * @param eventType - The event type to log
 * @returns Express middleware function
 */
export function auditMiddleware(eventType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const metadata = extractMetadata(req);

    // Log after response is finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Log the event asynchronously (don't block response)
      logEvent(eventType, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        requestBody: sanitizeRequestBody(req.body)
      }, metadata).catch(err => {
        console.error('Failed to log audit event:', err);
      });
    });

    next();
  };
}

/**
 * Sanitize request body to remove sensitive data.
 * 
 * @param body - Request body object
 * @returns Sanitized body object
 */
function sanitizeRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Log a commitment creation event.
 * 
 * @param req - Express request object
 * @param commitmentHash - The commitment hash
 * @param sessionId - The session ID
 */
export async function logCommitmentCreated(
  req: Request,
  commitmentHash: string,
  sessionId: string
): Promise<void> {
  await logEvent(
    'COMMITMENT_CREATED',
    {
      commitmentHash,
      sessionId,
      timestamp: Date.now()
    },
    {
      sessionId,
      ipAddress: getClientIp(req)
    }
  );
}

/**
 * Log a commitment reveal event.
 * 
 * @param req - Express request object
 * @param data - Reveal data
 */
export async function logCommitmentRevealed(
  req: Request,
  data: {
    sessionId: string;
    serverSeed: string;
    commitmentHash: string;
    clientSeed: string;
    nonce: number | string;
  }
): Promise<void> {
  await logEvent(
    'COMMITMENT_REVEALED',
    {
      ...data,
      timestamp: Date.now()
    },
    {
      sessionId: data.sessionId,
      ipAddress: getClientIp(req)
    }
  );
}

/**
 * Log a spin execution event.
 * 
 * @param req - Express request object
 * @param data - Spin data
 */
export async function logSpinExecuted(
  req: Request,
  data: {
    sessionId: string;
    spinNumber: number;
    betAmount: number;
    symbols: string[];
    payout: number;
    combinedHash: string;
  }
): Promise<void> {
  await logEvent(
    'SPIN_EXECUTED',
    {
      ...data,
      verified: false,
      timestamp: Date.now()
    },
    {
      sessionId: data.sessionId,
      ipAddress: getClientIp(req)
    }
  );
}

/**
 * Log a spin verification event.
 * 
 * @param req - Express request object
 * @param data - Verification data
 */
export async function logSpinVerified(
  req: Request,
  data: {
    sessionId: string;
    commitmentHash: string;
    serverSeed: string;
    clientSeed: string;
    nonce: number | string;
    verified: boolean;
    error?: string;
  }
): Promise<void> {
  await logEvent(
    'SPIN_VERIFIED',
    {
      ...data,
      timestamp: Date.now()
    },
    {
      sessionId: data.sessionId,
      ipAddress: getClientIp(req)
    }
  );
}

/**
 * Log an error event.
 * 
 * @param req - Express request object
 * @param error - Error object
 * @param context - Additional context
 */
export async function logError(
  req: Request,
  error: Error,
  context?: Record<string, unknown>
): Promise<void> {
  await logEvent(
    'ERROR_OCCURRED',
    {
      code: (error as Error & { code?: string }).code || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    },
    {
      sessionId: req.body?.sessionId || req.params?.sessionId,
      ipAddress: getClientIp(req)
    }
  );
}
