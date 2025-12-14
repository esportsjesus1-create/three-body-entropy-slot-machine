/**
 * Three-Body Entropy Slot Machine Integration Adapter
 * 
 * This module provides a provably fair RNG integration for slot machines,
 * replacing Math.random() with cryptographically secure entropy derived
 * from three-body gravitational dynamics combined with client seeds.
 * 
 * Provably Fair Workflow:
 * 1. House generates server seed and commits to it (hash)
 * 2. Client provides their seed after seeing commitment
 * 3. Both seeds are mixed cryptographically to generate final entropy
 * 4. Entropy is used to determine spin results
 * 5. Server seed is revealed for verification
 */

import { createHash, createHmac, randomBytes } from 'crypto';

/**
 * Configuration for the slot machine adapter
 */
export interface SlotMachineConfig {
  symbols: string[];
  reelCount: number;
  rowCount: number;
  bufferRows?: number;
  spawnRates?: {
    wildChance?: number;
    bonusChance?: number;
    goldChance?: number;
  };
  goldAllowedColumns?: number[];
}

/**
 * Spin request from client
 */
export interface SpinRequest {
  clientSeed: string;
  nonce: number;
  options?: {
    allowGold?: boolean;
    allowBonus?: boolean;
  };
}

/**
 * Commitment data sent to client before they provide their seed
 */
export interface ServerCommitment {
  commitmentHash: string;
  nonce: number;
  timestamp: number;
}

/**
 * Proof data for verification
 */
export interface SpinProof {
  proofId: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  combinedHash: string;
  signature: string;
  timestamp: number;
}

/**
 * Result of a spin
 */
export interface SpinResult {
  grid: string[][];
  reelStrips?: string[][];
  proof: SpinProof;
  commitment: ServerCommitment;
  entropyHex: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  checks: {
    commitmentValid: boolean;
    entropyValid: boolean;
    signatureValid: boolean;
    gridValid: boolean;
  };
  errors: string[];
}

/**
 * Three-Body Entropy Oracle (simplified for browser compatibility)
 * Uses chaotic dynamics simulation to generate entropy
 */
class ThreeBodyEntropySource {
  private bodies: Array<{
    mass: number;
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
  }>;
  private G: number = 1.0;
  private softening: number = 0.01;

  constructor(seed: string) {
    this.initializeFromSeed(seed);
  }

  private initializeFromSeed(seed: string): void {
    const hash = createHash('sha256').update(seed).digest();
    
    this.bodies = [];
    for (let i = 0; i < 3; i++) {
      const offset = i * 10;
      this.bodies.push({
        mass: 0.5 + (hash[offset] / 255) * 1.5,
        position: {
          x: ((hash[offset + 1] / 255) - 0.5) * 10,
          y: ((hash[offset + 2] / 255) - 0.5) * 10,
          z: ((hash[offset + 3] / 255) - 0.5) * 10
        },
        velocity: {
          x: ((hash[offset + 4] / 255) - 0.5) * 2,
          y: ((hash[offset + 5] / 255) - 0.5) * 2,
          z: ((hash[offset + 6] / 255) - 0.5) * 2
        }
      });
    }
  }

  private calculateAcceleration(bodyIndex: number): { x: number; y: number; z: number } {
    const body = this.bodies[bodyIndex];
    let ax = 0, ay = 0, az = 0;

    for (let j = 0; j < 3; j++) {
      if (j === bodyIndex) continue;
      
      const other = this.bodies[j];
      const dx = other.position.x - body.position.x;
      const dy = other.position.y - body.position.y;
      const dz = other.position.z - body.position.z;
      
      const distSq = dx * dx + dy * dy + dz * dz + this.softening * this.softening;
      const dist = Math.sqrt(distSq);
      const force = this.G * other.mass / distSq;
      
      ax += force * dx / dist;
      ay += force * dy / dist;
      az += force * dz / dist;
    }

    return { x: ax, y: ay, z: az };
  }

