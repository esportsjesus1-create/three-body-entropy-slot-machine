/**
 * Integration Examples Types
 * 
 * Defines the core data structures for slot machine examples.
 */

/**
 * Reel count type (3-8 reels supported).
 */
export type ReelCount = 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Symbol on a reel.
 */
export interface Symbol {
  id: string;
  name: string;
  value: number;
}

/**
 * Reel configuration.
 */
export interface ReelConfiguration {
  reelCount: ReelCount;
  symbolsPerReel: number;
  symbols: Symbol[];
  paylines: Payline[];
}

/**
 * Payline definition.
 */
export interface Payline {
  id: number;
  positions: number[];
  multiplier: number;
}

/**
 * Session state.
 */
export enum SessionState {
  INIT = 'INIT',
  AWAITING_BET = 'AWAITING_BET',
  ENTROPY_REQUESTED = 'ENTROPY_REQUESTED',
  SPINNING = 'SPINNING',
  RESULT_READY = 'RESULT_READY',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

/**
 * Session data.
 */
export interface SessionData {
  sessionId: string;
  userId: string;
  gameId: string;
  state: SessionState;
  balance: number;
  bet: number;
  reelConfig: ReelConfiguration;
  spinHistory: SpinRecord[];
  hashChain: HashChainData;
  createdAt: number;
  updatedAt: number;
}

/**
 * Spin record.
 */
export interface SpinRecord {
  spinId: string;
  nonce: number;
  bet: number;
  entropyValue: number;
  entropyHex: string;
  reelPositions: number[];
  symbols: string[];
  winAmount: number;
  timestamp: number;
  proof: SpinProof;
}

/**
 * Spin proof for verification.
 */
export interface SpinProof {
  proofId: string;
  commitment: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  signature: string;
}

/**
 * Hash chain data.
 */
export interface HashChainData {
  serverCommitment: string;
  clientSeed: string;
  chainLength: number;
  currentIndex: number;
  hashes: string[];
}

/**
 * Spin request.
 */
export interface SpinRequest {
  sessionId: string;
  bet: number;
  clientSeed?: string;
}

/**
 * Spin result.
 */
export interface SpinResult {
  success: boolean;
  spinRecord?: SpinRecord;
  newBalance?: number;
  error?: string;
}

/**
 * Verification result.
 */
export interface VerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
  error?: string;
}

/**
 * Individual verification check.
 */
export interface VerificationCheck {
  name: string;
  passed: boolean;
  details?: string;
}

/**
 * Example configuration.
 */
export interface ExampleConfig {
  reelCount: ReelCount;
  initialBalance: number;
  defaultBet: number;
  serverSecret: string;
  simulationDuration: number;
  simulationTimeStep: number;
}

/**
 * Example result.
 */
export interface ExampleResult {
  success: boolean;
  sessionData: SessionData;
  spinResults: SpinResult[];
  verificationResults: VerificationResult[];
  totalSpins: number;
  totalWins: number;
  totalLosses: number;
  finalBalance: number;
  executionTime: number;
}
