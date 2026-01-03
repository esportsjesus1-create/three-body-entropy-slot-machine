/**
 * Next.js Integration for Audit Trail Module
 * 
 * Provides helper functions for integrating audit logging
 * with Next.js App Router API routes.
 */

import { logEvent } from '../logger';
import { AuditLogMetadata } from '../types';

/**
 * Extract metadata from a Next.js Request object.
 * 
 * @param req - Next.js Request object
 * @returns Metadata object for audit logging
 */
export function extractMetadataFromRequest(req: Request): AuditLogMetadata {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId') || undefined;
  
  return {
    sessionId,
    ipAddress: getClientIpFromRequest(req)
  };
}

/**
 * Get the client IP address from a Next.js Request.
 * Handles proxied requests (X-Forwarded-For header).
 * 
 * @param req - Next.js Request object
 * @returns Client IP address or undefined
 */
export function getClientIpFromRequest(req: Request): string | undefined {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || undefined;
}

/**
 * Log a commitment creation event from a Next.js API route.
 * 
 * @param req - Next.js Request object
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
      ipAddress: getClientIpFromRequest(req)
    }
  );
}

/**
 * Log a commitment reveal event from a Next.js API route.
 * 
 * @param req - Next.js Request object
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
      ipAddress: getClientIpFromRequest(req)
    }
  );
}

/**
 * Log a spin execution event from a Next.js API route.
 * 
 * @param req - Next.js Request object
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
      ipAddress: getClientIpFromRequest(req)
    }
  );
}

/**
 * Log a spin verification event from a Next.js API route.
 * 
 * @param req - Next.js Request object
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
      ipAddress: getClientIpFromRequest(req)
    }
  );
}

/**
 * Log an error event from a Next.js API route.
 * 
 * @param req - Next.js Request object
 * @param error - Error object
 * @param context - Additional context
 */
export async function logError(
  req: Request,
  error: Error,
  context?: Record<string, unknown>
): Promise<void> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId') || undefined;

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
      sessionId,
      ipAddress: getClientIpFromRequest(req)
    }
  );
}

/**
 * Example usage in a Next.js API route:
 * 
 * ```typescript
 * // app/api/slots/commit/route.ts
 * import { NextResponse } from 'next/server';
 * import { logCommitmentCreated } from '@/modules/audit-trail/integrations/nextjs';
 * 
 * export async function POST(req: Request) {
 *   try {
 *     // ... create commitment logic ...
 *     const { commitmentHash, sessionId } = await createCommitment();
 *     
 *     // Log the event
 *     await logCommitmentCreated(req, commitmentHash, sessionId);
 *     
 *     return NextResponse.json({ commitmentHash, sessionId });
 *   } catch (error) {
 *     await logError(req, error as Error);
 *     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 *   }
 * }
 * ```
 */