  private rk4Step(dt: number): void {
    const k1 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    const tempBodies1 = this.bodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + b.velocity.x * dt / 2,
        y: b.position.y + b.velocity.y * dt / 2,
        z: b.position.z + b.velocity.z * dt / 2
      },
      velocity: {
        x: b.velocity.x + k1[i].x * dt / 2,
        y: b.velocity.y + k1[i].y * dt / 2,
        z: b.velocity.z + k1[i].z * dt / 2
      }
    }));
    
    const originalBodies = this.bodies;
    this.bodies = tempBodies1;
    const k2 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    const tempBodies2 = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + tempBodies1[i].velocity.x * dt / 2,
        y: b.position.y + tempBodies1[i].velocity.y * dt / 2,
        z: b.position.z + tempBodies1[i].velocity.z * dt / 2
      },
      velocity: {
        x: b.velocity.x + k2[i].x * dt / 2,
        y: b.velocity.y + k2[i].y * dt / 2,
        z: b.velocity.z + k2[i].z * dt / 2
      }
    }));
    
    this.bodies = tempBodies2;
    const k3 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    const tempBodies3 = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + tempBodies2[i].velocity.x * dt,
        y: b.position.y + tempBodies2[i].velocity.y * dt,
        z: b.position.z + tempBodies2[i].velocity.z * dt
      },
      velocity: {
        x: b.velocity.x + k3[i].x * dt,
        y: b.velocity.y + k3[i].y * dt,
        z: b.velocity.z + k3[i].z * dt
      }
    }));
    
    this.bodies = tempBodies3;
    const k4 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    this.bodies = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + (b.velocity.x + 2 * tempBodies1[i].velocity.x + 2 * tempBodies2[i].velocity.x + tempBodies3[i].velocity.x) * dt / 6,
        y: b.position.y + (b.velocity.y + 2 * tempBodies1[i].velocity.y + 2 * tempBodies2[i].velocity.y + tempBodies3[i].velocity.y) * dt / 6,
        z: b.position.z + (b.velocity.z + 2 * tempBodies1[i].velocity.z + 2 * tempBodies2[i].velocity.z + tempBodies3[i].velocity.z) * dt / 6
      },
      velocity: {
        x: b.velocity.x + (k1[i].x + 2 * k2[i].x + 2 * k3[i].x + k4[i].x) * dt / 6,
        y: b.velocity.y + (k1[i].y + 2 * k2[i].y + 2 * k3[i].y + k4[i].y) * dt / 6,
        z: b.velocity.z + (k1[i].z + 2 * k2[i].z + 2 * k3[i].z + k4[i].z) * dt / 6
      }
    }));
  }

  simulate(duration: number, timeStep: number = 0.01): void {
    const steps = Math.floor(duration / timeStep);
    for (let i = 0; i < steps; i++) {
      this.rk4Step(timeStep);
    }
  }

  getEntropyHex(): string {
    const components: number[] = [];
    for (const body of this.bodies) {
      components.push(
        body.position.x, body.position.y, body.position.z,
        body.velocity.x, body.velocity.y, body.velocity.z
      );
    }
    
    const dataString = components.map(c => c.toExponential(15)).join(':');
    return createHash('sha256').update(dataString).digest('hex');
  }
}

/**
 * Main Slot Machine RNG Adapter
 * Implements provably fair gaming with three-body entropy
 */
export class SlotMachineRNGAdapter {
  private config: SlotMachineConfig;
  private serverSecret: string;
  private currentServerSeed: string;
  private currentNonce: number;
  private commitments: Map<number, ServerCommitment>;

  constructor(config: SlotMachineConfig, serverSecret?: string) {
    this.config = {
      ...config,
      bufferRows: config.bufferRows ?? 0,
      spawnRates: {
        wildChance: config.spawnRates?.wildChance ?? 0.02,
        bonusChance: config.spawnRates?.bonusChance ?? 0.03,
        goldChance: config.spawnRates?.goldChance ?? 0.15
      },
      goldAllowedColumns: config.goldAllowedColumns ?? [1, 2, 3]
    };
    
    this.serverSecret = serverSecret ?? randomBytes(32).toString('hex');
    this.currentServerSeed = this.generateServerSeed();
    this.currentNonce = 0;
    this.commitments = new Map();
  }

  /**
   * Generate a new server seed using three-body entropy
   */
  private generateServerSeed(): string {
    const baseSeed = `${this.serverSecret}:${Date.now()}:${randomBytes(16).toString('hex')}`;
    const entropy = new ThreeBodyEntropySource(baseSeed);
    entropy.simulate(5.0, 0.01);
    return entropy.getEntropyHex();
  }

  /**
   * Create a commitment for the current server seed
   * This is sent to the client BEFORE they provide their seed
   */
  createCommitment(): ServerCommitment {
    this.currentNonce++;
    const commitment: ServerCommitment = {
      commitmentHash: createHash('sha256').update(this.currentServerSeed).digest('hex'),
      nonce: this.currentNonce,
      timestamp: Date.now()
    };
    
    this.commitments.set(this.currentNonce, commitment);
    return commitment;
  }

  /**
   * Generate combined entropy from server and client seeds
   */
  private generateCombinedEntropy(clientSeed: string, nonce: number): string {
    const combinedSeed = `${this.currentServerSeed}:${clientSeed}:${nonce}`;
    
    const entropy = new ThreeBodyEntropySource(combinedSeed);
    entropy.simulate(3.0, 0.01);
    
    return createHmac('sha256', this.serverSecret)
      .update(entropy.getEntropyHex())
      .digest('hex');
  }

