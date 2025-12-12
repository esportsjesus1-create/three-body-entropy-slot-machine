/**
 * Theta Calculation Unit Tests
 */

import {
  setConfig,
  getConfig,
  resetConfig,
  calculateTheta,
  deriveReelPositions,
  calculateResultHash,
  createSpinResult,
  signProof,
  generateThetaProof,
  createThetaCommitment,
  createThetaReveal,
  verifyTheta,
  verifyReelPositions,
  EntropyData,
  GenerateProofOptions
} from '../src';

describe('Theta Calculation', () => {
  const mockEntropyData: EntropyData = {
    value: 0.123456789,
    hex: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    sourceHash: 'source123hash456',
    timestamp: 1700000000000
  };

  beforeEach(() => {
    resetConfig();
  });

  describe('setConfig / getConfig / resetConfig', () => {
    it('should get default config', () => {
      const config = getConfig();
      expect(config.hashAlgorithm).toBe('sha256');
      expect(config.proofVersion).toBe('1.0.0');
    });

    it('should set config', () => {
      setConfig({ hashAlgorithm: 'sha512' });
      const config = getConfig();
      expect(config.hashAlgorithm).toBe('sha512');
    });

    it('should reset config', () => {
      setConfig({ hashAlgorithm: 'sha512' });
      resetConfig();
      const config = getConfig();
      expect(config.hashAlgorithm).toBe('sha256');
    });
  });

  describe('calculateTheta', () => {
    it('should calculate theta from entropy data', () => {
      const theta = calculateTheta(mockEntropyData);
      expect(theta).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      const theta1 = calculateTheta(mockEntropyData);
      const theta2 = calculateTheta(mockEntropyData);
      expect(theta1).toBe(theta2);
    });

    it('should produce different theta for different entropy', () => {
      const theta1 = calculateTheta(mockEntropyData);
      const theta2 = calculateTheta({
        ...mockEntropyData,
        hex: 'different-hex-value'
      });
      expect(theta1).not.toBe(theta2);
    });
  });

  describe('deriveReelPositions', () => {
    it('should derive positions for 3 reels', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions = deriveReelPositions(theta, 'client-seed', 1, 3, 20);
      
      expect(positions).toHaveLength(3);
      positions.forEach(pos => {
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(20);
      });
    });

    it('should derive positions for 8 reels', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions = deriveReelPositions(theta, 'client-seed', 1, 8, 20);
      
      expect(positions).toHaveLength(8);
    });

    it('should be deterministic', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions1 = deriveReelPositions(theta, 'client-seed', 1, 5, 20);
      const positions2 = deriveReelPositions(theta, 'client-seed', 1, 5, 20);
      
      expect(positions1).toEqual(positions2);
    });

    it('should produce different positions for different nonces', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions1 = deriveReelPositions(theta, 'client-seed', 1, 5, 20);
      const positions2 = deriveReelPositions(theta, 'client-seed', 2, 5, 20);
      
      expect(positions1).not.toEqual(positions2);
    });

    it('should throw error for invalid reel count', () => {
      const theta = calculateTheta(mockEntropyData);
      
      expect(() => deriveReelPositions(theta, 'client-seed', 1, 2, 20))
        .toThrow('Reel count must be between 3 and 8');
      
      expect(() => deriveReelPositions(theta, 'client-seed', 1, 9, 20))
        .toThrow('Reel count must be between 3 and 8');
    });

    it('should throw error for invalid symbols per reel', () => {
      const theta = calculateTheta(mockEntropyData);
      
      expect(() => deriveReelPositions(theta, 'client-seed', 1, 5, 0))
        .toThrow('Symbols per reel must be at least 1');
    });
  });

  describe('calculateResultHash', () => {
    it('should calculate result hash', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions = [1, 2, 3, 4, 5];
      const hash = calculateResultHash(positions, theta, 'client-seed', 1);
      
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions = [1, 2, 3, 4, 5];
      const hash1 = calculateResultHash(positions, theta, 'client-seed', 1);
      const hash2 = calculateResultHash(positions, theta, 'client-seed', 1);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('createSpinResult', () => {
    it('should create spin result', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions = [1, 2, 3, 4, 5];
      const result = createSpinResult(positions, 20, theta, 'client-seed', 1);
      
      expect(result.reelPositions).toEqual(positions);
      expect(result.reelCount).toBe(5);
      expect(result.symbolsPerReel).toBe(20);
      expect(result.resultHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('signProof', () => {
    it('should sign proof data', () => {
      const signature = signProof('proof-data', 'secret');
      expect(signature).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      const sig1 = signProof('proof-data', 'secret');
      const sig2 = signProof('proof-data', 'secret');
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different secrets', () => {
      const sig1 = signProof('proof-data', 'secret1');
      const sig2 = signProof('proof-data', 'secret2');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('generateThetaProof', () => {
    it('should generate a complete theta proof', () => {
      const options: GenerateProofOptions = {
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20
      };
      
      const proof = generateThetaProof(options);
      
      expect(proof.proofId).toMatch(/^[0-9a-f]{32}$/);
      expect(proof.commitment).toMatch(/^[0-9a-f]{64}$/);
      expect(proof.theta).toMatch(/^[0-9a-f]{64}$/);
      expect(proof.clientSeed).toBe('client-seed');
      expect(proof.nonce).toBe(1);
      expect(proof.result.reelCount).toBe(5);
      expect(proof.result.reelPositions).toHaveLength(5);
      expect(proof.signature).toMatch(/^[0-9a-f]{64}$/);
      expect(proof.version).toBe('1.0.0');
    });

    it('should generate proof with server secret', () => {
      const options: GenerateProofOptions = {
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20,
        serverSecret: 'server-secret'
      };
      
      const proof = generateThetaProof(options);
      expect(proof.signature).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should throw error for missing entropy data', () => {
      expect(() => generateThetaProof({
        entropyData: null as unknown as EntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20
      })).toThrow('Entropy data is required');
    });

    it('should throw error for empty client seed', () => {
      expect(() => generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: '',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20
      })).toThrow('Client seed is required');
    });

    it('should throw error for negative nonce', () => {
      expect(() => generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: -1,
        reelCount: 5,
        symbolsPerReel: 20
      })).toThrow('Nonce must be non-negative');
    });
  });

  describe('createThetaCommitment', () => {
    it('should create theta commitment', () => {
      const commitment = createThetaCommitment(mockEntropyData);
      
      expect(commitment.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(commitment.entropySourceId).toBe(mockEntropyData.sourceHash);
      expect(commitment.timestamp).toBeLessThanOrEqual(Date.now());
      expect(commitment.expiresAt).toBeGreaterThan(commitment.timestamp);
    });
  });

  describe('createThetaReveal', () => {
    it('should create theta reveal', () => {
      const commitment = createThetaCommitment(mockEntropyData);
      const reveal = createThetaReveal(commitment, mockEntropyData);
      
      expect(reveal.commitment).toBe(commitment);
      expect(reveal.entropyData).toBe(mockEntropyData);
      expect(reveal.theta).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should throw error for mismatched entropy', () => {
      const commitment = createThetaCommitment(mockEntropyData);
      const differentEntropy = { ...mockEntropyData, hex: 'different-hex' };
      
      expect(() => createThetaReveal(commitment, differentEntropy))
        .toThrow('does not match commitment');
    });
  });

  describe('verifyTheta', () => {
    it('should verify valid theta', () => {
      const theta = calculateTheta(mockEntropyData);
      expect(verifyTheta(theta, mockEntropyData)).toBe(true);
    });

    it('should reject invalid theta', () => {
      expect(verifyTheta('invalid-theta', mockEntropyData)).toBe(false);
    });
  });

  describe('verifyReelPositions', () => {
    it('should verify valid positions', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions = deriveReelPositions(theta, 'client-seed', 1, 5, 20);
      
      expect(verifyReelPositions(positions, theta, 'client-seed', 1, 20)).toBe(true);
    });

    it('should reject invalid positions', () => {
      const theta = calculateTheta(mockEntropyData);
      const positions = [99, 99, 99, 99, 99]; // Invalid positions
      
      expect(verifyReelPositions(positions, theta, 'client-seed', 1, 20)).toBe(false);
    });

    it('should handle errors gracefully', () => {
      expect(verifyReelPositions([1, 2], 'theta', 'seed', 1, 20)).toBe(false);
    });
  });
});
