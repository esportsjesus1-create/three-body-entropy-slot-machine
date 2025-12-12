/**
 * Entropy Oracle
 * 
 * Main orchestrator that combines physics simulation with cryptographic
 * operations to generate provably fair entropy for slot machines.
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import {
  OracleConfig,
  EntropyRequestOptions,
  EntropyResponse,
  EntropyProof,
  RawEntropyResult,
  CacheEntry,
  OracleStats,
  VerificationResult,
  VerificationCheck,
  SimulationParams,
  InitialConditions
} from './types';
import {
  runSimulation,
  generateRandomConditions,
  getPresetConditions,
  validateConditions
} from './simulation';

/**
 * Default oracle configuration.
 */
const DEFAULT_CONFIG: OracleConfig = {
  defaultDuration: 10.0,
  defaultTimeStep: 0.001,
  defaultGravitationalConstant: 1.0,
  defaultSofteningParameter: 0.01,
  hashAlgorithm: 'sha256',
  cacheEnabled: true,
  cacheTTL: 60000 // 1 minute
};

/**
 * Entropy Oracle class.
 * Orchestrates entropy generation from three-body physics simulation.
 */
export class EntropyOracle {
  private config: OracleConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: OracleStats;
  private startTime: number;
  private serverSecret: string;

  constructor(config: Partial<OracleConfig> = {}, serverSecret?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    this.serverSecret = serverSecret || randomBytes(32).toString('hex');
    this.stats = {
      totalRequests: 0,
      totalSimulations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageSimulationTime: 0,
      uptime: 0
    };
  }

  /**
   * Generates a unique request ID.
   */
  private generateRequestId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Creates a commitment hash for the entropy.
   */
  private createCommitment(entropy: RawEntropyResult): string {
    const hash = createHash(this.config.hashAlgorithm);
    hash.update(entropy.hex);
    hash.update(entropy.sourceHash);
    return hash.digest('hex');
  }

  /**
   * Creates a proof for the entropy.
   */
  private createProof(
    entropy: RawEntropyResult,
    requestId: string,
    chainIndex?: number
  ): EntropyProof {
    const proofId = createHash(this.config.hashAlgorithm)
      .update(`${requestId}:${entropy.simulationId}`)
      .digest('hex')
      .substring(0, 32);

    const simulationHash = createHash(this.config.hashAlgorithm)
      .update(JSON.stringify(entropy.metadata))
      .digest('hex');

    const entropyHash = createHash(this.config.hashAlgorithm)
      .update(entropy.hex)
      .digest('hex');

    const signatureData = `${proofId}:${simulationHash}:${entropyHash}:${entropy.timestamp}`;
    const signature = createHmac(this.config.hashAlgorithm, this.serverSecret)
      .update(signatureData)
      .digest('hex');

    return {
      proofId,
      simulationHash,
      entropyHash,
      signature,
      chainIndex
    };
  }

  /**
   * Gets cached entropy if available and valid.
   */
  private getCachedEntropy(sessionId: string): RawEntropyResult | null {
    if (!this.config.cacheEnabled) return null;

    const entry = this.cache.get(sessionId);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt || entry.used) {
      this.cache.delete(sessionId);
      return null;
    }

