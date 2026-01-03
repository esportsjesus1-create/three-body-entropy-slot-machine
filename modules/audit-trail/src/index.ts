/**
 * Audit Trail Module
 * 
 * Provides comprehensive audit logging functionality for tracking
 * all critical game events for compliance and dispute resolution.
 * 
 * @packageDocumentation
 */

// Export types
export {
  AuditEventType,
  AuditLog,
  AuditLogInput,
  AuditLogMetadata,
  AuditLogFilters,
  AuditLogQueryResult,
  AuditTrailConfig,
  AuditLogRepository,
  CommitmentEventData,
  RevealEventData,
  SpinEventData,
  VerificationEventData,
  ErrorEventData
} from './types';

// Export logger functions
export {
  configure,
  setRepository,
  clearRepository,
  logEvent,
  queryLogs,
  queryLogsWithPagination,
  getLogById,
  deleteLogsOlderThan,
  getLogCount,
  verifySignature,
  clearInMemoryLogs,
  getInMemoryLogs,
  reset
} from './logger';

// Export integrations
export * as integrations from './integrations';
