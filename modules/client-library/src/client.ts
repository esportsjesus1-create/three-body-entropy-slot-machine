/**
 * Slot Machine Client
 * 
 * API abstraction for calling server-side spin logic
 * with support for 3-8 reel configurations.
 */

import { createHash, createHmac } from 'crypto';
import {
  ClientConfig,
  SessionDetails,
  SpinRequest,
  SpinResponse,
  SpinResult,
  ReelConfiguration,
  VerificationResult,
  VerificationCheck,
  ProofData,
  EntropyData,
  HashChainData
} from './types';
import {
  calculateReelPositions,
  calculateReelResult,
  generateResultHash,
  verifyReelPositions,
  validateReelConfiguration
} from './reel-calculator';

/**
 * Default client configuration.
 */
const DEFAULT_CONFIG: ClientConfig = {
  apiEndpoint: 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
};

/**
 * Slot Machine Client class.
 * Provides API abstraction for interacting with the server.
 */
export class SlotMachineClient {
  private config: ClientConfig;
  private hashChainData?: HashChainData;

  constructor(config: Partial<ClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Sets the API endpoint URL.
   * 
   * @param url - API endpoint URL
   */
  setApiEndpoint(url: string): void {
    if (!url || url.trim() === '') {
      throw new Error('API endpoint URL is required');
    }
    this.config.apiEndpoint = url;
  }

  /**
   * Gets the current API endpoint.
   */
  getApiEndpoint(): string {
    return this.config.apiEndpoint;
  }

  /**
   * Sets custom headers.
   * 
   * @param headers - Headers to set
   */
  setHeaders(headers: Record<string, string>): void {
    this.config.headers = { ...this.config.headers, ...headers };
  }

  /**
   * Sets the request timeout.
   * 
   * @param timeout - Timeout in milliseconds
   */
  setTimeout(timeout: number): void {
    if (timeout < 0) {
      throw new Error('Timeout must be non-negative');
    }
    this.config.timeout = timeout;
  }

  /**
   * Requests a spin from the server.
   * 
   * @param sessionDetails - Session details
   * @param reelConfig - Reel configuration
   * @returns Spin response
   */
  async requestSpin(
    sessionDetails: SessionDetails,
    reelConfig: ReelConfiguration
  ): Promise<SpinResponse> {
    validateReelConfiguration(reelConfig);

    const request: SpinRequest = {
      session: sessionDetails,
      reelConfig
    };

    try {
      // In a real implementation, this would make an HTTP request
      // For now, we simulate the server response
      const response = await this.simulateServerSpin(request);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Simulates a server spin (for testing/demo purposes).
   * In production, this would be replaced with actual HTTP calls.
   */
  private async simulateServerSpin(request: SpinRequest): Promise<SpinResponse> {
    const { session, reelConfig } = request;

    // Generate mock entropy data
    const entropyData: EntropyData = {
      value: Math.random(),
      hex: createHash('sha256')
        .update(`${session.sessionId}:${session.nonce}:${Date.now()}`)
        .digest('hex'),
      sourceHash: createHash('sha256')
        .update(`source:${session.sessionId}`)
        .digest('hex'),
      timestamp: Date.now()
    };

    // Calculate result
    const result = calculateReelResult(
      entropyData,
      reelConfig,
      session.clientSeed,
      session.nonce
    );

    // Generate proof
    const proof: ProofData = {
      proofId: createHash('sha256')
        .update(`proof:${session.sessionId}:${session.nonce}`)
        .digest('hex')
        .substring(0, 32),
      theta: createHash('sha256')
        .update(`theta:${entropyData.hex}`)
        .digest('hex'),
      resultHash: generateResultHash(
        result.reelPositions,
        entropyData.hex,
        session.clientSeed,
        session.nonce
      ),
      signature: createHmac('sha256', 'server-secret')
        .update(`${result.reelPositions.join(',')}:${entropyData.hex}`)
        .digest('hex'),
      timestamp: Date.now()
    };

    // Generate server commitment
    const serverCommitment = createHash('sha256')
      .update(entropyData.hex)
      .digest('hex');

    return {
      success: true,
      result,
      serverCommitment,
      proof
    };
  }

  /**
   * Calculates reel result locally (client-side verification).
   * 
   * @param entropyValue - Entropy value from server
   * @param reelConfig - Reel configuration
   * @param clientSeed - Client seed
   * @param nonce - Nonce value
   * @returns Spin result
   */
  calculateReelResult(
    entropyValue: number | string,
    reelConfig: ReelConfiguration,
    clientSeed: string,
    nonce: number
  ): SpinResult {
    const entropyHex = typeof entropyValue === 'number'
      ? entropyValue.toString(16).padStart(16, '0')
      : entropyValue;

    const entropyData: EntropyData = {
      value: typeof entropyValue === 'number' ? entropyValue : 0,
      hex: entropyHex,
      sourceHash: '',
      timestamp: Date.now()
    };

    return calculateReelResult(entropyData, reelConfig, clientSeed, nonce);
  }

  /**
   * Verifies a spin result for fairness.
   * 
   * @param result - Spin result to verify
   * @param proof - Proof data from server
   * @param entropyData - Entropy data
   * @param reelConfig - Reel configuration
   * @param clientSeed - Client seed
   * @param nonce - Nonce value
   * @returns Verification result
   */
  verifySpinResult(
    result: SpinResult,
    proof: ProofData,
    entropyData: EntropyData,
    reelConfig: ReelConfiguration,
    clientSeed: string,
    nonce: number
  ): VerificationResult {
    const checks: VerificationCheck[] = [];

    // Check 1: Verify reel positions
    const positionsValid = verifyReelPositions(
      result.reelPositions,
      entropyData,
      reelConfig,
      clientSeed,
      nonce
    );
    checks.push({
      name: 'reelPositions',
      passed: positionsValid,
      details: positionsValid ? 'Reel positions match' : 'Reel positions do not match'
    });

    // Check 2: Verify result hash
    const expectedHash = generateResultHash(
      result.reelPositions,
      entropyData.hex,
      clientSeed,
      nonce
    );
    const hashValid = proof.resultHash === expectedHash;
    checks.push({
      name: 'resultHash',
      passed: hashValid,
      expected: expectedHash,
      actual: proof.resultHash,
      details: hashValid ? 'Result hash matches' : 'Result hash mismatch'
    });

    // Check 3: Verify timestamp
    const now = Date.now();
    const timestampValid = proof.timestamp <= now && now - proof.timestamp < 60000;
    checks.push({
      name: 'timestamp',
      passed: timestampValid,
      details: timestampValid ? 'Timestamp is valid' : 'Timestamp is invalid or expired'
    });

    // Check 4: Verify proof ID format
    const proofIdValid = /^[0-9a-f]{32}$/.test(proof.proofId);
    checks.push({
      name: 'proofId',
      passed: proofIdValid,
      details: proofIdValid ? 'Proof ID format is valid' : 'Invalid proof ID format'
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
   * Verifies a hash chain.
   * 
   * @param initialCommitment - Initial commitment hash
   * @param hashes - Sequence of hashes to verify
   * @returns Verification result
   */
  verifyHashChain(
    initialCommitment: string,
    hashes: string[]
  ): VerificationResult {
    const checks: VerificationCheck[] = [];

    if (hashes.length === 0) {
      return {
        valid: false,
        checks: [{
          name: 'chainLength',
          passed: false,
          details: 'Hash chain is empty'
        }],
        error: 'Hash chain is empty'
      };
    }

    // Verify each link in the chain
    let currentHash = initialCommitment;
    let chainValid = true;

    for (let i = 0; i < hashes.length; i++) {
      const expectedHash = createHash('sha256')
        .update(hashes[i])
        .digest('hex');

      if (i < hashes.length - 1) {
        const nextHash = hashes[i + 1];
        const linkValid = createHash('sha256').update(nextHash).digest('hex') === hashes[i];
        
        if (!linkValid) {
          chainValid = false;
          checks.push({
            name: `link_${i}`,
            passed: false,
            expected: hashes[i],
            actual: createHash('sha256').update(nextHash).digest('hex'),
            details: `Chain link ${i} is invalid`
          });
          break;
        }
      }
    }

    if (chainValid) {
      checks.push({
        name: 'chainIntegrity',
        passed: true,
        details: 'Hash chain is valid'
      });
    }

    return {
      valid: chainValid,
      checks,
      error: chainValid ? undefined : 'Hash chain verification failed'
    };
  }

  /**
   * Sets hash chain data for verification.
   * 
   * @param data - Hash chain data
   */
  setHashChainData(data: HashChainData): void {
    this.hashChainData = data;
  }

  /**
   * Gets the current hash chain data.
   */
  getHashChainData(): HashChainData | undefined {
    return this.hashChainData;
  }

  /**
   * Generates a client seed.
   * 
   * @param userInput - Optional user input for seed generation
   * @returns Client seed
   */
  generateClientSeed(userInput?: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const input = userInput || '';
    
    return createHash('sha256')
      .update(`${timestamp}:${random}:${input}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Gets the client configuration.
   */
  getConfig(): ClientConfig {
    return { ...this.config };
  }
}

/**
 * Creates a new slot machine client instance.
 * 
 * @param config - Optional configuration
 * @returns SlotMachineClient instance
 */
export function createClient(config?: Partial<ClientConfig>): SlotMachineClient {
  return new SlotMachineClient(config);
}
