/**
 * Client Library Types
 * 
 * Defines the core data structures for the client-side slot machine API.
 */

/**
 * Supported reel counts.
 */
export type ReelCount = 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Reel configuration for a slot machine.
 */
export interface ReelConfiguration {
  /** Number of reels (3-8) */
  reelCount: ReelCount;
  /** Number of symbols per reel */
  symbolsPerReel: number;
  /** Symbol definitions (optional) */
  symbols?: SymbolDefinition[];
  /** Paylines (optional) */
  paylines?: Payline[];
}

/**
 * Symbol definition for a slot machine.
 */
export interface SymbolDefinition {
  /** Symbol ID */
  id: number;
  /** Symbol name */
  name: string;
  /** Symbol value/multiplier */
  value: number;
  /** Whether this is a wild symbol */
  isWild?: boolean;
  /** Whether this is a scatter symbol */
  isScatter?: boolean;
}

/**
 * Payline definition.
 */
export interface Payline {
  /** Payline ID */
  id: number;
  /** Positions for each reel (index in visible symbols) */
  positions: number[];
}

/**
 * Session details for a spin request.
 */
export interface SessionDetails {
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Game ID */
  gameId: string;
  /** Bet amount */
  betAmount: number;
  /** Currency */
  currency: string;
  /** Client seed for provably fair */
  clientSeed: string;
  /** Nonce (spin number) */
  nonce: number;
}

/**
 * Spin request to the server.
 */
export interface SpinRequest {
  /** Session details */
  session: SessionDetails;
  /** Reel configuration */
  reelConfig: ReelConfiguration;
}

/**
 * Spin response from the server.
 */
export interface SpinResponse {
  /** Whether the spin was successful */
  success: boolean;
  /** Spin result */
  result?: SpinResult;
  /** Error message if failed */
  error?: string;
  /** Server commitment for verification */
  serverCommitment?: string;
  /** Proof data for verification */
  proof?: ProofData;
}

/**
 * Spin result.
 */
export interface SpinResult {
  /** Reel positions (stop positions for each reel) */
  reelPositions: number[];
  /** Symbols at each position */
  symbols?: number[][];
  /** Win amount */
  winAmount: number;
  /** Win multiplier */
  multiplier: number;
  /** Winning paylines */
  winningPaylines?: WinningPayline[];
}

/**
 * Winning payline information.
 */
export interface WinningPayline {
  /** Payline ID */
  paylineId: number;
  /** Matching symbol */
  symbol: number;
  /** Number of matching symbols */
  matchCount: number;
  /** Win amount for this payline */
  winAmount: number;
}

/**
 * Proof data for verification.
 */
export interface ProofData {
  /** Proof ID */
  proofId: string;
  /** Server seed (revealed after spin) */
  serverSeed?: string;
  /** Theta value */
  theta: string;
  /** Result hash */
  resultHash: string;
  /** Signature */
  signature: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Verification result.
 */
export interface VerificationResult {
  /** Whether verification passed */
  valid: boolean;
  /** Individual check results */
  checks: VerificationCheck[];
  /** Error message if failed */
  error?: string;
}

/**
 * Individual verification check.
 */
export interface VerificationCheck {
  /** Check name */
  name: string;
  /** Whether check passed */
  passed: boolean;
  /** Expected value */
  expected?: string;
  /** Actual value */
  actual?: string;
  /** Details */
  details?: string;
}

/**
 * API client configuration.
 */
export interface ClientConfig {
  /** API endpoint URL */
  apiEndpoint: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Retry configuration */
  retry?: RetryConfig;
}

/**
 * Retry configuration.
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
}

/**
 * Entropy data from the server.
 */
export interface EntropyData {
  /** Entropy value (0-1) */
  value: number;
  /** Hex representation */
  hex: string;
  /** Source hash */
  sourceHash: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Hash chain data for verification.
 */
export interface HashChainData {
  /** Initial commitment */
  initialCommitment: string;
  /** Current hash */
  currentHash: string;
  /** Chain index */
  chainIndex: number;
  /** Chain length */
  chainLength: number;
}