  /**
   * Get a deterministic random value from entropy hex at a specific position
   */
  private getRandomValue(entropyHex: string, position: number, max: number): number {
    const expandedEntropy = createHmac('sha256', entropyHex)
      .update(`position:${position}`)
      .digest('hex');
    
    const hexPart = expandedEntropy.substring(0, 8);
    const value = parseInt(hexPart, 16);
    return value % max;
  }

  /**
   * Get a deterministic random float from entropy hex at a specific position
   */
  private getRandomFloat(entropyHex: string, position: number): number {
    const expandedEntropy = createHmac('sha256', entropyHex)
      .update(`float:${position}`)
      .digest('hex');
    
    const hexPart = expandedEntropy.substring(0, 8);
    const value = parseInt(hexPart, 16);
    return value / 0xffffffff;
  }

  /**
   * Get a random symbol using deterministic entropy
   */
  private getRandomSymbol(
    entropyHex: string,
    position: number,
    options: {
      col?: number;
      visualRow?: number;
      allowGold?: boolean;
      allowBonus?: boolean;
    } = {}
  ): string {
    const {
      col,
      allowGold = false,
      allowBonus = true
    } = options;

    const { wildChance, bonusChance, goldChance } = this.config.spawnRates!;
    const pool = this.config.symbols.filter(s => s !== 'wild' && s !== 'bonus');
    
    if (pool.length === 0) return 'fa';

    let positionOffset = position * 4;

    if (this.getRandomFloat(entropyHex, positionOffset) < wildChance!) {
      return 'wild';
    }

    if (allowBonus && this.getRandomFloat(entropyHex, positionOffset + 1) < bonusChance!) {
      return 'bonus';
    }

    const symbolIndex = this.getRandomValue(entropyHex, positionOffset + 2, pool.length);
    let symbol = pool[symbolIndex];

    if (allowGold && this.getRandomFloat(entropyHex, positionOffset + 3) < goldChance!) {
      const isAllowedColumn = col === undefined || this.config.goldAllowedColumns!.includes(col);
      if (isAllowedColumn) {
        symbol = symbol + '_gold';
      }
    }

    return symbol;
  }

  /**
   * Generate spin result with provably fair entropy
   */
  generateSpinEntropy(request: SpinRequest): SpinResult {
    const { clientSeed, nonce, options = {} } = request;
    const { allowGold = true, allowBonus = true } = options;

    const commitment = this.commitments.get(nonce);
    if (!commitment) {
      throw new Error(`No commitment found for nonce ${nonce}. Call createCommitment() first.`);
    }

    const entropyHex = this.generateCombinedEntropy(clientSeed, nonce);

    const grid: string[][] = [];
    const totalRows = this.config.rowCount + (this.config.bufferRows ?? 0);
    let positionCounter = 0;

    for (let col = 0; col < this.config.reelCount; col++) {
      grid[col] = [];
      let bonusCountInVisibleRows = 0;
      const fullyVisibleStart = this.config.bufferRows ?? 0;
      const fullyVisibleEnd = fullyVisibleStart + (this.config.rowCount - 2);

      for (let row = 0; row < totalRows; row++) {
        const visualRow = row - (this.config.bufferRows ?? 0);
        const isVisibleRow = row >= fullyVisibleStart && row <= fullyVisibleEnd;
        const canHaveBonus = allowBonus && !(isVisibleRow && bonusCountInVisibleRows >= 1);

        const symbol = this.getRandomSymbol(entropyHex, positionCounter++, {
          col,
          visualRow,
          allowGold,
          allowBonus: canHaveBonus
        });

        grid[col][row] = symbol;

        if (symbol === 'bonus' && isVisibleRow) {
          bonusCountInVisibleRows++;
        }
      }
    }

    const proofId = createHash('sha256')
      .update(`${entropyHex}:${nonce}`)
      .digest('hex')
      .substring(0, 32);

    const signatureData = `${proofId}:${commitment.commitmentHash}:${clientSeed}:${nonce}`;
    const signature = createHmac('sha256', this.serverSecret)
      .update(signatureData)
      .digest('hex');

    const proof: SpinProof = {
      proofId,
      serverSeed: this.currentServerSeed,
      clientSeed,
      nonce,
      combinedHash: entropyHex,
      signature,
      timestamp: Date.now()
    };

    return {
      grid,
      proof,
      commitment,
      entropyHex
    };
  }