    return entry.entropy;
  }

  /**
   * Caches entropy for later use.
   */
  private cacheEntropy(sessionId: string, entropy: RawEntropyResult): void {
    if (!this.config.cacheEnabled) return;

    const now = Date.now();
    this.cache.set(sessionId, {
      entropy,
      createdAt: now,
      expiresAt: now + this.config.cacheTTL,
      used: false
    });
  }

  /**
   * Marks cached entropy as used.
   */
  private markCacheUsed(sessionId: string): void {
    const entry = this.cache.get(sessionId);
    if (entry) {
      entry.used = true;
    }
  }

  /**
   * Requests entropy from the oracle.
   */
  async requestEntropy(options: EntropyRequestOptions): Promise<EntropyResponse> {
    this.stats.totalRequests++;
    const requestId = this.generateRequestId();

    // Check cache first
    let entropy = this.getCachedEntropy(options.sessionId);
    
    if (entropy) {
      this.stats.cacheHits++;
      this.markCacheUsed(options.sessionId);
    } else {
      this.stats.cacheMisses++;
      
      // Run simulation
      const startTime = Date.now();
      entropy = await this.generateEntropy(options);
      const simulationTime = Date.now() - startTime;

      // Update average simulation time
      this.stats.totalSimulations++;
      this.stats.averageSimulationTime = 
        (this.stats.averageSimulationTime * (this.stats.totalSimulations - 1) + simulationTime) 
        / this.stats.totalSimulations;

      // Cache the result
      this.cacheEntropy(options.sessionId, entropy);
      this.markCacheUsed(options.sessionId);
    }

    const commitment = this.createCommitment(entropy);
    const proof = this.createProof(entropy, requestId, options.nonce);

    return {
      requestId,
      commitment,
      entropy,
      proof,
      timestamp: Date.now()
    };
  }

  /**
   * Generates entropy from physics simulation.
   */
  private async generateEntropy(options: EntropyRequestOptions): Promise<RawEntropyResult> {
    const params: SimulationParams = options.simulationParams || {
      duration: this.config.defaultDuration,
      timeStep: this.config.defaultTimeStep
    };

    let conditions: InitialConditions;

    if (options.simulationParams?.initialConditions) {
      conditions = options.simulationParams.initialConditions;
    } else if (options.clientSeed) {
      // Generate conditions from client seed for reproducibility
      const seed = `${options.sessionId}:${options.clientSeed}:${options.nonce || 0}`;
      conditions = generateRandomConditions(seed);
    } else {
      // Generate random conditions
      conditions = generateRandomConditions();
    }

    // Validate conditions
    if (!validateConditions(conditions)) {
      throw new Error('Invalid initial conditions');
    }

    // Add default physics constants if not specified
    conditions.gravitationalConstant = conditions.gravitationalConstant || this.config.defaultGravitationalConstant;
    conditions.softeningParameter = conditions.softeningParameter || this.config.defaultSofteningParameter;

    return runSimulation(params, conditions);
  }

  /**
   * Pre-generates entropy for a session (for commitment before client seed).
   */
  async preGenerateEntropy(sessionId: string): Promise<string> {
    const entropy = await this.generateEntropy({ sessionId });
    this.cacheEntropy(sessionId, entropy);
    return this.createCommitment(entropy);
  }

  /**
   * Reveals pre-generated entropy after client provides seed.
   */
  async revealEntropy(
    sessionId: string,
    clientSeed: string,
    nonce: number
  ): Promise<EntropyResponse> {
    const cachedEntropy = this.getCachedEntropy(sessionId);
    
    if (!cachedEntropy) {
      throw new Error('No pre-generated entropy found for session');
    }

    this.markCacheUsed(sessionId);
    const requestId = this.generateRequestId();

    // Combine with client seed
    const combinedHash = createHmac(this.config.hashAlgorithm, cachedEntropy.hex)
      .update(`${clientSeed}:${nonce}`)
      .digest('hex');

    // Create modified entropy with combined hash
    const entropy: RawEntropyResult = {
      ...cachedEntropy,
      hex: combinedHash,
      sourceHash: createHash(this.config.hashAlgorithm)
        .update(combinedHash)
        .digest('hex')
    };

    const commitment = this.createCommitment(entropy);
    const proof = this.createProof(entropy, requestId, nonce);

    return {
      requestId,
      commitment,
      entropy,
      proof,
      timestamp: Date.now()
    };
  }

  /**
   * Verifies an entropy proof.
   */
  verifyProof(
    entropy: RawEntropyResult,
    proof: EntropyProof,
    commitment: string
  ): VerificationResult {
    const checks: VerificationCheck[] = [];

    // Check 1: Verify commitment
    const expectedCommitment = this.createCommitment(entropy);
    const commitmentValid = commitment === expectedCommitment;
    checks.push({
      name: 'commitment',
      passed: commitmentValid,
      expected: expectedCommitment,
      actual: commitment,
      details: commitmentValid ? 'Commitment matches' : 'Commitment mismatch'
    });

    // Check 2: Verify entropy hash
    const expectedEntropyHash = createHash(this.config.hashAlgorithm)
      .update(entropy.hex)
      .digest('hex');
    const entropyHashValid = proof.entropyHash === expectedEntropyHash;
    checks.push({
      name: 'entropyHash',
      passed: entropyHashValid,
      expected: expectedEntropyHash,
      actual: proof.entropyHash,
      details: entropyHashValid ? 'Entropy hash matches' : 'Entropy hash mismatch'
    });

    // Check 3: Verify simulation hash
    const expectedSimHash = createHash(this.config.hashAlgorithm)
      .update(JSON.stringify(entropy.metadata))
      .digest('hex');
    const simHashValid = proof.simulationHash === expectedSimHash;
    checks.push({
      name: 'simulationHash',
      passed: simHashValid,
      expected: expectedSimHash,
      actual: proof.simulationHash,
      details: simHashValid ? 'Simulation hash matches' : 'Simulation hash mismatch'
    });

    // Check 4: Verify signature
    const signatureData = `${proof.proofId}:${proof.simulationHash}:${proof.entropyHash}:${entropy.timestamp}`;
    const expectedSignature = createHmac(this.config.hashAlgorithm, this.serverSecret)
      .update(signatureData)
      .digest('hex');
    const signatureValid = proof.signature === expectedSignature;
    checks.push({
      name: 'signature',
      passed: signatureValid,
      details: signatureValid ? 'Signature valid' : 'Signature invalid'
    });

    // Check 5: Verify proof ID format
    const proofIdValid = /^[0-9a-f]{32}$/.test(proof.proofId);
    checks.push({
      name: 'proofId',
      passed: proofIdValid,
      details: proofIdValid ? 'Proof ID format valid' : 'Invalid proof ID format'
    });

    const allPassed = checks.every(c => c.passed);
    const failedCheck = checks.find(c => !c.passed);

    return {
      valid: allPassed,
      checks,
      error: failedCheck ? `${failedCheck.name}: ${failedCheck.details}` : undefined
    };
  }

  /**
   * Gets oracle statistics.
   */
  getStats(): OracleStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Gets the current configuration.
   */
  getConfig(): OracleConfig {
    return { ...this.config };
  }

  /**
   * Clears the entropy cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache size.
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Resets statistics.
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalSimulations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageSimulationTime: 0,
      uptime: 0
    };
    this.startTime = Date.now();
  }
}

/**
 * Creates a new entropy oracle instance.
 */
export function createOracle(
  config?: Partial<OracleConfig>,
  serverSecret?: string
): EntropyOracle {
  return new EntropyOracle(config, serverSecret);
}
