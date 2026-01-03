/**
 * Audit Trail Module Unit Tests
 * 
 * Comprehensive tests for audit logging functionality including:
 * - Log creation
 * - Query filtering
 * - Data integrity
 * - Performance with large datasets
 */

import {
  logEvent,
  queryLogs,
  queryLogsWithPagination,
  getLogById,
  deleteLogsOlderThan,
  getLogCount,
  verifySignature,
  configure,
  setRepository,
  clearRepository,
  clearInMemoryLogs,
  getInMemoryLogs,
  reset
} from '../src/logger';

import {
  AuditLog,
  AuditLogRepository,
  AuditLogFilters,
  CommitmentEventData,
  RevealEventData,
  SpinEventData,
  VerificationEventData
} from '../src/types';

describe('Audit Trail Module', () => {
  beforeEach(() => {
    reset();
  });

  describe('logEvent', () => {
    it('should create a log entry with basic data', async () => {
      const log = await logEvent('TEST_EVENT', { key: 'value' });

      expect(log.id).toBeDefined();
      expect(log.eventType).toBe('TEST_EVENT');
      expect(log.data).toEqual({ key: 'value' });
      expect(log.timestamp).toBeInstanceOf(Date);
    });

    it('should create a log entry with metadata', async () => {
      const log = await logEvent(
        'TEST_EVENT',
        { key: 'value' },
        {
          userId: 'user-123',
          sessionId: 'session-456',
          ipAddress: '192.168.1.1'
        }
      );

      expect(log.userId).toBe('user-123');
      expect(log.sessionId).toBe('session-456');
      expect(log.ipAddress).toBe('192.168.1.1');
    });

    it('should create a log entry with custom signature', async () => {
      const log = await logEvent(
        'TEST_EVENT',
        { key: 'value' },
        { signature: 'custom-signature' }
      );

      expect(log.signature).toBe('custom-signature');
    });

    it('should generate signature when enabled', async () => {
      configure({
        enableSignatures: true,
        signatureSecret: 'test-secret-key'
      });

      const log = await logEvent('TEST_EVENT', { key: 'value' });

      expect(log.signature).toBeDefined();
      expect(log.signature).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should create unique IDs for each log', async () => {
      const log1 = await logEvent('TEST_EVENT', { index: 1 });
      const log2 = await logEvent('TEST_EVENT', { index: 2 });

      expect(log1.id).not.toBe(log2.id);
    });

    it('should log COMMITMENT_CREATED event', async () => {
      const commitmentData: CommitmentEventData = {
        commitmentHash: 'abc123def456',
        sessionId: 'session-789',
        timestamp: Date.now(),
        nonce: 'nonce-value'
      };

      const log = await logEvent(
        'COMMITMENT_CREATED',
        commitmentData as Record<string, unknown>,
        { sessionId: commitmentData.sessionId }
      );

      expect(log.eventType).toBe('COMMITMENT_CREATED');
      expect(log.data).toEqual(commitmentData);
    });

    it('should log COMMITMENT_REVEALED event', async () => {
      const revealData: RevealEventData = {
        serverSeed: 'server-seed-value',
        commitmentHash: 'abc123def456',
        sessionId: 'session-789',
        clientSeed: 'client-seed-value',
        nonce: 1
      };

      const log = await logEvent(
        'COMMITMENT_REVEALED',
        revealData as Record<string, unknown>,
        { sessionId: revealData.sessionId }
      );

      expect(log.eventType).toBe('COMMITMENT_REVEALED');
      expect(log.data).toEqual(revealData);
    });

    it('should log SPIN_EXECUTED event', async () => {
      const spinData: SpinEventData = {
        sessionId: 'session-789',
        spinNumber: 1,
        betAmount: 100,
        symbols: ['cherry', 'cherry', 'cherry'],
        payout: 500,
        combinedHash: 'combined-hash-value',
        verified: true
      };

      const log = await logEvent(
        'SPIN_EXECUTED',
        spinData as Record<string, unknown>,
        { sessionId: spinData.sessionId }
      );

      expect(log.eventType).toBe('SPIN_EXECUTED');
      expect(log.data).toEqual(spinData);
    });

    it('should log SPIN_VERIFIED event', async () => {
      const verificationData: VerificationEventData = {
        sessionId: 'session-789',
        commitmentHash: 'abc123def456',
        serverSeed: 'server-seed-value',
        clientSeed: 'client-seed-value',
        nonce: 1,
        verified: true
      };

      const log = await logEvent(
        'SPIN_VERIFIED',
        verificationData as Record<string, unknown>,
        { sessionId: verificationData.sessionId }
      );

      expect(log.eventType).toBe('SPIN_VERIFIED');
      expect(log.data).toEqual(verificationData);
    });
  });

  describe('queryLogs', () => {
    beforeEach(async () => {
      // Create test logs
      await logEvent('EVENT_A', { index: 1 }, { sessionId: 'session-1', userId: 'user-1' });
      await logEvent('EVENT_B', { index: 2 }, { sessionId: 'session-1', userId: 'user-2' });
      await logEvent('EVENT_A', { index: 3 }, { sessionId: 'session-2', userId: 'user-1' });
      await logEvent('EVENT_C', { index: 4 }, { sessionId: 'session-2', userId: 'user-2' });
    });

    it('should return all logs when no filters applied', async () => {
      const logs = await queryLogs();

      expect(logs.length).toBe(4);
    });

    it('should filter by sessionId', async () => {
      const logs = await queryLogs({ sessionId: 'session-1' });

      expect(logs.length).toBe(2);
      expect(logs.every(log => log.sessionId === 'session-1')).toBe(true);
    });

    it('should filter by eventType', async () => {
      const logs = await queryLogs({ eventType: 'EVENT_A' });

      expect(logs.length).toBe(2);
      expect(logs.every(log => log.eventType === 'EVENT_A')).toBe(true);
    });

    it('should filter by userId', async () => {
      const logs = await queryLogs({ userId: 'user-1' });

      expect(logs.length).toBe(2);
      expect(logs.every(log => log.userId === 'user-1')).toBe(true);
    });

    it('should filter by multiple criteria', async () => {
      const logs = await queryLogs({
        sessionId: 'session-1',
        eventType: 'EVENT_A'
      });

      expect(logs.length).toBe(1);
      expect(logs[0].sessionId).toBe('session-1');
      expect(logs[0].eventType).toBe('EVENT_A');
    });

    it('should return logs in descending timestamp order', async () => {
      const logs = await queryLogs();

      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          logs[i].timestamp.getTime()
        );
      }
    });

    it('should apply limit', async () => {
      const logs = await queryLogs({ limit: 2 });

      expect(logs.length).toBe(2);
    });

    it('should apply offset', async () => {
      const allLogs = await queryLogs();
      const offsetLogs = await queryLogs({ offset: 2 });

      expect(offsetLogs.length).toBe(2);
      expect(offsetLogs[0].id).toBe(allLogs[2].id);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000);
      const futureDate = new Date(now.getTime() + 1000);

      const logs = await queryLogs({
        startDate: pastDate,
        endDate: futureDate
      });

      expect(logs.length).toBe(4);
    });

    it('should return empty array when no matches', async () => {
      const logs = await queryLogs({ sessionId: 'non-existent' });

      expect(logs).toEqual([]);
    });
  });

  describe('queryLogsWithPagination', () => {
    beforeEach(async () => {
      for (let i = 0; i < 25; i++) {
        await logEvent('TEST_EVENT', { index: i }, { sessionId: 'session-1' });
      }
    });

    it('should return pagination info', async () => {
      const result = await queryLogsWithPagination({ limit: 10 });

      expect(result.logs.length).toBe(10);
      expect(result.totalCount).toBe(25);
      expect(result.hasMore).toBe(true);
    });

    it('should indicate no more results', async () => {
      const result = await queryLogsWithPagination({ limit: 30 });

      expect(result.logs.length).toBe(25);
      expect(result.totalCount).toBe(25);
      expect(result.hasMore).toBe(false);
    });

    it('should handle offset correctly', async () => {
      const result = await queryLogsWithPagination({ offset: 20, limit: 10 });

      expect(result.logs.length).toBe(5);
      expect(result.totalCount).toBe(25);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getLogById', () => {
    it('should retrieve a log by ID', async () => {
      const created = await logEvent('TEST_EVENT', { key: 'value' });
      const retrieved = await getLogById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.eventType).toBe('TEST_EVENT');
    });

    it('should return null for non-existent ID', async () => {
      const retrieved = await getLogById('non-existent-id');

      expect(retrieved).toBeNull();
    });
  });

  describe('deleteLogsOlderThan', () => {
    it('should delete logs older than specified date', async () => {
      // Create logs
      await logEvent('OLD_EVENT', { index: 1 });
      await logEvent('OLD_EVENT', { index: 2 });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const cutoffDate = new Date();

      // Create more logs
      await logEvent('NEW_EVENT', { index: 3 });
      await logEvent('NEW_EVENT', { index: 4 });

      const deletedCount = await deleteLogsOlderThan(cutoffDate);

      expect(deletedCount).toBe(2);

      const remainingLogs = await queryLogs();
      expect(remainingLogs.length).toBe(2);
      expect(remainingLogs.every(log => log.eventType === 'NEW_EVENT')).toBe(true);
    });
  });

  describe('getLogCount', () => {
    beforeEach(async () => {
      await logEvent('EVENT_A', { index: 1 }, { sessionId: 'session-1' });
      await logEvent('EVENT_B', { index: 2 }, { sessionId: 'session-1' });
      await logEvent('EVENT_A', { index: 3 }, { sessionId: 'session-2' });
    });

    it('should return total count', async () => {
      const count = await getLogCount();

      expect(count).toBe(3);
    });

    it('should return filtered count', async () => {
      const count = await getLogCount({ eventType: 'EVENT_A' });

      expect(count).toBe(2);
    });

    it('should return zero for no matches', async () => {
      const count = await getLogCount({ sessionId: 'non-existent' });

      expect(count).toBe(0);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      configure({
        enableSignatures: true,
        signatureSecret: 'test-secret-key'
      });

      const log = await logEvent('TEST_EVENT', { key: 'value' });

      expect(verifySignature(log)).toBe(true);
    });

    it('should reject invalid signature', async () => {
      configure({
        enableSignatures: true,
        signatureSecret: 'test-secret-key'
      });

      const log = await logEvent('TEST_EVENT', { key: 'value' });
      const tamperedLog = { ...log, signature: 'tampered-signature' };

      expect(verifySignature(tamperedLog)).toBe(false);
    });

    it('should return false for log without signature', async () => {
      configure({ signatureSecret: 'test-secret-key' });

      const log = await logEvent('TEST_EVENT', { key: 'value' });

      expect(verifySignature(log)).toBe(false);
    });

    it('should throw error when secret not configured', async () => {
      const log = await logEvent(
        'TEST_EVENT',
        { key: 'value' },
        { signature: 'some-signature' }
      );

      expect(() => verifySignature(log)).toThrow('Signature secret is not configured');
    });
  });

  describe('configure', () => {
    it('should update configuration', async () => {
      configure({
        defaultQueryLimit: 50,
        maxQueryLimit: 500
      });

      // Create 60 logs
      for (let i = 0; i < 60; i++) {
        await logEvent('TEST_EVENT', { index: i });
      }

      const logs = await queryLogs();

      expect(logs.length).toBe(50);
    });

    it('should respect max query limit', async () => {
      configure({
        maxQueryLimit: 10
      });

      // Create 20 logs
      for (let i = 0; i < 20; i++) {
        await logEvent('TEST_EVENT', { index: i });
      }

      const logs = await queryLogs({ limit: 100 });

      expect(logs.length).toBe(10);
    });
  });

  describe('External Repository', () => {
    let mockRepository: AuditLogRepository;
    let mockLogs: AuditLog[];

    beforeEach(() => {
      mockLogs = [];
      let idCounter = 0;

      mockRepository = {
        create: jest.fn(async (data) => {
          const log: AuditLog = {
            id: `mock-id-${++idCounter}`,
            timestamp: new Date(),
            ...data
          };
          mockLogs.push(log);
          return log;
        }),
        findMany: jest.fn(async (filters: AuditLogFilters) => {
          let results = [...mockLogs];
          if (filters.sessionId) {
            results = results.filter(log => log.sessionId === filters.sessionId);
          }
          if (filters.eventType) {
            results = results.filter(log => log.eventType === filters.eventType);
          }
          return results.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100));
        }),
        count: jest.fn(async () => mockLogs.length),
        findById: jest.fn(async (id) => mockLogs.find(log => log.id === id) || null),
        deleteOlderThan: jest.fn(async (date) => {
          const initialCount = mockLogs.length;
          mockLogs = mockLogs.filter(log => log.timestamp >= date);
          return initialCount - mockLogs.length;
        })
      };

      setRepository(mockRepository);
    });

    afterEach(() => {
      clearRepository();
    });

    it('should use external repository for create', async () => {
      const log = await logEvent('TEST_EVENT', { key: 'value' });

      expect(mockRepository.create).toHaveBeenCalled();
      expect(log.id).toMatch(/^mock-id-/);
    });

    it('should use external repository for query', async () => {
      await logEvent('TEST_EVENT', { key: 'value' });
      await queryLogs({ sessionId: 'test' });

      expect(mockRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'test' })
      );
    });

    it('should use external repository for count', async () => {
      await getLogCount();

      expect(mockRepository.count).toHaveBeenCalled();
    });

    it('should use external repository for findById', async () => {
      await getLogById('test-id');

      expect(mockRepository.findById).toHaveBeenCalledWith('test-id');
    });

    it('should use external repository for delete', async () => {
      const date = new Date();
      await deleteLogsOlderThan(date);

      expect(mockRepository.deleteOlderThan).toHaveBeenCalledWith(date);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all data fields', async () => {
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        },
        number: 42,
        string: 'test',
        boolean: true,
        null: null
      };

      const log = await logEvent('TEST_EVENT', complexData);
      const retrieved = await getLogById(log.id);

      expect(retrieved!.data).toEqual(complexData);
    });

    it('should handle special characters in data', async () => {
      const specialData = {
        unicode: '\u0000\u001F\u007F',
        emoji: '🎰🎲🃏',
        quotes: '"\'`',
        newlines: 'line1\nline2\r\nline3'
      };

      const log = await logEvent('TEST_EVENT', specialData);
      const retrieved = await getLogById(log.id);

      expect(retrieved!.data).toEqual(specialData);
    });

    it('should handle large data payloads', async () => {
      const largeData = {
        array: Array(1000).fill(0).map((_, i) => ({ index: i, value: `item-${i}` }))
      };

      const log = await logEvent('TEST_EVENT', largeData);
      const retrieved = await getLogById(log.id);

      expect(retrieved!.data).toEqual(largeData);
    });
  });

  describe('Performance', () => {
    it('should handle 10,000+ logs efficiently', async () => {
      const LOG_COUNT = 10000;
      const startTime = Date.now();

      // Create 10,000 logs
      const createPromises: Promise<AuditLog>[] = [];
      for (let i = 0; i < LOG_COUNT; i++) {
        createPromises.push(
          logEvent(
            `EVENT_TYPE_${i % 10}`,
            { index: i, data: `data-${i}` },
            {
              sessionId: `session-${i % 100}`,
              userId: `user-${i % 50}`
            }
          )
        );
      }

      await Promise.all(createPromises);

      const createTime = Date.now() - startTime;
      console.log(`Created ${LOG_COUNT} logs in ${createTime}ms`);

      // Verify count
      const count = await getLogCount();
      expect(count).toBe(LOG_COUNT);

      // Test query performance
      const queryStart = Date.now();
      const logs = await queryLogs({ limit: 100 });
      const queryTime = Date.now() - queryStart;
      console.log(`Queried 100 logs in ${queryTime}ms`);

      expect(logs.length).toBe(100);

      // Test filtered query performance
      const filterStart = Date.now();
      const filteredLogs = await queryLogs({
        sessionId: 'session-50',
        limit: 100
      });
      const filterTime = Date.now() - filterStart;
      console.log(`Filtered query in ${filterTime}ms`);

      expect(filteredLogs.length).toBeGreaterThan(0);
      expect(filteredLogs.every(log => log.sessionId === 'session-50')).toBe(true);

      // Test count performance
      const countStart = Date.now();
      const filteredCount = await getLogCount({ eventType: 'EVENT_TYPE_5' });
      const countTime = Date.now() - countStart;
      console.log(`Count query in ${countTime}ms`);

      expect(filteredCount).toBe(LOG_COUNT / 10);

      // Performance assertions (should complete in reasonable time)
      expect(createTime).toBeLessThan(30000); // 30 seconds max for creation
      expect(queryTime).toBeLessThan(1000); // 1 second max for query
      expect(filterTime).toBeLessThan(1000); // 1 second max for filtered query
      expect(countTime).toBeLessThan(1000); // 1 second max for count
    }, 60000); // 60 second timeout for this test

    it('should handle concurrent log creation', async () => {
      const CONCURRENT_COUNT = 100;
      const startTime = Date.now();

      const promises = Array(CONCURRENT_COUNT)
        .fill(0)
        .map((_, i) =>
          logEvent('CONCURRENT_EVENT', { index: i }, { sessionId: 'concurrent-session' })
        );

      const logs = await Promise.all(promises);
      const duration = Date.now() - startTime;

      console.log(`Created ${CONCURRENT_COUNT} concurrent logs in ${duration}ms`);

      expect(logs.length).toBe(CONCURRENT_COUNT);
      expect(new Set(logs.map(l => l.id)).size).toBe(CONCURRENT_COUNT);
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data object', async () => {
      const log = await logEvent('EMPTY_DATA', {});

      expect(log.data).toEqual({});
    });

    it('should handle undefined metadata fields', async () => {
      const log = await logEvent('TEST_EVENT', { key: 'value' }, {});

      expect(log.userId).toBeUndefined();
      expect(log.sessionId).toBeUndefined();
      expect(log.ipAddress).toBeUndefined();
    });

    it('should handle very long strings', async () => {
      const longString = 'x'.repeat(10000);
      const log = await logEvent('LONG_STRING', { value: longString });

      expect((log.data as { value: string }).value.length).toBe(10000);
    });

    it('should handle query with all filters', async () => {
      const now = new Date();
      await logEvent(
        'SPECIFIC_EVENT',
        { key: 'value' },
        { sessionId: 'specific-session', userId: 'specific-user' }
      );

      const logs = await queryLogs({
        sessionId: 'specific-session',
        userId: 'specific-user',
        eventType: 'SPECIFIC_EVENT',
        startDate: new Date(now.getTime() - 1000),
        endDate: new Date(now.getTime() + 1000),
        limit: 10,
        offset: 0
      });

      expect(logs.length).toBe(1);
    });
  });

  describe('In-Memory Storage Utilities', () => {
    it('should clear in-memory logs', async () => {
      await logEvent('TEST_EVENT', { key: 'value' });
      expect(getInMemoryLogs().length).toBe(1);

      clearInMemoryLogs();
      expect(getInMemoryLogs().length).toBe(0);
    });

    it('should get copy of in-memory logs', async () => {
      await logEvent('TEST_EVENT', { key: 'value' });
      const logs = getInMemoryLogs();

      logs.push({} as AuditLog); // Modify the returned array

      expect(getInMemoryLogs().length).toBe(1); // Original should be unchanged
    });

    it('should reset module state', async () => {
      configure({ defaultQueryLimit: 50 });
      await logEvent('TEST_EVENT', { key: 'value' });

      reset();

      expect(getInMemoryLogs().length).toBe(0);
    });
  });
});