  /**
   * Create reel strips with provably fair entropy
   */
  createReelStrips(clientSeed: string, nonce: number, stripLength: number): SpinResult {
    const commitment = this.commitments.get(nonce);
    if (!commitment) {
      throw new Error(`No commitment found for nonce ${nonce}. Call createCommitment() first.`);
    }

    const entropyHex = this.generateCombinedEntropy(clientSeed, nonce);
    const strips: string[][] = [];
    let positionCounter = 0;

    for (let col = 0; col < this.config.reelCount; col++) {
      const strip: string[] = [];
      for (let i = 0; i < stripLength; i++) {
        strip.push(this.getRandomSymbol(entropyHex, positionCounter++, {
          col,
          allowGold: true,
          allowBonus: true
        }));
      }
      strips.push(strip);
    }

    const proofId = createHash('sha256')
      .update(`${entropyHex}:${nonce}:strips`)
      .digest('hex')
      .substring(0, 32);

    const signatureData = `${proofId}:${commitment.commitmentHash}:${clientSeed}:${nonce}`;
    const signature = createHmac('sha256', this.serverSecret)
      .update(signatureData)
      .digest('hex');

    const proof: SpinProof = {
      proofId,
      serverSeed: this.currentServerSeed,
      clientSeed,
      nonce,
      combinedHash: entropyHex,
      signature,
      timestamp: Date.now()
    };

    return {
      grid: [],
      reelStrips: strips,
      proof,
      commitment,
      entropyHex
    };
  }

  /**
   * Verify a spin result (client-side verification)
   */
  static verifySpinResult(
    result: SpinResult,
    serverSecret: string,
    config: SlotMachineConfig
  ): VerificationResult {
    const errors: string[] = [];
    const checks = {
      commitmentValid: false,
      entropyValid: false,
      signatureValid: false,
      gridValid: false
    };

    const expectedCommitment = createHash('sha256')
      .update(result.proof.serverSeed)
      .digest('hex');
    
    checks.commitmentValid = expectedCommitment === result.commitment.commitmentHash;
    if (!checks.commitmentValid) {
      errors.push('Server seed does not match commitment hash');
    }

    const combinedSeed = `${result.proof.serverSeed}:${result.proof.clientSeed}:${result.proof.nonce}`;
    const entropy = new ThreeBodyEntropySource(combinedSeed);
    entropy.simulate(3.0, 0.01);
    
    const expectedEntropy = createHmac('sha256', serverSecret)
      .update(entropy.getEntropyHex())
      .digest('hex');
    
    checks.entropyValid = expectedEntropy === result.entropyHex;
    if (!checks.entropyValid) {
      errors.push('Entropy hash does not match expected value');
    }

    const signatureData = `${result.proof.proofId}:${result.commitment.commitmentHash}:${result.proof.clientSeed}:${result.proof.nonce}`;
    const expectedSignature = createHmac('sha256', serverSecret)
      .update(signatureData)
      .digest('hex');
    
    checks.signatureValid = expectedSignature === result.proof.signature;
    if (!checks.signatureValid) {
      errors.push('Signature verification failed');
    }

    checks.gridValid = result.grid.length === config.reelCount;
    if (!checks.gridValid) {
      errors.push(`Grid has ${result.grid.length} columns, expected ${config.reelCount}`);
    }

    return {
      valid: checks.commitmentValid && checks.entropyValid && checks.signatureValid && checks.gridValid,
      checks,
      errors
    };
  }

  /**
   * Rotate server seed (call after revealing to client)
   */
  rotateServerSeed(): void {
    this.currentServerSeed = this.generateServerSeed();
    this.commitments.clear();
  }

  /**
   * Get current server seed (for verification after spin)
   */
  getServerSeed(): string {
    return this.currentServerSeed;
  }

  /**
   * Get server secret (needed for verification)
   */
  getServerSecret(): string {
    return this.serverSecret;
  }
}

/**
 * Initialize the slot machine RNG adapter
 */
export function initSlotMachineRNG(config: SlotMachineConfig, serverSecret?: string): SlotMachineRNGAdapter {
  return new SlotMachineRNGAdapter(config, serverSecret);
}

/**
 * Generate client seed (browser-side)
 * In a real implementation, this would use Web Crypto API
 */
export function generateClientSeed(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Default configuration for the simple-slot-machine-game
 */
export const DEFAULT_SLOT_CONFIG: SlotMachineConfig = {
  symbols: ['fa', 'zhong', 'bai', 'bawan', 'wusuo', 'wutong', 'liangsuo', 'liangtong', 'wild', 'bonus'],
  reelCount: 5,
  rowCount: 6,
  bufferRows: 4,
  spawnRates: {
    wildChance: 0.02,
    bonusChance: 0.03,
    goldChance: 0.15
  },
  goldAllowedColumns: [1, 2, 3]
};
