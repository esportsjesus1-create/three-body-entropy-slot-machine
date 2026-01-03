# Audit Trail Module

Comprehensive audit logging system for tracking all critical game events for compliance and dispute resolution.

## Overview

The Audit Trail module provides a robust logging infrastructure for recording and querying game events such as commitments, reveals, spins, and verifications. It supports both in-memory storage for development/testing and Prisma-based persistence for production environments.

## Installation

```bash
npm install @three-body-entropy/audit-trail
```

For Prisma integration:
```bash
npm install @prisma/client
npx prisma generate --schema=modules/audit-trail/prisma/schema.prisma
npx prisma migrate dev --schema=modules/audit-trail/prisma/schema.prisma
```

## Quick Start

```typescript
import { logEvent, queryLogs, configure } from '@three-body-entropy/audit-trail';

// Configure the module (optional)
configure({
  enableSignatures: true,
  signatureSecret: process.env.AUDIT_SECRET,
  defaultQueryLimit: 100
});

// Log an event
await logEvent('COMMITMENT_CREATED', {
  commitmentHash: 'abc123...',
  sessionId: 'session-456'
}, {
  sessionId: 'session-456',
  ipAddress: '192.168.1.1'
});

// Query logs
const logs = await queryLogs({
  sessionId: 'session-456',
  eventType: 'COMMITMENT_CREATED'
});
```

## Event Types

The module supports the following event types:

| Event Type | Description |
|------------|-------------|
| `COMMITMENT_CREATED` | Server commitment hash generated |
| `COMMITMENT_REVEALED` | Server seed revealed to client |
| `SPIN_EXECUTED` | Spin result calculated |
| `SPIN_VERIFIED` | Spin result verified |
| `SESSION_STARTED` | New game session started |
| `SESSION_ENDED` | Game session ended |
| `ERROR_OCCURRED` | Error during processing |
| `VERIFICATION_FAILED` | Verification check failed |
| `PAYOUT_CALCULATED` | Payout amount calculated |
| `CUSTOM` | Custom event type |

## API Reference

### Core Functions

#### `logEvent(eventType, data, metadata?)`

Log an event to the audit trail.

```typescript
const log = await logEvent(
  'SPIN_EXECUTED',
  {
    sessionId: 'session-123',
    spinNumber: 1,
    betAmount: 100,
    symbols: ['cherry', 'cherry', 'cherry'],
    payout: 500,
    combinedHash: 'hash...'
  },
  {
    sessionId: 'session-123',
    userId: 'user-456',
    ipAddress: '192.168.1.1'
  }
);
```

#### `queryLogs(filters?)`

Query audit logs with optional filters.

```typescript
const logs = await queryLogs({
  sessionId: 'session-123',
  eventType: 'SPIN_EXECUTED',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limit: 100,
  offset: 0
});
```

#### `queryLogsWithPagination(filters?)`

Query logs with pagination information.

```typescript
const result = await queryLogsWithPagination({
  sessionId: 'session-123',
  limit: 50
});

console.log(result.logs);       // Array of logs
console.log(result.totalCount); // Total matching logs
console.log(result.hasMore);    // More results available
```

#### `getLogById(id)`

Retrieve a single log by ID.

```typescript
const log = await getLogById('log-id-123');
```

#### `getLogCount(filters?)`

Get the count of logs matching filters.

```typescript
const count = await getLogCount({ eventType: 'SPIN_EXECUTED' });
```

#### `deleteLogsOlderThan(date)`

Delete logs older than a specified date (for data retention).

```typescript
const deletedCount = await deleteLogsOlderThan(new Date('2023-01-01'));
```

### Configuration

#### `configure(options)`

Configure the audit trail module.

```typescript
configure({
  enableSignatures: true,      // Enable cryptographic signatures
  signatureSecret: 'secret',   // Secret for HMAC signatures
  defaultQueryLimit: 100,      // Default query limit
  maxQueryLimit: 1000,         // Maximum query limit
  consoleLogging: true         // Log to console in development
});
```

### Prisma Integration

#### `setRepository(repository)`

Set an external repository for database persistence.

```typescript
import { PrismaClient } from '@prisma/client';
import { setRepository } from '@three-body-entropy/audit-trail';

const prisma = new PrismaClient();

setRepository({
  create: async (data) => prisma.auditLog.create({ data }),
  findMany: async (filters) => prisma.auditLog.findMany({
    where: {
      sessionId: filters.sessionId,
      eventType: filters.eventType,
      userId: filters.userId,
      timestamp: {
        gte: filters.startDate,
        lte: filters.endDate
      }
    },
    orderBy: { timestamp: 'desc' },
    take: filters.limit,
    skip: filters.offset
  }),
  count: async (filters) => prisma.auditLog.count({
    where: {
      sessionId: filters.sessionId,
      eventType: filters.eventType,
      userId: filters.userId,
      timestamp: {
        gte: filters.startDate,
        lte: filters.endDate
      }
    }
  }),
  findById: async (id) => prisma.auditLog.findUnique({ where: { id } }),
  deleteOlderThan: async (date) => {
    const result = await prisma.auditLog.deleteMany({
      where: { timestamp: { lt: date } }
    });
    return result.count;
  }
});
```

## Framework Integrations

### Express.js

```typescript
import { integrations } from '@three-body-entropy/audit-trail';

const { logCommitmentCreated, logSpinExecuted, auditMiddleware } = integrations.express;

// Use middleware for automatic logging
app.use('/api/spin', auditMiddleware('API_REQUEST'));

// Or log manually in route handlers
app.post('/api/spin/commit', async (req, res) => {
  const result = await createCommitment();
  await logCommitmentCreated(req, result.commitmentHash, result.sessionId);
  res.json(result);
});
```

### Next.js App Router

```typescript
import { integrations } from '@three-body-entropy/audit-trail';

const { logCommitmentCreated, logError } = integrations.nextjs;

export async function POST(req: Request) {
  try {
    const result = await createCommitment();
    await logCommitmentCreated(req, result.commitmentHash, result.sessionId);
    return NextResponse.json(result);
  } catch (error) {
    await logError(req, error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

## Prisma Schema

The module includes a Prisma schema at `prisma/schema.prisma`:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  timestamp DateTime @default(now())
  eventType String
  userId    String?
  sessionId String?
  ipAddress String?
  data      Json
  signature String?

  @@index([timestamp, eventType])
  @@index([sessionId])
  @@index([userId])
  @@map("audit_logs")
}
```

## Testing

Run the test suite:

```bash
npm test
```

Run performance tests:

```bash
npm run test:perf
```

The test suite includes:
- Log creation tests
- Query filtering tests
- Data integrity tests
- Performance tests with 10,000+ logs
- Concurrent operation tests

## Data Retention

Implement data retention policies using the `deleteLogsOlderThan` function:

```typescript
// Delete logs older than 90 days
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

const deletedCount = await deleteLogsOlderThan(ninetyDaysAgo);
console.log(`Deleted ${deletedCount} old audit logs`);
```

## Security Considerations

1. **Signature Verification**: Enable signatures to ensure log integrity
2. **Access Control**: Implement proper authentication for audit query APIs
3. **Data Encryption**: Consider encrypting sensitive data in the `data` field
4. **IP Logging**: Be aware of privacy regulations when logging IP addresses
5. **Retention Policies**: Implement appropriate data retention policies

## License

MIT
