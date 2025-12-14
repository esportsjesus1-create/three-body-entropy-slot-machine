/**
 * Slot Machine Client Unit Tests
 */

import {
  SlotMachineClient,
  createClient,
  SessionDetails,
  ReelConfiguration,
  EntropyData,
  ProofData,
  SpinResult
} from '../src';

describe('SlotMachineClient', () => {
  let client: SlotMachineClient;

  beforeEach(() => {
    client = createClient();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const config = client.getConfig();
      expect(config.apiEndpoint).toBe('http://localhost:3000/api');
      expect(config.timeout).toBe(30000);
    });

    it('should create client with custom config', () => {
      const customClient = createClient({
        apiEndpoint: 'https://api.example.com',
        timeout: 60000
      });
      const config = customClient.getConfig();
      expect(config.apiEndpoint).toBe('https://api.example.com');
      expect(config.timeout).toBe(60000);
    });
  });

  describe('setApiEndpoint', () => {
    it('should set API endpoint', () => {
      client.setApiEndpoint('https://new-api.example.com');
      expect(client.getApiEndpoint()).toBe('https://new-api.example.com');
    });

    it('should throw error for empty URL', () => {
      expect(() => client.setApiEndpoint('')).toThrow('API endpoint URL is required');
    });

    it('should throw error for whitespace URL', () => {
      expect(() => client.setApiEndpoint('   ')).toThrow('API endpoint URL is required');
    });
  });

  describe('setHeaders', () => {
    it('should set custom headers', () => {
      client.setHeaders({ 'Authorization': 'Bearer token' });
      const config = client.getConfig();
      expect(config.headers?.['Authorization']).toBe('Bearer token');
    });

    it('should merge with existing headers', () => {
      client.setHeaders({ 'X-Custom': 'value' });
      const config = client.getConfig();
      expect(config.headers?.['Content-Type']).toBe('application/json');
      expect(config.headers?.['X-Custom']).toBe('value');
    });
  });

  describe('setTimeout', () => {
    it('should set timeout', () => {
      client.setTimeout(60000);
      const config = client.getConfig();
      expect(config.timeout).toBe(60000);
    });

    it('should throw error for negative timeout', () => {
      expect(() => client.setTimeout(-1)).toThrow('Timeout must be non-negative');
    });

    it('should accept zero timeout', () => {
      client.setTimeout(0);
      const config = client.getConfig();
      expect(config.timeout).toBe(0);
    });
  });

  describe('requestSpin', () => {
    const sessionDetails: SessionDetails = {
      sessionId: 'session-123',
      userId: 'user-456',
      gameId: 'game-789',
      betAmount: 100,
      currency: 'USD',
      clientSeed: 'client-seed',
      nonce: 1
    };

    const reelConfig: ReelConfiguration = {
      reelCount: 5,
      symbolsPerReel: 20
    };

    it('should request spin successfully', async () => {
      const response = await client.requestSpin(sessionDetails, reelConfig);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.result?.reelPositions).toHaveLength(5);
      expect(response.serverCommitment).toBeDefined();
      expect(response.proof).toBeDefined();
    });

    it('should return result with correct reel count', async () => {
      for (const reelCount of [3, 4, 5, 6, 7, 8] as const) {
        const config: ReelConfiguration = { reelCount, symbolsPerReel: 20 };
        const response = await client.requestSpin(sessionDetails, config);

        expect(response.result?.reelPositions).toHaveLength(reelCount);
      }
    });

    it('should return error for invalid configuration', async () => {
      const invalidConfig = { reelCount: 2 as any, symbolsPerReel: 20 };
      
      await expect(client.requestSpin(sessionDetails, invalidConfig))
        .rejects.toThrow();
    });
  });

  describe('calculateReelResult', () => {
    it('should calculate result from entropy value', () => {
      const reelConfig: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const result = client.calculateReelResult(
        'abc123def456',
        reelConfig,
        'client-seed',
        1
      );

      expect(result.reelPositions).toHaveLength(5);
      expect(typeof result.winAmount).toBe('number');
    });

    it('should accept numeric entropy value', () => {
      const reelConfig: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const result = client.calculateReelResult(0.5, reelConfig, 'seed', 1);

      expect(result.reelPositions).toHaveLength(5);
    });

    it('should be deterministic', () => {
      const reelConfig: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const result1 = client.calculateReelResult('entropy', reelConfig, 'seed', 1);
      const result2 = client.calculateReelResult('entropy', reelConfig, 'seed', 1);

      expect(result1.reelPositions).toEqual(result2.reelPositions);
    });
  });

  describe('verifySpinResult', () => {
    const mockEntropyData: EntropyData = {
      value: 0.5,
      hex: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      sourceHash: 'source-hash',
      timestamp: Date.now()
    };

    const reelConfig: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };

    it('should verify valid spin result', () => {
      const result = client.calculateReelResult(
        mockEntropyData.hex,
        reelConfig,
        'seed',
        1
      );

      const proof: ProofData = {
        proofId: 'a'.repeat(32),
        theta: 'theta-value',
        resultHash: require('crypto')
          .createHash('sha256')
          .update(`${result.reelPositions.join(',')}:${mockEntropyData.hex}:seed:1`)
          .digest('hex'),
        signature: 'signature',
        timestamp: Date.now()
      };

      const verification = client.verifySpinResult(
        result,
        proof,
        mockEntropyData,
        reelConfig,
        'seed',
        1
      );

      expect(verification.valid).toBe(true);
      expect(verification.checks.find(c => c.name === 'reelPositions')?.passed).toBe(true);
    });

    it('should reject invalid reel positions', () => {
      const result: SpinResult = {
        reelPositions: [99, 99, 99, 99, 99],
        winAmount: 0,
        multiplier: 0
      };

      const proof: ProofData = {
        proofId: 'a'.repeat(32),
        theta: 'theta',
        resultHash: 'hash',
        signature: 'sig',
        timestamp: Date.now()
      };

      const verification = client.verifySpinResult(
        result,
        proof,
        mockEntropyData,
        reelConfig,
        'seed',
        1
      );

      expect(verification.valid).toBe(false);
      expect(verification.checks.find(c => c.name === 'reelPositions')?.passed).toBe(false);
    });

    it('should reject expired timestamp', () => {
      const result = client.calculateReelResult(mockEntropyData.hex, reelConfig, 'seed', 1);

      const proof: ProofData = {
        proofId: 'a'.repeat(32),
        theta: 'theta',
        resultHash: require('crypto')
          .createHash('sha256')
          .update(`${result.reelPositions.join(',')}:${mockEntropyData.hex}:seed:1`)
          .digest('hex'),
        signature: 'sig',
        timestamp: Date.now() - 120000 // 2 minutes ago
      };

      const verification = client.verifySpinResult(
        result,
        proof,
        mockEntropyData,
        reelConfig,
        'seed',
        1
      );

      expect(verification.checks.find(c => c.name === 'timestamp')?.passed).toBe(false);
    });

    it('should reject invalid proof ID format', () => {
      const result = client.calculateReelResult(mockEntropyData.hex, reelConfig, 'seed', 1);

      const proof: ProofData = {
        proofId: 'short',
        theta: 'theta',
        resultHash: 'hash',
        signature: 'sig',
        timestamp: Date.now()
      };

      const verification = client.verifySpinResult(
        result,
        proof,
        mockEntropyData,
        reelConfig,
        'seed',
        1
      );

      expect(verification.checks.find(c => c.name === 'proofId')?.passed).toBe(false);
    });
  });

  describe('verifyHashChain', () => {
    it('should reject empty hash chain', () => {
      const result = client.verifyHashChain('commitment', []);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should verify single hash', () => {
      const result = client.verifyHashChain('commitment', ['hash1']);

      expect(result.checks.length).toBeGreaterThan(0);
    });
  });

  describe('hash chain data', () => {
    it('should set and get hash chain data', () => {
      const data = {
        initialCommitment: 'commitment',
        currentHash: 'current',
        chainIndex: 5,
        chainLength: 100
      };

      client.setHashChainData(data);
      expect(client.getHashChainData()).toEqual(data);
    });

    it('should return undefined when not set', () => {
      expect(client.getHashChainData()).toBeUndefined();
    });
  });

  describe('generateClientSeed', () => {
    it('should generate random seed', () => {
      const seed = client.generateClientSeed();

      expect(seed).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate different seeds each time', () => {
      const seed1 = client.generateClientSeed();
      const seed2 = client.generateClientSeed();

      expect(seed1).not.toBe(seed2);
    });

    it('should incorporate user input', () => {
      const seed1 = client.generateClientSeed('input1');
      const seed2 = client.generateClientSeed('input2');

      expect(seed1).not.toBe(seed2);
    });
  });
});
