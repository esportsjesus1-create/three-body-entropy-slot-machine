/**
 * Theta Validation Unit Tests
 */

import {
  validateThetaProof,
  validateThetaCommitment,
  quickValidate,
  getValidationSummary,
  generateThetaProof,
  createThetaCommitment,
  resetConfig,
  EntropyData,
  ThetaProof,
  ValidationResult
} from '../src';

describe('Theta Validation', () => {
  const mockEntropyData: EntropyData = {
    value: 0.123456789,
    hex: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    sourceHash: 'source123hash456',
    timestamp: 1700000000000
  };

  let validProof: ThetaProof;

  beforeEach(() => {
    resetConfig();
    validProof = generateThetaProof({
      entropyData: mockEntropyData,
      clientSeed: 'client-seed',
      nonce: 1,
      reelCount: 5,
      symbolsPerReel: 20
    });
  });

  describe('validateThetaProof', () => {
    it('should validate a valid proof', () => {
      const result = validateThetaProof({ proof: validProof });
      
      expect(result.valid).toBe(true);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.checks.every(c => c.passed)).toBe(true);
    });

    it('should reject proof with missing fields', () => {
      const invalidProof = { ...validProof, proofId: undefined } as unknown as ThetaProof;
      const result = validateThetaProof({ proof: invalidProof });
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing fields');
    });

    it('should reject proof with invalid commitment format', () => {
      const invalidProof = { ...validProof, commitment: 'short' };
      const result = validateThetaProof({ proof: invalidProof });
      
      expect(result.valid).toBe(false);
    });

    it('should reject proof with tampered reel positions', () => {
      const invalidProof = {
        ...validProof,
        result: {
          ...validProof.result,
          reelPositions: [99, 99, 99, 99, 99]
        }
      };
      const result = validateThetaProof({ proof: invalidProof });
      
      expect(result.valid).toBe(false);
      const positionsCheck = result.checks.find(c => c.name === 'reelPositions');
      expect(positionsCheck?.passed).toBe(false);
    });

    it('should reject proof with tampered result hash', () => {
      const invalidProof = {
        ...validProof,
        result: {
          ...validProof.result,
          resultHash: 'tampered-hash'
        }
      };
      const result = validateThetaProof({ proof: invalidProof });
      
      expect(result.valid).toBe(false);
      const hashCheck = result.checks.find(c => c.name === 'resultHash');
      expect(hashCheck?.passed).toBe(false);
    });

    it('should validate with expected result', () => {
      const result = validateThetaProof({
        proof: validProof,
        expectedResult: validProof.result
      });
      
      expect(result.valid).toBe(true);
      const matchCheck = result.checks.find(c => c.name === 'resultMatch');
      expect(matchCheck?.passed).toBe(true);
    });

    it('should reject mismatched expected result', () => {
      const result = validateThetaProof({
        proof: validProof,
        expectedResult: {
          ...validProof.result,
          reelPositions: [0, 0, 0, 0, 0]
        }
      });
      
      expect(result.valid).toBe(false);
    });

    it('should validate signature with server key', () => {
      const proofWithSecret = generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20,
        serverSecret: 'server-secret'
      });
      
      const result = validateThetaProof({
        proof: proofWithSecret,
        serverPublicKey: 'server-secret'
      });
      
      expect(result.valid).toBe(true);
      const sigCheck = result.checks.find(c => c.name === 'signature');
      expect(sigCheck?.passed).toBe(true);
    });

    it('should reject invalid signature', () => {
      const result = validateThetaProof({
        proof: validProof,
        serverPublicKey: 'wrong-key'
      });
      
      expect(result.valid).toBe(false);
      const sigCheck = result.checks.find(c => c.name === 'signature');
      expect(sigCheck?.passed).toBe(false);
    });

    it('should reject future timestamp', () => {
      const futureProof = {
        ...validProof,
        timestamp: Date.now() + 1000000
      };
      const result = validateThetaProof({ proof: futureProof });
      
      expect(result.valid).toBe(false);
      const timestampCheck = result.checks.find(c => c.name === 'timestamp');
      expect(timestampCheck?.passed).toBe(false);
    });

    it('should reject old timestamp', () => {
      const oldProof = {
        ...validProof,
        timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };
      const result = validateThetaProof({ proof: oldProof });
      
      expect(result.valid).toBe(false);
    });

    it('should reject unsupported version', () => {
      const invalidProof = { ...validProof, version: '99.0.0' };
      const result = validateThetaProof({ proof: invalidProof });
      
      expect(result.valid).toBe(false);
      const versionCheck = result.checks.find(c => c.name === 'version');
      expect(versionCheck?.passed).toBe(false);
    });

    it('should reject mismatched reel count', () => {
      const invalidProof = {
        ...validProof,
        result: {
          ...validProof.result,
          reelCount: 3 // Doesn't match positions array length
        }
      };
      const result = validateThetaProof({ proof: invalidProof });
      
      expect(result.valid).toBe(false);
    });
  });

  describe('validateThetaCommitment', () => {
    it('should validate valid commitment', () => {
      const commitment = createThetaCommitment(mockEntropyData);
      const result = validateThetaCommitment(commitment);
      
      expect(result.passed).toBe(true);
    });

    it('should reject invalid hash format', () => {
      const invalidCommitment = {
        hash: 'short',
        entropySourceId: 'source',
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000
      };
      const result = validateThetaCommitment(invalidCommitment);
      
      expect(result.passed).toBe(false);
    });

    it('should reject expired commitment', () => {
      const expiredCommitment = {
        hash: 'a'.repeat(64),
        entropySourceId: 'source',
        timestamp: Date.now() - 120000,
        expiresAt: Date.now() - 60000
      };
      const result = validateThetaCommitment(expiredCommitment);
      
      expect(result.passed).toBe(false);
      expect(result.details).toContain('expired');
    });
  });

  describe('quickValidate', () => {
    it('should return true for valid proof', () => {
      expect(quickValidate(validProof)).toBe(true);
    });

    it('should return false for missing proofId', () => {
      const invalidProof = { ...validProof, proofId: '' };
      expect(quickValidate(invalidProof)).toBe(false);
    });

    it('should return false for missing theta', () => {
      const invalidProof = { ...validProof, theta: '' };
      expect(quickValidate(invalidProof)).toBe(false);
    });

    it('should return false for missing result', () => {
      const invalidProof = { ...validProof, result: null } as unknown as ThetaProof;
      expect(quickValidate(invalidProof)).toBe(false);
    });

    it('should return false for tampered result hash', () => {
      const invalidProof = {
        ...validProof,
        result: { ...validProof.result, resultHash: 'tampered' }
      };
      expect(quickValidate(invalidProof)).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    it('should return success summary for valid result', () => {
      const result = validateThetaProof({ proof: validProof });
      const summary = getValidationSummary(result);
      
      expect(summary).toContain('Valid');
      expect(summary).toContain('passed');
    });

    it('should return failure summary for invalid result', () => {
      const invalidProof = { ...validProof, version: '99.0.0' };
      const result = validateThetaProof({ proof: invalidProof });
      const summary = getValidationSummary(result);
      
      expect(summary).toContain('Invalid');
      expect(summary).toContain('version');
    });
  });
});
