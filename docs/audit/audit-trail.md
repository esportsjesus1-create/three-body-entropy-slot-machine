# Audit Trail Documentation

This document provides comprehensive documentation for the Audit Trail module, including what events are logged, data retention policies, how to query audit logs, and compliance considerations.

## Table of Contents

1. [Overview](#overview)
2. [Events Logged](#events-logged)
3. [Data Structure](#data-structure)
4. [Querying Audit Logs](#querying-audit-logs)
5. [Data Retention Policy](#data-retention-policy)
6. [Compliance Considerations](#compliance-considerations)
7. [Security](#security)
8. [Integration Guide](#integration-guide)

## Overview

The Audit Trail module provides comprehensive logging of all critical game events for compliance and dispute resolution purposes. Every commitment, reveal, spin, and verification is recorded with full context including timestamps, session IDs, user IDs, IP addresses, and event-specific data.

The module supports both in-memory storage for development/testing and Prisma-based persistence for production environments, ensuring flexibility across different deployment scenarios.

## Events Logged

### Critical Game Events

#### COMMITMENT_CREATED

Logged when a server commitment hash is generated for a new game round.

**Data Fields:**
- `commitmentHash`: The SHA-256 hash of the server seed
- `sessionId`: Unique identifier for the game session
- `timestamp`: Unix timestamp of commitment creation
- `nonce`: Optional nonce value used in commitment

**Example:**
```json
{
  "eventType": "COMMITMENT_CREATED",
  "data": {
    "commitmentHash": "a1b2c3d4e5f6...",
    "sessionId": "session-123",
    "timestamp": 1704067200000,
    "nonce": "random-nonce"
  }
}
```

#### COMMITMENT_REVEALED

Logged when the server seed is revealed to the client after a spin.

**Data Fields:**
- `serverSeed`: The original server seed
- `commitmentHash`: The commitment hash being revealed
- `sessionId`: Session identifier
- `clientSeed`: Client-provided seed
- `nonce`: Nonce value used

**Example:**
```json
{
  "eventType": "COMMITMENT_REVEALED",
  "data": {
    "serverSeed": "server-seed-value",
    "commitmentHash": "a1b2c3d4e5f6...",
    "sessionId": "session-123",
    "clientSeed": "client-seed-value",
    "nonce": 1
  }
}
```

#### SPIN_EXECUTED

Logged when a spin result is calculated.

**Data Fields:**
- `sessionId`: Session identifier
- `spinNumber`: Sequential spin number within session
- `betAmount`: Amount wagered
- `symbols`: Array of result symbols
- `payout`: Payout amount
- `combinedHash`: Hash used for result calculation
- `verified`: Whether the spin was verified

**Example:**
```json
{
  "eventType": "SPIN_EXECUTED",
  "data": {
    "sessionId": "session-123",
    "spinNumber": 1,
    "betAmount": 100,
    "symbols": ["cherry", "cherry", "cherry"],
    "payout": 500,
    "combinedHash": "combined-hash-value",
    "verified": false
  }
}
```

#### SPIN_VERIFIED

Logged when a spin result is verified.

**Data Fields:**
- `sessionId`: Session identifier
- `commitmentHash`: Commitment being verified
- `serverSeed`: Server seed revealed
- `clientSeed`: Client seed used
- `nonce`: Nonce value
- `verified`: Verification result (true/false)
- `error`: Error message if verification failed

**Example:**
```json
{
  "eventType": "SPIN_VERIFIED",
  "data": {
    "sessionId": "session-123",
    "commitmentHash": "a1b2c3d4e5f6...",
    "serverSeed": "server-seed-value",
    "clientSeed": "client-seed-value",
    "nonce": 1,
    "verified": true
  }
}
```

### Session Events

#### SESSION_STARTED

Logged when a new game session begins.

#### SESSION_ENDED

Logged when a game session ends.

### Error Events

#### ERROR_OCCURRED

Logged when an error occurs during processing.

**Data Fields:**
- `code`: Error code
- `message`: Error message
- `stack`: Stack trace (if available)
- `context`: Additional context information

#### VERIFICATION_FAILED

Logged when a verification check fails.

### Financial Events

#### PAYOUT_CALCULATED

Logged when a payout amount is calculated.

## Data Structure

### AuditLog Schema

```typescript
interface AuditLog {
  id: string;           // Unique identifier (CUID)
  timestamp: Date;      // Event timestamp
  eventType: string;    // Type of event
  userId?: string;      // User identifier (optional)
  sessionId?: string;   // Session identifier (optional)
  ipAddress?: string;   // Client IP address (optional)
  data: object;         // Event-specific data (JSON)
  signature?: string;   // Cryptographic signature (optional)
}
```

### Database Indexes

The following indexes are created for efficient querying:

1. **Composite Index**: `(timestamp, eventType)` - For time-range queries filtered by event type
2. **Session Index**: `(sessionId)` - For session-specific queries
3. **User Index**: `(userId)` - For user-specific queries

## Querying Audit Logs

### Query API

The audit trail provides a REST API for querying logs:

```
GET /api/audit?sessionId=xxx&eventType=xxx&startDate=xxx&endDate=xxx&limit=100&offset=0
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Filter by session ID |
| `eventType` | string | Filter by event type |
| `userId` | string | Filter by user ID |
| `startDate` | ISO date | Filter events after this date |
| `endDate` | ISO date | Filter events before this date |
| `limit` | number | Maximum results (default: 100, max: 1000) |
| `offset` | number | Results to skip (for pagination) |

### Response Format

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "clx1234567890",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "eventType": "SPIN_EXECUTED",
        "sessionId": "session-123",
        "data": { ... }
      }
    ],
    "pagination": {
      "totalCount": 1000,
      "hasMore": true,
      "limit": 100,
      "offset": 0
    }
  }
}
```

### Programmatic Queries

```typescript
import { queryLogs, queryLogsWithPagination } from '@three-body-entropy/audit-trail';

// Simple query
const logs = await queryLogs({
  sessionId: 'session-123',
  eventType: 'SPIN_EXECUTED'
});

// Query with pagination
const result = await queryLogsWithPagination({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limit: 50,
  offset: 100
});
```

## Data Retention Policy

### Recommended Retention Periods

| Data Category | Retention Period | Justification |
|---------------|------------------|---------------|
| Game Events | 7 years | Regulatory compliance |
| Session Data | 3 years | Dispute resolution |
| Error Logs | 1 year | Debugging and monitoring |
| IP Addresses | 90 days | Privacy regulations |

### Implementing Retention

```typescript
import { deleteLogsOlderThan } from '@three-body-entropy/audit-trail';

// Delete logs older than 7 years
const sevenYearsAgo = new Date();
sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

const deletedCount = await deleteLogsOlderThan(sevenYearsAgo);
console.log(`Deleted ${deletedCount} old audit logs`);
```

### Automated Retention Jobs

Set up a cron job to run retention cleanup:

```bash
# Run daily at 2 AM
0 2 * * * node /path/to/retention-script.js
```

## Compliance Considerations

### Gaming Regulations

The audit trail module is designed to support compliance with gaming regulations including:

1. **Provably Fair Gaming**: All commitment and reveal data is logged for verification
2. **Transaction Records**: Complete records of all bets and payouts
3. **Dispute Resolution**: Full session history available for dispute investigation
4. **Regulatory Audits**: Queryable logs for regulatory reporting

### Data Protection (GDPR/CCPA)

1. **Data Minimization**: Only necessary data is logged
2. **Right to Access**: Users can request their audit logs
3. **Right to Erasure**: Implement data deletion procedures
4. **Data Portability**: Export logs in standard formats

### Audit Requirements

For regulatory audits, the following reports can be generated:

1. **Session Report**: All events for a specific session
2. **User Report**: All events for a specific user
3. **Time Period Report**: All events within a date range
4. **Event Type Report**: All events of a specific type

## Security

### Cryptographic Signatures

Enable signatures to ensure log integrity:

```typescript
import { configure, verifySignature } from '@three-body-entropy/audit-trail';

configure({
  enableSignatures: true,
  signatureSecret: process.env.AUDIT_SECRET
});

// Verify a log entry
const isValid = verifySignature(log);
```

### Access Control

Implement proper access control for audit APIs:

1. **Authentication**: Require authentication for all audit queries
2. **Authorization**: Role-based access to audit data
3. **Rate Limiting**: Prevent abuse of audit APIs
4. **Audit of Audits**: Log access to audit data

### Data Encryption

Consider encrypting sensitive data:

1. **At Rest**: Use database encryption
2. **In Transit**: Use TLS for all API communications
3. **Field-Level**: Encrypt sensitive fields in the `data` object

## Integration Guide

### Express.js Integration

```typescript
import { integrations } from '@three-body-entropy/audit-trail';

const { logCommitmentCreated, logSpinExecuted, auditMiddleware } = integrations.express;

// Automatic request logging
app.use('/api', auditMiddleware('API_REQUEST'));

// Manual event logging
app.post('/api/spin/commit', async (req, res) => {
  const result = await createCommitment();
  await logCommitmentCreated(req, result.commitmentHash, result.sessionId);
  res.json(result);
});
```

### Next.js Integration

```typescript
import { integrations } from '@three-body-entropy/audit-trail';

const { logCommitmentCreated } = integrations.nextjs;

export async function POST(req: Request) {
  const result = await createCommitment();
  await logCommitmentCreated(req, result.commitmentHash, result.sessionId);
  return NextResponse.json(result);
}
```

### Prisma Integration

```typescript
import { PrismaClient } from '@prisma/client';
import { setRepository } from '@three-body-entropy/audit-trail';

const prisma = new PrismaClient();

setRepository({
  create: async (data) => prisma.auditLog.create({ data }),
  findMany: async (filters) => prisma.auditLog.findMany({ ... }),
  count: async (filters) => prisma.auditLog.count({ ... }),
  findById: async (id) => prisma.auditLog.findUnique({ where: { id } }),
  deleteOlderThan: async (date) => {
    const result = await prisma.auditLog.deleteMany({
      where: { timestamp: { lt: date } }
    });
    return result.count;
  }
});
```

## Troubleshooting

### Common Issues

1. **Missing Logs**: Ensure `logEvent` is called after successful operations
2. **Performance Issues**: Check database indexes are created
3. **Signature Verification Failures**: Ensure consistent secret key across instances
4. **Query Timeouts**: Add appropriate indexes for common query patterns

### Debugging

Enable console logging in development:

```typescript
configure({
  consoleLogging: process.env.NODE_ENV === 'development'
});
```

## Support

For issues or questions about the audit trail module, please refer to:

- Module README: `/modules/audit-trail/README.md`
- Test Examples: `/modules/audit-trail/tests/audit-trail.test.ts`
- Integration Examples: `/modules/audit-trail/src/integrations/`
