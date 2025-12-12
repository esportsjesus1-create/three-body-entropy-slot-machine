/**
 * Commitment Scheme Unit Tests
 */

import {
  generateServerSeed,
  generateServerCommitment,
  generateServerCommitmentWithNonce,
  verifyCommitment,
  createServerReveal,
  combineSeedsForResult,
  verifyCombinedResult,
  generateClientSeed,
  createProvablyFairRound
} from '../src/commitment';

describe('Commitment Scheme', () => {
  describe('generateServerSeed', () => {
    it('should generate a random hex string', () => {
      const seed = generateServerSeed();
      
      expect(seed).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate seeds of specified length', () => {
      const seed = generateServerSeed(16);
      
      expect(seed).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique seeds', () => {
      const seeds = new Set<string>();
      for (let i = 0; i < 100; i++) {
        seeds.add(generateServerSeed());
      }
      
      expect(seeds.size).toBe(100);
    });

    it('should throw error for non-positive length', () => {
      expect(() => generateServerSeed(0)).toThrow('Seed length must be positive');
      expect(() => generateServerSeed(-1)).toThrow('Seed length must be positive');
    });
  });

  describe('generateServerCommitment', () => {
    it('should create a commitment from server seed', () => {
      const serverSeed = 'test-server-seed';
      const commitment = generateServerCommitment(serverSeed);
      
      expect(commitment.commitmentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(commitment.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should be deterministic', () => {
      const serverSeed = 'test-server-seed';
      const commitment1 = generateServerCommitment(serverSeed);
      const commitment2 = generateServerCommitment(serverSeed);
      
      expect(commitment1.commitmentHash).toBe(commitment2.commitmentHash);
    });

    it('should produce different commitments for different seeds', () => {
      const commitment1 = generateServerCommitment('seed1');
      const commitment2 = generateServerCommitment('seed2');
      
      expect(commitment1.commitmentHash).not.toBe(commitment2.commitmentHash);
    });

    it('should throw error for empty seed', () => {
      expect(() => generateServerCommitment('')).toThrow('Server seed cannot be empty');
    });
  });

  describe('generateServerCommitmentWithNonce', () => {
    it('should create a commitment with nonce', () => {
      const serverSeed = 'test-server-seed';
      const nonce = 'test-nonce';
      const commitment = generateServerCommitmentWithNonce(serverSeed, nonce);
      
      expect(commitment.commitmentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(commitment.nonce).toBe(nonce);
    });

    it('should produce different commitment than without nonce', () => {
      const serverSeed = 'test-server-seed';
      const commitment1 = generateServerCommitment(serverSeed);
      const commitment2 = generateServerCommitmentWithNonce(serverSeed, 'nonce');
      
      expect(commitment1.commitmentHash).not.toBe(commitment2.commitmentHash);
    });

    it('should throw error for empty seed', () => {
      expect(() => generateServerCommitmentWithNonce('', 'nonce')).toThrow('Server seed cannot be empty');
    });

    it('should throw error for empty nonce', () => {
      expect(() => generateServerCommitmentWithNonce('seed', '')).toThrow('Nonce cannot be empty');
    });
  });

  describe('verifyCommitment', () => {
    it('should verify valid commitment', () => {
      const serverSeed = 'test-server-seed';
      const commitment = generateServerCommitment(serverSeed);
      
      expect(verifyCommitment(serverSeed, commitment)).toBe(true);
    });

    it('should reject invalid server seed', () => {
      const serverSeed = 'test-server-seed';
      const commitment = generateServerCommitment(serverSeed);
      
      expect(verifyCommitment('wrong-seed', commitment)).toBe(false);
    });

    it('should verify commitment with nonce', () => {
      const serverSeed = 'test-server-seed';
      const nonce = 'test-nonce';
      const commitment = generateServerCommitmentWithNonce(serverSeed, nonce);
      
      expect(verifyCommitment(serverSeed, commitment)).toBe(true);
    });

    it('should return false for empty server seed', () => {
      const commitment = generateServerCommitment('test-seed');
      
      expect(verifyCommitment('', commitment)).toBe(false);
    });
  });

  describe('createServerReveal', () => {
    it('should create reveal for valid commitment', () => {
      const serverSeed = 'test-server-seed';
      const commitment = generateServerCommitment(serverSeed);
      const reveal = createServerReveal(serverSeed, commitment);
      
      expect(reveal.serverSeed).toBe(serverSeed);
      expect(reveal.commitmentHash).toBe(commitment.commitmentHash);
      expect(reveal.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should throw error for invalid seed', () => {
      const serverSeed = 'test-server-seed';
      const commitment = generateServerCommitment(serverSeed);
      
      expect(() => createServerReveal('wrong-seed', commitment)).toThrow('does not match commitment');
    });
  });

  describe('combineSeedsForResult', () => {
    it('should combine seeds and nonce', () => {
      const result = combineSeedsForResult('server-seed', 'client-seed', 1);
      
      expect(result.serverSeed).toBe('server-seed');
      expect(result.clientSeed).toBe('client-seed');
      expect(result.nonce).toBe(1);
      expect(result.combinedHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      const result1 = combineSeedsForResult('server-seed', 'client-seed', 1);
      const result2 = combineSeedsForResult('server-seed', 'client-seed', 1);
      
      expect(result1.combinedHash).toBe(result2.combinedHash);
    });

    it('should produce different results for different inputs', () => {
      const result1 = combineSeedsForResult('server-seed', 'client-seed', 1);
      const result2 = combineSeedsForResult('server-seed', 'client-seed', 2);
      const result3 = combineSeedsForResult('server-seed', 'different', 1);
      
      expect(result1.combinedHash).not.toBe(result2.combinedHash);
      expect(result1.combinedHash).not.toBe(result3.combinedHash);
    });

    it('should accept string nonce', () => {
      const result = combineSeedsForResult('server-seed', 'client-seed', 'string-nonce');
      
      expect(result.nonce).toBe('string-nonce');
      expect(result.combinedHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should throw error for empty server seed', () => {
      expect(() => combineSeedsForResult('', 'client-seed', 1)).toThrow('Server seed cannot be empty');
    });

    it('should throw error for empty client seed', () => {
      expect(() => combineSeedsForResult('server-seed', '', 1)).toThrow('Client seed cannot be empty');
    });
  });

  describe('verifyCombinedResult', () => {
    it('should verify valid combined result', () => {
      const result = combineSeedsForResult('server-seed', 'client-seed', 1);
      
      expect(verifyCombinedResult(result)).toBe(true);
    });

    it('should reject tampered result', () => {
      const result = combineSeedsForResult('server-seed', 'client-seed', 1);
      const tamperedResult = { ...result, combinedHash: 'tampered-hash' };
      
      expect(verifyCombinedResult(tamperedResult)).toBe(false);
    });
  });

  describe('generateClientSeed', () => {
    it('should generate random seed without input', () => {
      const seed = generateClientSeed();
      
      expect(seed).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should hash user input', () => {
      const seed = generateClientSeed('user input');
      
      expect(seed).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic with same input', () => {
      const seed1 = generateClientSeed('user input');
      const seed2 = generateClientSeed('user input');
      
      expect(seed1).toBe(seed2);
    });

    it('should generate unique random seeds', () => {
      const seeds = new Set<string>();
      for (let i = 0; i < 100; i++) {
        seeds.add(generateClientSeed());
      }
      
      expect(seeds.size).toBe(100);
    });
  });

  describe('createProvablyFairRound', () => {
    it('should create a provably fair round', () => {
      const round = createProvablyFairRound('client-seed', 1);
      
      expect(round.commitment.commitmentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(round.isRevealed()).toBe(false);
    });

    it('should reveal and calculate result', () => {
      const round = createProvablyFairRound('client-seed', 1);
      const result = round.reveal();
      
      expect(result.clientSeed).toBe('client-seed');
      expect(result.nonce).toBe(1);
      expect(result.combinedHash).toMatch(/^[0-9a-f]{64}$/);
      expect(round.isRevealed()).toBe(true);
    });

    it('should throw error on double reveal', () => {
      const round = createProvablyFairRound('client-seed', 1);
      round.reveal();
      
      expect(() => round.reveal()).toThrow('already been revealed');
    });

    it('should verify after reveal', () => {
      const round = createProvablyFairRound('client-seed', 1);
      round.reveal();
      
      expect(round.verify()).toBe(true);
    });

    it('should throw error on verify before reveal', () => {
      const round = createProvablyFairRound('client-seed', 1);
      
      expect(() => round.verify()).toThrow('not been revealed');
    });

    it('should get reveal data after reveal', () => {
      const round = createProvablyFairRound('client-seed', 1);
      round.reveal();
      const revealData = round.getReveal();
      
      expect(revealData.serverSeed).toBeDefined();
      expect(revealData.commitmentHash).toBe(round.commitment.commitmentHash);
    });

    it('should throw error on getReveal before reveal', () => {
      const round = createProvablyFairRound('client-seed', 1);
      
      expect(() => round.getReveal()).toThrow('not been revealed');
    });
  });
});
