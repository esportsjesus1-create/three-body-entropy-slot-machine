/**
 * Audit Trail Module Types
 * 
 * Defines the core data structures for comprehensive audit logging
 * of game events for compliance and dispute resolution.
 */

/**
 * Event types for audit logging.
 */
export type AuditEventType = 
  | 'COMMITMENT_CREATED'
  | 'COMMITMENT_REVEALED'
  | 'SPIN_EXECUTED'
  | 'SPIN_VERIFIED'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'ERROR_OCCURRED'
  | 'VERIFICATION_FAILED'
  | 'PAYOUT_CALCULATED'
  | 'CUSTOM';

/**
 * Represents a single audit log entry.
 */
export interface AuditLog {
  /** Unique identifier for the log entry */
  id: string;
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Type of event being logged */
  eventType: string;
  /** User ID associated with the event (optional) */
  userId?: string;
  /** Session ID associated with the event (optional) */
  sessionId?: string;
  /** IP address of the client (optional) */
  ipAddress?: string;
  /** Event-specific data payload */
  data: Record<string, unknown>;
  /** Cryptographic signature for integrity verification (optional) */
  signature?: string;
}

/**
 * Input data for creating a new audit log entry.
 */
export interface AuditLogInput {
  /** Type of event being logged */
  eventType: string;
  /** Event-specific data payload */
  data: Record<string, unknown>;
  /** Optional metadata for the log entry */
  metadata?: AuditLogMetadata;
}

/**
 * Metadata for audit log entries.
 */
export interface AuditLogMetadata {
  /** User ID associated with the event */
  userId?: string;
  /** Session ID associated with the event */
  sessionId?: string;
  /** IP address of the client */
  ipAddress?: string;
  /** Cryptographic signature for integrity verification */
  signature?: string;
}

/**
 * Filters for querying audit logs.
 */
export interface AuditLogFilters {
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by event type */
  eventType?: string;
  /** Filter by user ID */
  userId?: string;
  /** Filter events after this date */
  startDate?: Date;
  /** Filter events before this date */
  endDate?: Date;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
}

/**
 * Result of a query operation.
 */
export interface AuditLogQueryResult {
  /** Array of matching audit logs */
  logs: AuditLog[];
  /** Total count of matching logs (before pagination) */
  totalCount: number;
  /** Whether there are more results available */
  hasMore: boolean;
}

/**
 * Configuration options for the audit trail module.
 */
export interface AuditTrailConfig {
  /** Whether to enable signature generation */
  enableSignatures?: boolean;
  /** Secret key for signature generation */
  signatureSecret?: string;
  /** Default limit for query results */
  defaultQueryLimit?: number;
  /** Maximum limit for query results */
  maxQueryLimit?: number;
  /** Whether to log to console in development */
  consoleLogging?: boolean;
}

/**
 * Commitment event data structure.
 */
export interface CommitmentEventData {
  /** The commitment hash */
  commitmentHash: string;
  /** Session ID for the commitment */
  sessionId: string;
  /** Timestamp of commitment creation */
  timestamp: number;
  /** Optional nonce used */
  nonce?: string;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * Reveal event data structure.
 */
export interface RevealEventData {
  /** The server seed that was revealed */
  serverSeed: string;
  /** The commitment hash being revealed */
  commitmentHash: string;
  /** Session ID for the reveal */
  sessionId: string;
  /** Client seed used */
  clientSeed: string;
  /** Nonce value */
  nonce: number | string;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * Spin event data structure.
 */
export interface SpinEventData {
  /** Session ID for the spin */
  sessionId: string;
  /** Spin number within the session */
  spinNumber: number;
  /** Bet amount */
  betAmount: number;
  /** Result symbols */
  symbols: string[];
  /** Payout amount */
  payout: number;
  /** Combined hash used for result */
  combinedHash: string;
  /** Whether the spin was verified */
  verified: boolean;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * Verification event data structure.
 */
export interface VerificationEventData {
  /** Session ID for the verification */
  sessionId: string;
  /** Commitment hash being verified */
  commitmentHash: string;
  /** Server seed revealed */
  serverSeed: string;
  /** Client seed used */
  clientSeed: string;
  /** Nonce value */
  nonce: number | string;
  /** Whether verification passed */
  verified: boolean;
  /** Error message if verification failed */
  error?: string;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * Error event data structure.
 */
export interface ErrorEventData {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Stack trace (if available) */
  stack?: string;
  /** Context where error occurred */
  context?: Record<string, unknown>;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * Prisma client interface for audit log operations.
 * This interface allows for dependency injection and testing.
 */
export interface AuditLogRepository {
  /** Create a new audit log entry */
  create(data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
  /** Find many audit logs with filters */
  findMany(filters: AuditLogFilters): Promise<AuditLog[]>;
  /** Count audit logs matching filters */
  count(filters: Omit<AuditLogFilters, 'limit' | 'offset'>): Promise<number>;
  /** Find a single audit log by ID */
  findById(id: string): Promise<AuditLog | null>;
  /** Delete audit logs older than a given date */
  deleteOlderThan(date: Date): Promise<number>;
}
