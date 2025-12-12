/**
 * Hash Chain Integration Tests
 * 
 * Tests the complete workflow of the hash chain module for provably fair gaming.
 */

import {
  generateServerSeed,
  generateServerCommitment,
  verifyCommitment,
  combineSeedsForResult,
  verifyCombinedResult,
  generateClientSeed,
  createProvablyFairRound,
  generateHashChain,
  verifyHashChain,
  deriveNextHash,
  hashToNumber,
  hashToFloat,
  deriveSeed
} from '../src';

describe('Hash Chain Integration', () => {
  describe('Complete provably fair workflow', () => {
    it('should complete a full provably fair round', () => {
      // Step 1: Server generates seed and commitment
      const serverSeed = generateServerSeed();
      const commitment = generateServerCommitment(serverSeed);
      
      // Step 2: Client provides their seed
      const clientSeed = generateClientSeed('user-input-123');
      const nonce = 1;
      
      // Step 3: Game is played, result is calculated
      const result = combineSeedsForResult(serverSeed, clientSeed, nonce);
      
      // Step 4: Server reveals seed
      const isValidCommitment = verifyCommitment(serverSeed, commitment);
      expect(isValidCommitment).toBe(true);
      
      // Step 5: Client verifies result
      const isValidResult = verifyCombinedResult(result);
      expect(isValidResult).toBe(true);
    });

    it('should support multiple rounds with same server seed', () => {
      const serverSeed = generateServerSeed();
      const commitment = generateServerCommitment(serverSeed);
      const clientSeed = generateClientSeed();
      
      const results: string[] = [];
      
      for (let nonce = 1; nonce <= 10; nonce++) {
        const result = combineSeedsForResult(serverSeed, clientSeed, nonce);
        results.push(result.combinedHash);
        
        expect(verifyCombinedResult(result)).toBe(true);
      }
      
      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(10);
      
      // Commitment should still be valid
      expect(verifyCommitment(serverSeed, commitment)).toBe(true);
    });
  });

  describe('Hash chain for multiple games', () => {
    it('should use hash chain for sequential games', () => {
      // Generate a chain for 100 games
      const terminalSeed = generateServerSeed();
      const chain = generateHashChain({
        terminalSeed,
        length: 100
      });
      
      // Publish initial commitment
      const initialCommitment = chain.initialCommitment;
      
      // Play games in order, revealing hashes
      const clientSeed = generateClientSeed();
      const revealedHashes: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const serverHash = chain.hashes[i].hash;
        revealedHashes.push(serverHash);
        
        // Derive game result
        const result = deriveNextHash({
          previousHash: serverHash,
          clientSeed,
          nonce: i
        });
        
        expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
      }
      
      // Verify the revealed portion of the chain
      const verification = verifyHashChain(initialCommitment, revealedHashes);
      expect(verification.valid).toBe(true);
    });

    it('should detect tampering in hash chain', () => {
      const terminalSeed = generateServerSeed();
      const chain = generateHashChain({
        terminalSeed,
        length: 20
      });
      
      // Tamper with one hash
      const tamperedHashes = chain.hashes.map(h => h.hash);
      tamperedHashes[10] = generateServerSeed(); // Replace with random hash
      
      const verification = verifyHashChain(chain.initialCommitment, tamperedHashes);
      expect(verification.valid).toBe(false);
    });
  });

  describe('Slot machine result generation', () => {
    it('should generate deterministic reel positions', () => {
      const serverSeed = generateServerSeed();
      const clientSeed = generateClientSeed();
      const nonce = 1;
      
      const result = combineSeedsForResult(serverSeed, clientSeed, nonce);
      
      // Generate positions for 5 reels with 20 symbols each
      const reelCount = 5;
      const symbolCount = 20;
      const positions: number[] = [];
      
      for (let reel = 0; reel < reelCount; reel++) {
        const reelResult = deriveNextHash({
          previousHash: result.combinedHash,
          clientSeed: `reel-${reel}`,
          nonce: reel
        });
        
        const position = hashToNumber(reelResult.hash, symbolCount);
        positions.push(position);
        
        expect(position).toBeGreaterThanOrEqual(0);
        expect(position).toBeLessThan(symbolCount);
      }
      
      // Verify reproducibility
      const positions2: number[] = [];
      for (let reel = 0; reel < reelCount; reel++) {
        const reelResult = deriveNextHash({
          previousHash: result.combinedHash,
          clientSeed: `reel-${reel}`,
          nonce: reel
        });
        positions2.push(hashToNumber(reelResult.hash, symbolCount));
      }
      
      expect(positions).toEqual(positions2);
    });

    it('should generate fair distribution of results', () => {
      const serverSeed = generateServerSeed();
      const clientSeed = generateClientSeed();
      const symbolCount = 10;
      const sampleSize = 1000;
      
      const distribution: number[] = new Array(symbolCount).fill(0);
      
      for (let nonce = 0; nonce < sampleSize; nonce++) {
        const result = combineSeedsForResult(serverSeed, clientSeed, nonce);
        const position = hashToNumber(result.combinedHash, symbolCount);
        distribution[position]++;
      }
      
      // Each symbol should appear roughly 10% of the time (within 5% tolerance)
      const expectedCount = sampleSize / symbolCount;
      const tolerance = expectedCount * 0.5; // 50% tolerance for small sample
      
      distribution.forEach(count => {
        expect(count).toBeGreaterThan(expectedCount - tolerance);
        expect(count).toBeLessThan(expectedCount + tolerance);
      });
    });
  });

  describe('HKDF integration', () => {
    it('should derive consistent seeds across components', () => {
      const serverSeed = generateServerSeed();
      const clientSeed = generateClientSeed();
      const nonce = 42;
      
      // Derive seed using HKDF
      const derivedSeed1 = deriveSeed(serverSeed, clientSeed, nonce);
      const derivedSeed2 = deriveSeed(serverSeed, clientSeed, nonce);
      
      expect(derivedSeed1).toBe(derivedSeed2);
      
      // Different nonce should produce different seed
      const derivedSeed3 = deriveSeed(serverSeed, clientSeed, nonce + 1);
      expect(derivedSeed1).not.toBe(derivedSeed3);
    });
  });

  describe('createProvablyFairRound integration', () => {
    it('should complete full round lifecycle', () => {
      const clientSeed = generateClientSeed('my-custom-seed');
      const nonce = 1;
      
      // Create round
      const round = createProvablyFairRound(clientSeed, nonce);
      
      // Commitment is available immediately
      expect(round.commitment.commitmentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(round.isRevealed()).toBe(false);
      
      // Reveal and get result
      const result = round.reveal();
      expect(round.isRevealed()).toBe(true);
      
      // Convert to game outcome
      const outcome = hashToFloat(result.combinedHash);
      expect(outcome).toBeGreaterThanOrEqual(0);
      expect(outcome).toBeLessThan(1);
      
      // Verify round
      expect(round.verify()).toBe(true);
      
      // Get reveal data for client verification
      const revealData = round.getReveal();
      expect(verifyCommitment(revealData.serverSeed, round.commitment)).toBe(true);
    });

    it('should support batch verification', () => {
      const clientSeed = generateClientSeed();
      const rounds: ReturnType<typeof createProvablyFairRound>[] = [];
      const results: { commitment: string; serverSeed: string; result: string }[] = [];
      
      // Create and play multiple rounds
      for (let i = 0; i < 10; i++) {
        const round = createProvablyFairRound(clientSeed, i);
        rounds.push(round);
        
        const result = round.reveal();
        const reveal = round.getReveal();
        
        results.push({
          commitment: round.commitment.commitmentHash,
          serverSeed: reveal.serverSeed,
          result: result.combinedHash
        });
      }
      
      // Batch verify all rounds
      results.forEach(({ commitment, serverSeed, result }, index) => {
        const recalculatedCommitment = generateServerCommitment(serverSeed);
        expect(recalculatedCommitment.commitmentHash).toBe(commitment);
        
        const recalculatedResult = combineSeedsForResult(serverSeed, clientSeed, index);
        expect(recalculatedResult.combinedHash).toBe(result);
      });
    });
  });
});
