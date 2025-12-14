/**
 * Entropy Service
 * 
 * Handles three-body physics entropy generation for provably fair spins.
 * Pre-generates house seeds for sub-50ms latency.
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import { RedisService } from './redis.js';
import { DatabaseService, Spin, SpinResult, SpinProof } from './database.js';

const SYMBOLS = ['fa', 'zhong', 'bai', 'bawan', 'wusuo', 'wutong', 'liangsuo', 'liangtong', 'wild', 'bonus'];

interface HouseCommitment {
  sessionId: string;
  houseSeed: string;
  commitment: string;
  thetaAngles: number[];
  createdAt: Date;
}

export class EntropyService {
  private redis: RedisService;
  private database: DatabaseService;
  private preGeneratedSeeds: HouseCommitment[] = [];
  private readonly SPIN_FEE_CENTS = 10; // $0.10 per spin

  constructor(redis: RedisService, database: DatabaseService) {
    this.redis = redis;
    this.database = database;
    
    // Pre-generate seeds on startup
    this.preGenerateSeeds(100);
    
    // Continuously replenish seeds
    setInterval(() => {
      if (this.preGeneratedSeeds.length < 50) {
        this.preGenerateSeeds(50);
      }
    }, 5000);
  }

  /**
   * Pre-generate house seeds for fast spin execution
   */
  private preGenerateSeeds(count: number): void {
    for (let i = 0; i < count; i++) {
      const houseSeed = randomBytes(32).toString('hex');
      const sessionId = randomBytes(16).toString('hex');
      
      // Simulate three-body physics to get theta angles
      const thetaAngles = this.simulateThreeBodyPhysics(houseSeed);
      
      // Create commitment hash
      const commitment = createHash('sha256')
        .update(houseSeed)
        .digest('hex');

      this.preGeneratedSeeds.push({
        sessionId,
        houseSeed,
        commitment,
        thetaAngles,
        createdAt: new Date()
      });
    }
  }

  /**
   * Simulate three-body physics to generate theta angles
   * This is a simplified version - the full simulation is in the physics-engine module
   */
  private simulateThreeBodyPhysics(seed: string): number[] {
    // Use seed to deterministically generate initial conditions
    const hash = createHash('sha256').update(seed).digest();
    
    // Extract theta angles from hash (0 to 2π)
    const theta1 = (hash.readUInt32BE(0) / 0xFFFFFFFF) * Math.PI * 2;
    const theta2 = (hash.readUInt32BE(4) / 0xFFFFFFFF) * Math.PI * 2;
    const theta3 = (hash.readUInt32BE(8) / 0xFFFFFFFF) * Math.PI * 2;

    return [theta1, theta2, theta3];
  }

  /**
   * Create a new spin commitment
   */
  async createCommitment(partnerId: string, apiKeyId: string): Promise<{
    sessionId: string;
    commitment: string;
    expiresAt: Date;
  }> {
    // Pop a pre-generated seed
    const seed = this.preGeneratedSeeds.shift();
    if (!seed) {
      // Generate on-demand if pool is empty
      this.preGenerateSeeds(10);
      return this.createCommitment(partnerId, apiKeyId);
    }

    // Store in database
    await this.database.createSpin({
      partnerId,
      apiKeyId,
      sessionId: seed.sessionId,
      commitment: seed.commitment,
      houseSeed: seed.houseSeed,
      feeCents: this.SPIN_FEE_CENTS
    });

    // Cache commitment in Redis
    await this.redis.set(
      `commitment:${seed.sessionId}`,
      JSON.stringify({
        partnerId,
        houseSeed: seed.houseSeed,
        thetaAngles: seed.thetaAngles,
        commitment: seed.commitment
      }),
      300 // 5 minute expiry
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    return {
      sessionId: seed.sessionId,
      commitment: seed.commitment,
      expiresAt
    };
  }

  /**
   * Reveal spin result with client seed mixing
   */
  async revealSpin(sessionId: string, clientSeed?: string): Promise<{
    result: SpinResult;
    proof: SpinProof;
    houseSeed: string;
    testMode: boolean;
  }> {
    // Get commitment from cache or database
    const cached = await this.redis.get(`commitment:${sessionId}`);
    let commitmentData: {
      partnerId: string;
      houseSeed: string;
      thetaAngles: number[];
      commitment: string;
    };

    if (cached) {
      commitmentData = JSON.parse(cached);
    } else {
      const spin = await this.database.getSpin(sessionId);
      if (!spin) {
        throw new Error('Session not found or expired');
      }
      commitmentData = {
        partnerId: spin.partnerId,
        houseSeed: spin.houseSeed,
        thetaAngles: this.simulateThreeBodyPhysics(spin.houseSeed),
        commitment: spin.commitment
      };
    }

    const testMode = !clientSeed;
    const effectiveClientSeed = clientSeed || 'test_mode_' + Date.now();

    // Mix entropy
    const combinedSeed = createHmac('sha256', commitmentData.houseSeed)
      .update(effectiveClientSeed)
      .digest('hex');

    // Generate result from combined entropy
    const result = this.calculateSpinResult(combinedSeed, commitmentData.thetaAngles);

    // Create proof
    const proof: SpinProof = {
      thetaAngles: commitmentData.thetaAngles,
      entropyHex: combinedSeed,
      combinedSeedHash: createHash('sha256').update(combinedSeed).digest('hex'),
      verificationHash: createHash('sha256')
        .update(commitmentData.houseSeed + effectiveClientSeed)
        .digest('hex')
    };

    // Update spin in database
    await this.database.updateSpin(sessionId, {
      clientSeed: effectiveClientSeed,
      result,
      proof,
      revealedAt: new Date()
    });

    // Create ledger entry for spin fee
    const spin = await this.database.getSpin(sessionId);
    if (spin) {
      await this.database.createLedgerEntry({
        partnerId: spin.partnerId,
        amountCents: this.SPIN_FEE_CENTS,
        type: 'spin_fee',
        spinId: sessionId,
        description: `Spin fee for session ${sessionId}`
      });
    }

    // Clear cache
    await this.redis.del(`commitment:${sessionId}`);

    return {
      result,
      proof,
      houseSeed: commitmentData.houseSeed,
      testMode
    };
  }

  /**
   * Quick spin (commit + reveal in one call)
   */
  async quickSpin(partnerId: string, apiKeyId: string, clientSeed?: string): Promise<{
    sessionId: string;
    commitment: string;
    result: SpinResult;
    proof: SpinProof;
    houseSeed: string;
    testMode: boolean;
  }> {
    const { sessionId, commitment } = await this.createCommitment(partnerId, apiKeyId);
    const { result, proof, houseSeed, testMode } = await this.revealSpin(sessionId, clientSeed);

    return {
      sessionId,
      commitment,
      result,
      proof,
      houseSeed,
      testMode
    };
  }

  /**
   * Calculate spin result from entropy
   */
  private calculateSpinResult(entropy: string, thetaAngles: number[]): SpinResult {
    const hash = createHash('sha256').update(entropy).digest();
    const reelCount = 5;
    const positions: number[] = [];
    const symbols: string[] = [];

    for (let i = 0; i < reelCount; i++) {
      // Use theta angles and hash to determine position
      const thetaIndex = i % 3;
      const hashByte = hash[i * 4];
      const position = Math.floor(((thetaAngles[thetaIndex] / (Math.PI * 2)) + (hashByte / 255)) * SYMBOLS.length) % SYMBOLS.length;
      
      positions.push(position);
      symbols.push(SYMBOLS[position]);
    }

    // Calculate win (simplified)
    const { winAmount, multiplier } = this.calculateWin(symbols);

    return {
      symbols,
      positions,
      winAmount,
      multiplier
    };
  }

  /**
   * Calculate win amount based on symbols
   */
  private calculateWin(symbols: string[]): { winAmount: number; multiplier: number } {
    // Count symbol occurrences
    const counts: Record<string, number> = {};
    symbols.forEach(s => {
      counts[s] = (counts[s] || 0) + 1;
    });

    // Check for wins
    let maxCount = 0;
    let winningSymbol = '';
    for (const [symbol, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        winningSymbol = symbol;
      }
    }

    // Multipliers based on matches
    const multipliers: Record<number, number> = {
      3: 5,
      4: 25,
      5: 100
    };

    // Special symbols have higher multipliers
    const symbolMultipliers: Record<string, number> = {
      wild: 2,
      bonus: 3,
      fa: 1.5
    };

    if (maxCount >= 3) {
      const baseMultiplier = multipliers[maxCount] || 1;
      const symbolBonus = symbolMultipliers[winningSymbol] || 1;
      const multiplier = baseMultiplier * symbolBonus;
      const winAmount = Math.floor(100 * multiplier); // Base bet of 100 cents

      return { winAmount, multiplier };
    }

    return { winAmount: 0, multiplier: 0 };
  }

  /**
   * Verify a spin result
   */
  async verifySpin(sessionId: string): Promise<{
    valid: boolean;
    spin: Spin | null;
    verification: {
      commitmentValid: boolean;
      proofValid: boolean;
      resultValid: boolean;
    };
  }> {
    const spin = await this.database.getSpin(sessionId);
    if (!spin) {
      return {
        valid: false,
        spin: null,
        verification: {
          commitmentValid: false,
          proofValid: false,
          resultValid: false
        }
      };
    }

    // Verify commitment
    const expectedCommitment = createHash('sha256')
      .update(spin.houseSeed)
      .digest('hex');
    const commitmentValid = expectedCommitment === spin.commitment;

    // Verify proof
    let proofValid = false;
    let resultValid = false;

    if (spin.proof && spin.clientSeed) {
      const expectedCombinedHash = createHash('sha256')
        .update(spin.houseSeed + spin.clientSeed)
        .digest('hex');
      proofValid = expectedCombinedHash === spin.proof.verificationHash;

      // Verify result
      const combinedSeed = createHmac('sha256', spin.houseSeed)
        .update(spin.clientSeed)
        .digest('hex');
      const expectedResult = this.calculateSpinResult(combinedSeed, spin.proof.thetaAngles);
      resultValid = JSON.stringify(expectedResult.symbols) === JSON.stringify(spin.result?.symbols);
    }

    return {
      valid: commitmentValid && proofValid && resultValid,
      spin,
      verification: {
        commitmentValid,
        proofValid,
        resultValid
      }
    };
  }
}
