/**
 * Audit Query API Route Example
 * 
 * This file provides example implementations for audit query API routes
 * that can be used with Next.js App Router or Express.js.
 * 
 * For Next.js, copy this to: /app/api/audit/route.ts
 * For Express, use the Express router example below.
 */

import { queryLogs, queryLogsWithPagination, getLogById } from '../logger';
import { AuditLogFilters } from '../types';

/**
 * Parse query parameters into AuditLogFilters.
 * 
 * @param searchParams - URL search parameters
 * @returns Parsed filters object
 */
export function parseQueryFilters(searchParams: URLSearchParams): AuditLogFilters {
  const filters: AuditLogFilters = {};

  const sessionId = searchParams.get('sessionId');
  if (sessionId) filters.sessionId = sessionId;

  const eventType = searchParams.get('eventType');
  if (eventType) filters.eventType = eventType;

  const userId = searchParams.get('userId');
  if (userId) filters.userId = userId;

  const startDate = searchParams.get('startDate');
  if (startDate) filters.startDate = new Date(startDate);

  const endDate = searchParams.get('endDate');
  if (endDate) filters.endDate = new Date(endDate);

  const limit = searchParams.get('limit');
  if (limit) filters.limit = Math.min(parseInt(limit, 10), 1000);

  const offset = searchParams.get('offset');
  if (offset) filters.offset = parseInt(offset, 10);

  return filters;
}

/**
 * Next.js App Router GET handler for querying audit logs.
 * 
 * Usage: Copy to /app/api/audit/route.ts
 * 
 * Query Parameters:
 * - sessionId: Filter by session ID
 * - eventType: Filter by event type
 * - userId: Filter by user ID
 * - startDate: Filter events after this date (ISO format)
 * - endDate: Filter events before this date (ISO format)
 * - limit: Maximum number of results (default: 100, max: 1000)
 * - offset: Number of results to skip (for pagination)
 * 
 * @example
 * GET /api/audit?sessionId=abc123&limit=50
 * GET /api/audit?eventType=SPIN_EXECUTED&startDate=2024-01-01
 */
export async function handleGetAuditLogs(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const filters = parseQueryFilters(searchParams);

    const result = await queryLogsWithPagination(filters);

    return new Response(JSON.stringify({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          limit: filters.limit || 100,
          offset: filters.offset || 0
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Audit query error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to query audit logs'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Next.js App Router GET handler for retrieving a single audit log by ID.
 * 
 * Usage: Copy to /app/api/audit/[id]/route.ts
 * 
 * @example
 * GET /api/audit/abc123-def456
 */
export async function handleGetAuditLogById(
  req: Request,
  params: { id: string }
): Promise<Response> {
  try {
    const log = await getLogById(params.id);

    if (!log) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Not Found',
        message: 'Audit log not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: log
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Audit log retrieval error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve audit log'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Example Next.js App Router route file content:
 * 
 * ```typescript
 * // app/api/audit/route.ts
 * import { NextResponse } from 'next/server';
 * import { handleGetAuditLogs } from '@/modules/audit-trail/api/audit-route';
 * 
 * export async function GET(req: Request) {
 *   return handleGetAuditLogs(req);
 * }
 * ```
 * 
 * ```typescript
 * // app/api/audit/[id]/route.ts
 * import { NextResponse } from 'next/server';
 * import { handleGetAuditLogById } from '@/modules/audit-trail/api/audit-route';
 * 
 * export async function GET(
 *   req: Request,
 *   { params }: { params: { id: string } }
 * ) {
 *   return handleGetAuditLogById(req, params);
 * }
 * ```
 */

/**
 * Express.js router example:
 * 
 * ```javascript
 * // routes/audit.js
 * import { Router } from 'express';
 * import { queryLogsWithPagination, getLogById } from '@three-body-entropy/audit-trail';
 * 
 * const router = Router();
 * 
 * router.get('/', async (req, res) => {
 *   try {
 *     const filters = {
 *       sessionId: req.query.sessionId,
 *       eventType: req.query.eventType,
 *       userId: req.query.userId,
 *       startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
 *       endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
 *       limit: Math.min(parseInt(req.query.limit) || 100, 1000),
 *       offset: parseInt(req.query.offset) || 0
 *     };
 * 
 *     const result = await queryLogsWithPagination(filters);
 * 
 *     res.json({
 *       success: true,
 *       data: {
 *         logs: result.logs,
 *         pagination: {
 *           totalCount: result.totalCount,
 *           hasMore: result.hasMore,
 *           limit: filters.limit,
 *           offset: filters.offset
 *         }
 *       }
 *     });
 *   } catch (error) {
 *     console.error('Audit query error:', error);
 *     res.status(500).json({
 *       success: false,
 *       error: 'Internal Server Error',
 *       message: 'Failed to query audit logs'
 *     });
 *   }
 * });
 * 
 * router.get('/:id', async (req, res) => {
 *   try {
 *     const log = await getLogById(req.params.id);
 * 
 *     if (!log) {
 *       return res.status(404).json({
 *         success: false,
 *         error: 'Not Found',
 *         message: 'Audit log not found'
 *       });
 *     }
 * 
 *     res.json({
 *       success: true,
 *       data: log
 *     });
 *   } catch (error) {
 *     console.error('Audit log retrieval error:', error);
 *     res.status(500).json({
 *       success: false,
 *       error: 'Internal Server Error',
 *       message: 'Failed to retrieve audit log'
 *     });
 *   }
 * });
 * 
 * export default router;
 * ```
 */
