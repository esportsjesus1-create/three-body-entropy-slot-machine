/**
 * Audit Trail Logger Implementation
 * 
 * Provides comprehensive audit logging functionality for tracking
 * all critical game events for compliance and dispute resolution.
 */

import { createHmac, randomUUID } from 'crypto';
import {
  AuditLog,
  AuditLogMetadata,
  AuditLogFilters,
  AuditLogQueryResult,
  AuditTrailConfig,
  AuditLogRepository
} from './types';

/**
 * Default configuration for the audit trail module.
 */
const DEFAULT_CONFIG: AuditTrailConfig = {
  enableSignatures: false,
  signatureSecret: '',
  defaultQueryLimit: 100,
  maxQueryLimit: 1000,
  consoleLogging: process.env.NODE_ENV === 'development'
};

/**
 * In-memory storage for audit logs (used when Prisma is not available).
 * In production, this should be replaced with Prisma client.
 */
let inMemoryLogs: AuditLog[] = [];

/**
 * Current configuration for the audit trail module.
 */
let currentConfig: AuditTrailConfig = { ...DEFAULT_CONFIG };

/**
 * External repository for audit logs (Prisma client).
 * When set, all operations will use this repository instead of in-memory storage.
 */
let externalRepository: AuditLogRepository | null = null;

/**
 * Configure the audit trail module.
 * 
 * @param config - Configuration options
 */
export function configure(config: Partial<AuditTrailConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Set an external repository for audit logs.
 * This allows integration with Prisma or other database clients.
 * 
 * @param repository - The repository to use for audit log operations
 */
export function setRepository(repository: AuditLogRepository): void {
  externalRepository = repository;
}

/**
 * Clear the external repository (useful for testing).
 */
export function clearRepository(): void {
  externalRepository = null;
}

/**
 * Generate a cryptographic signature for an audit log entry.
 * 
 * @param log - The audit log entry to sign
 * @returns The signature as a hex string
 */
function generateSignature(log: Omit<AuditLog, 'id' | 'signature'>): string {
  if (!currentConfig.signatureSecret) {
    throw new Error('Signature secret is not configured');
  }

  const dataToSign = JSON.stringify({
    timestamp: log.timestamp.toISOString(),
    eventType: log.eventType,
    userId: log.userId,
    sessionId: log.sessionId,
    ipAddress: log.ipAddress,
    data: log.data
  });

  const hmac = createHmac('sha256', currentConfig.signatureSecret);
  hmac.update(dataToSign);
  return hmac.digest('hex');
}

/**
 * Verify the signature of an audit log entry.
 * 
 * @param log - The audit log entry to verify
 * @returns True if the signature is valid, false otherwise
 */
export function verifySignature(log: AuditLog): boolean {
  if (!log.signature) {
    return false;
  }

  if (!currentConfig.signatureSecret) {
    throw new Error('Signature secret is not configured');
  }

  const expectedSignature = generateSignature({
    timestamp: log.timestamp,
    eventType: log.eventType,
    userId: log.userId,
    sessionId: log.sessionId,
    ipAddress: log.ipAddress,
    data: log.data
  });

  return log.signature === expectedSignature;
}

/**
 * Log an event to the audit trail.
 * 
 * @param eventType - The type of event being logged
 * @param data - Event-specific data payload
 * @param metadata - Optional metadata (userId, sessionId, ipAddress, signature)
 * @returns The created audit log entry
 */
export async function logEvent(
  eventType: string,
  data: Record<string, unknown>,
  metadata?: AuditLogMetadata
): Promise<AuditLog> {
  const timestamp = new Date();
  
  const logEntry: Omit<AuditLog, 'id'> = {
    timestamp,
    eventType,
    userId: metadata?.userId,
    sessionId: metadata?.sessionId,
    ipAddress: metadata?.ipAddress,
    data,
    signature: metadata?.signature
  };

  // Generate signature if enabled and not already provided
  if (currentConfig.enableSignatures && !logEntry.signature) {
    logEntry.signature = generateSignature(logEntry);
  }

  // Log to console in development mode
  if (currentConfig.consoleLogging) {
    console.log(`[AUDIT] ${eventType}:`, {
      timestamp: timestamp.toISOString(),
      sessionId: metadata?.sessionId,
      data
    });
  }

  // Use external repository if available
  if (externalRepository) {
    return externalRepository.create(logEntry);
  }

  // Fall back to in-memory storage
  const auditLog: AuditLog = {
    id: randomUUID(),
    ...logEntry
  };

  inMemoryLogs.push(auditLog);
  return auditLog;
}

/**
 * Query audit logs with filters.
 * 
 * @param filters - Filters to apply to the query
 * @returns Array of matching audit logs
 */
export async function queryLogs(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
  // Use external repository if available
  if (externalRepository) {
    return externalRepository.findMany(filters);
  }

  // Fall back to in-memory filtering
  let results = [...inMemoryLogs];

  if (filters.sessionId) {
    results = results.filter(log => log.sessionId === filters.sessionId);
  }

  if (filters.eventType) {
    results = results.filter(log => log.eventType === filters.eventType);
  }

  if (filters.userId) {
    results = results.filter(log => log.userId === filters.userId);
  }

  if (filters.startDate) {
    results = results.filter(log => log.timestamp >= filters.startDate!);
  }

  if (filters.endDate) {
    results = results.filter(log => log.timestamp <= filters.endDate!);
  }

  // Sort by timestamp descending
  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  const offset = filters.offset || 0;
  const limit = Math.min(
    filters.limit || currentConfig.defaultQueryLimit!,
    currentConfig.maxQueryLimit!
  );

  return results.slice(offset, offset + limit);
}

/**
 * Query audit logs with pagination information.
 * 
 * @param filters - Filters to apply to the query
 * @returns Query result with logs, total count, and pagination info
 */
export async function queryLogsWithPagination(
  filters: AuditLogFilters = {}
): Promise<AuditLogQueryResult> {
  // Use external repository if available
  if (externalRepository) {
    const logs = await externalRepository.findMany(filters);
    const totalCount = await externalRepository.count({
      sessionId: filters.sessionId,
      eventType: filters.eventType,
      userId: filters.userId,
      startDate: filters.startDate,
      endDate: filters.endDate
    });

    const limit = Math.min(
      filters.limit || currentConfig.defaultQueryLimit!,
      currentConfig.maxQueryLimit!
    );
    const offset = filters.offset || 0;

    return {
      logs,
      totalCount,
      hasMore: offset + logs.length < totalCount
    };
  }

  // Fall back to in-memory implementation
  let allResults = [...inMemoryLogs];

  if (filters.sessionId) {
    allResults = allResults.filter(log => log.sessionId === filters.sessionId);
  }

  if (filters.eventType) {
    allResults = allResults.filter(log => log.eventType === filters.eventType);
  }

  if (filters.userId) {
    allResults = allResults.filter(log => log.userId === filters.userId);
  }

  if (filters.startDate) {
    allResults = allResults.filter(log => log.timestamp >= filters.startDate!);
  }

  if (filters.endDate) {
    allResults = allResults.filter(log => log.timestamp <= filters.endDate!);
  }

  // Sort by timestamp descending
  allResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const totalCount = allResults.length;
  const offset = filters.offset || 0;
  const limit = Math.min(
    filters.limit || currentConfig.defaultQueryLimit!,
    currentConfig.maxQueryLimit!
  );

  const logs = allResults.slice(offset, offset + limit);

  return {
    logs,
    totalCount,
    hasMore: offset + logs.length < totalCount
  };
}

/**
 * Get a single audit log by ID.
 * 
 * @param id - The ID of the audit log to retrieve
 * @returns The audit log entry or null if not found
 */
export async function getLogById(id: string): Promise<AuditLog | null> {
  if (externalRepository) {
    return externalRepository.findById(id);
  }

  return inMemoryLogs.find(log => log.id === id) || null;
}

/**
 * Delete audit logs older than a given date.
 * Useful for implementing data retention policies.
 * 
 * @param date - Delete logs older than this date
 * @returns Number of logs deleted
 */
export async function deleteLogsOlderThan(date: Date): Promise<number> {
  if (externalRepository) {
    return externalRepository.deleteOlderThan(date);
  }

  const initialCount = inMemoryLogs.length;
  inMemoryLogs = inMemoryLogs.filter(log => log.timestamp >= date);
  return initialCount - inMemoryLogs.length;
}

/**
 * Get the total count of audit logs.
 * 
 * @param filters - Optional filters to apply
 * @returns Total count of matching logs
 */
export async function getLogCount(
  filters: Omit<AuditLogFilters, 'limit' | 'offset'> = {}
): Promise<number> {
  if (externalRepository) {
    return externalRepository.count(filters);
  }

  let results = [...inMemoryLogs];

  if (filters.sessionId) {
    results = results.filter(log => log.sessionId === filters.sessionId);
  }

  if (filters.eventType) {
    results = results.filter(log => log.eventType === filters.eventType);
  }

  if (filters.userId) {
    results = results.filter(log => log.userId === filters.userId);
  }

  if (filters.startDate) {
    results = results.filter(log => log.timestamp >= filters.startDate!);
  }

  if (filters.endDate) {
    results = results.filter(log => log.timestamp <= filters.endDate!);
  }

  return results.length;
}

/**
 * Clear all in-memory logs.
 * Only works when using in-memory storage (not with external repository).
 * Useful for testing.
 */
export function clearInMemoryLogs(): void {
  inMemoryLogs = [];
}

/**
 * Get all in-memory logs.
 * Only works when using in-memory storage (not with external repository).
 * Useful for testing.
 */
export function getInMemoryLogs(): AuditLog[] {
  return [...inMemoryLogs];
}

/**
 * Reset the module to its initial state.
 * Useful for testing.
 */
export function reset(): void {
  inMemoryLogs = [];
  currentConfig = { ...DEFAULT_CONFIG };
  externalRepository = null;
}
