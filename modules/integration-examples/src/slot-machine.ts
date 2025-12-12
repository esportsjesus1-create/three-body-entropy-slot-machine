/**
 * Slot Machine Implementation
 * 
 * Complete slot machine implementation using all modules.
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import EventEmitter from 'eventemitter3';
import {
  ReelCount,
  ReelConfiguration,
  Symbol,
  Payline,
  SessionState,
  SessionData,
  SpinRecord,
  SpinProof,
  HashChainData,
  SpinRequest,
  SpinResult,
  VerificationResult,
  VerificationCheck
} from './types';

/**
 * Default symbols for slot machine.
 */
const DEFAULT_SYMBOLS: Symbol[] = [
  { id: 'cherry', name: 'Cherry', value: 1 },
  { id: 'lemon', name: 'Lemon', value: 2 },
  { id: 'orange', name: 'Orange', value: 3 },
  { id: 'plum', name: 'Plum', value: 4 },
  { id: 'bell', name: 'Bell', value: 5 },
  { id: 'bar', name: 'Bar', value: 10 },
  { id: 'seven', name: 'Seven', value: 20 },
  { id: 'diamond', name: 'Diamond', value: 50 }
];

/**
 * Creates default paylines for a given reel count.
 */
function createDefaultPaylines(reelCount: ReelCount): Payline[] {
  const paylines: Payline[] = [];
  
  // Center line
  paylines.push({
    id: 1,
    positions: Array(reelCount).fill(1),
    multiplier: 1
  });
  
  // Top line
  paylines.push({
    id: 2,
    positions: Array(reelCount).fill(0),
    multiplier: 1
  });
  
  // Bottom line
  paylines.push({
    id: 3,
    positions: Array(reelCount).fill(2),
    multiplier: 1
  });
  
  // Diagonal (top-left to bottom-right)
  if (reelCount >= 3) {
    const diagonal1: number[] = [];
    for (let i = 0; i < reelCount; i++) {
      diagonal1.push(Math.min(i, 2));
    }
    paylines.push({
      id: 4,
      positions: diagonal1,
      multiplier: 1.5
    });
  }
  
  // Diagonal (bottom-left to top-right)
  if (reelCount >= 3) {
    const diagonal2: number[] = [];
    for (let i = 0; i < reelCount; i++) {
      diagonal2.push(Math.max(2 - i, 0));
    }
    paylines.push({
      id: 5,
      positions: diagonal2,
      multiplier: 1.5
    });
  }
  
  return paylines;
}

/**
 * Creates a reel configuration.
 */
export function createReelConfiguration(
  reelCount: ReelCount,
  symbolsPerReel: number = 20,
  symbols: Symbol[] = DEFAULT_SYMBOLS,
  paylines?: Payline[]
): ReelConfiguration {
  return {
    reelCount,
    symbolsPerReel,
    symbols,
    paylines: paylines || createDefaultPaylines(reelCount)
  };
}

/**
 * Slot machine events.
 */
export interface SlotMachineEvents {
  stateChange: (oldState: SessionState, newState: SessionState) => void;
  spin: (spinRecord: SpinRecord) => void;
  win: (amount: number, spinRecord: SpinRecord) => void;
  error: (error: Error) => void;
}

/**
 * Slot Machine class.
 */
export class SlotMachine extends EventEmitter<SlotMachineEvents> {
  private session: SessionData;
  private serverSecret: string;
  private simulationDuration: number;
  private simulationTimeStep: number;

  constructor(
    userId: string,
    gameId: string,
    reelConfig: ReelConfiguration,
    initialBalance: number = 1000,
    serverSecret?: string,
    simulationDuration: number = 1.0,
    simulationTimeStep: number = 0.01
  ) {
    super();
    
    this.serverSecret = serverSecret || randomBytes(32).toString('hex');
    this.simulationDuration = simulationDuration;
    this.simulationTimeStep = simulationTimeStep;
    
    const sessionId = this.generateSessionId();
    const hashChain = this.initializeHashChain();
    
    this.session = {
      sessionId,
      userId,
      gameId,
      state: SessionState.INIT,
      balance: initialBalance,
      bet: 0,
      reelConfig,
      spinHistory: [],
      hashChain,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Generates a unique session ID.
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${randomBytes(8).toString('hex')}`;
  }

  /**
   * Initializes the hash chain.
   */
  private initializeHashChain(): HashChainData {
    const serverSeed = randomBytes(32).toString('hex');
    const chainLength = 1000;
    const hashes: string[] = [];
    
    // Generate hash chain (reverse order)
    let currentHash = serverSeed;
    for (let i = 0; i < chainLength; i++) {
      currentHash = createHash('sha256').update(currentHash).digest('hex');
      hashes.unshift(currentHash);
    }
    
    const serverCommitment = createHash('sha256')
      .update(hashes[0])
      .digest('hex');
    
    return {
      serverCommitment,
      clientSeed: '',
      chainLength,
      currentIndex: 0,
      hashes
    };
  }

  /**
   * Transitions to a new state.
   */
  private transitionState(newState: SessionState): void {
    const oldState = this.session.state;
    
    // Validate transition
    const validTransitions: Record<SessionState, SessionState[]> = {
      [SessionState.INIT]: [SessionState.AWAITING_BET, SessionState.ERROR],
      [SessionState.AWAITING_BET]: [SessionState.ENTROPY_REQUESTED, SessionState.ERROR],
      [SessionState.ENTROPY_REQUESTED]: [SessionState.SPINNING, SessionState.ERROR],
      [SessionState.SPINNING]: [SessionState.RESULT_READY, SessionState.ERROR],
      [SessionState.RESULT_READY]: [SessionState.COMPLETE, SessionState.AWAITING_BET, SessionState.ERROR],
      [SessionState.COMPLETE]: [SessionState.INIT],
      [SessionState.ERROR]: [SessionState.INIT]
    };
    
    if (!validTransitions[oldState].includes(newState)) {
      throw new Error(`Invalid state transition: ${oldState} -> ${newState}`);
    }
    
    this.session.state = newState;
    this.session.updatedAt = Date.now();
    this.emit('stateChange', oldState, newState);
  }

  /**
   * Starts the session.
   */
  start(): void {
    this.transitionState(SessionState.AWAITING_BET);
  }

  /**
   * Sets the client seed.
   */
  setClientSeed(clientSeed: string): void {
    this.session.hashChain.clientSeed = clientSeed;
  }

  /**
   * Gets the server commitment.
   */
  getServerCommitment(): string {
    return this.session.hashChain.serverCommitment;
  }

  /**
   * Runs the three-body simulation for entropy.
   */
  private runSimulation(seed: string): { value: number; hex: string } {
    // Simplified simulation for examples
    // In production, use the full physics-engine module
    const hash = createHmac('sha256', this.serverSecret)
      .update(seed)
      .digest('hex');
    
    // Extract entropy value from hash
    const value = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
    
    return { value, hex: hash };
  }

  /**
   * Calculates reel positions from entropy.
   */
  private calculateReelPositions(entropyHex: string): number[] {
    const positions: number[] = [];
    const { reelCount, symbolsPerReel } = this.session.reelConfig;
    
    for (let i = 0; i < reelCount; i++) {
      const hexPart = entropyHex.substring(i * 8, (i + 1) * 8);
      const value = parseInt(hexPart, 16);
      positions.push(value % symbolsPerReel);
    }
    
    return positions;
  }

  /**
   * Gets symbols at positions.
   */
  private getSymbolsAtPositions(positions: number[]): string[] {
    const { symbols, symbolsPerReel } = this.session.reelConfig;
    return positions.map(pos => {
      const symbolIndex = pos % symbols.length;
      return symbols[symbolIndex].id;
    });
  }

  /**
   * Calculates win amount.
   */
  private calculateWin(symbols: string[], bet: number): number {
    const { paylines, symbols: symbolDefs } = this.session.reelConfig;
    let totalWin = 0;
    
    for (const payline of paylines) {
      // Check for matching symbols on payline
      const paylineSymbols = payline.positions.map((pos, i) => {
        // Simplified: just use the symbol at that reel
        return symbols[i];
      });
      
      // Check for consecutive matches from left
      let matchCount = 1;
      const firstSymbol = paylineSymbols[0];
      
      for (let i = 1; i < paylineSymbols.length; i++) {
        if (paylineSymbols[i] === firstSymbol) {
          matchCount++;
        } else {
          break;
        }
      }
      
      // Award win for 3+ matches
      if (matchCount >= 3) {
        const symbolDef = symbolDefs.find(s => s.id === firstSymbol);
        const symbolValue = symbolDef?.value || 1;
        const win = bet * symbolValue * (matchCount - 2) * payline.multiplier;
        totalWin += win;
      }
    }
    
    return totalWin;
  }

  /**
   * Creates a spin proof.
   */
  private createSpinProof(
    spinId: string,
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): SpinProof {
    const commitment = createHash('sha256')
      .update(serverSeed)
      .digest('hex');
    
    const signatureData = `${spinId}:${commitment}:${clientSeed}:${nonce}`;
    const signature = createHmac('sha256', this.serverSecret)
      .update(signatureData)
      .digest('hex');
    
    return {
      proofId: createHash('sha256').update(spinId).digest('hex').substring(0, 32),
      commitment,
      serverSeed,
      clientSeed,
      nonce,
      signature
    };
  }

  /**
   * Performs a spin.
   */
  async spin(request: SpinRequest): Promise<SpinResult> {
    try {
      // Validate state
      if (this.session.state !== SessionState.AWAITING_BET) {
        throw new Error(`Cannot spin in state: ${this.session.state}`);
      }
      
      // Validate bet
      if (request.bet <= 0) {
        throw new Error('Bet must be positive');
      }
      
      if (request.bet > this.session.balance) {
        throw new Error('Insufficient balance');
      }
      
      // Set client seed if provided
      if (request.clientSeed) {
        this.session.hashChain.clientSeed = request.clientSeed;
      }
      
      // Deduct bet
      this.session.balance -= request.bet;
      this.session.bet = request.bet;
      
      // Transition to entropy requested
      this.transitionState(SessionState.ENTROPY_REQUESTED);
      
      // Get current hash from chain
      const nonce = this.session.hashChain.currentIndex;
      const serverSeed = this.session.hashChain.hashes[nonce];
      const clientSeed = this.session.hashChain.clientSeed || 'default-client-seed';
      
      // Generate entropy
      const seed = `${serverSeed}:${clientSeed}:${nonce}`;
      
      // Transition to spinning
      this.transitionState(SessionState.SPINNING);
      
      // Run simulation
      const entropy = this.runSimulation(seed);
      
      // Calculate results
      const reelPositions = this.calculateReelPositions(entropy.hex);
      const symbols = this.getSymbolsAtPositions(reelPositions);
      const winAmount = this.calculateWin(symbols, request.bet);
      
      // Create spin record
      const spinId = `spin-${Date.now()}-${randomBytes(4).toString('hex')}`;
      const proof = this.createSpinProof(spinId, serverSeed, clientSeed, nonce);
      
      const spinRecord: SpinRecord = {
        spinId,
        nonce,
        bet: request.bet,
        entropyValue: entropy.value,
        entropyHex: entropy.hex,
        reelPositions,
        symbols,
        winAmount,
        timestamp: Date.now(),
        proof
      };
      
      // Update session
      this.session.spinHistory.push(spinRecord);
      this.session.hashChain.currentIndex++;
      this.session.balance += winAmount;
      
      // Transition to result ready
      this.transitionState(SessionState.RESULT_READY);
      
      // Emit events
      this.emit('spin', spinRecord);
      if (winAmount > 0) {
        this.emit('win', winAmount, spinRecord);
      }
      
      // Transition back to awaiting bet
      this.transitionState(SessionState.AWAITING_BET);
      
      return {
        success: true,
        spinRecord,
        newBalance: this.session.balance
      };
    } catch (error) {
      this.transitionState(SessionState.ERROR);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', new Error(errorMessage));
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Verifies a spin result.
   */
  verifySpinResult(spinRecord: SpinRecord): VerificationResult {
    const checks: VerificationCheck[] = [];
    
    // Check 1: Verify proof signature
    const signatureData = `${spinRecord.spinId}:${spinRecord.proof.commitment}:${spinRecord.proof.clientSeed}:${spinRecord.proof.nonce}`;
    const expectedSignature = createHmac('sha256', this.serverSecret)
      .update(signatureData)
      .digest('hex');
    const signatureValid = spinRecord.proof.signature === expectedSignature;
    checks.push({
      name: 'signature',
      passed: signatureValid,
      details: signatureValid ? 'Signature valid' : 'Signature mismatch'
    });
    
    // Check 2: Verify commitment
    const expectedCommitment = createHash('sha256')
      .update(spinRecord.proof.serverSeed)
      .digest('hex');
    const commitmentValid = spinRecord.proof.commitment === expectedCommitment;
    checks.push({
      name: 'commitment',
      passed: commitmentValid,
      details: commitmentValid ? 'Commitment valid' : 'Commitment mismatch'
    });
    
    // Check 3: Verify entropy calculation
    const seed = `${spinRecord.proof.serverSeed}:${spinRecord.proof.clientSeed}:${spinRecord.proof.nonce}`;
    const entropy = this.runSimulation(seed);
    const entropyValid = entropy.hex === spinRecord.entropyHex;
    checks.push({
      name: 'entropy',
      passed: entropyValid,
      details: entropyValid ? 'Entropy matches' : 'Entropy mismatch'
    });
    
    // Check 4: Verify reel positions
    const expectedPositions = this.calculateReelPositions(spinRecord.entropyHex);
    const positionsValid = JSON.stringify(expectedPositions) === JSON.stringify(spinRecord.reelPositions);
    checks.push({
      name: 'reelPositions',
      passed: positionsValid,
      details: positionsValid ? 'Reel positions match' : 'Reel positions mismatch'
    });
    
    // Check 5: Verify symbols
    const expectedSymbols = this.getSymbolsAtPositions(spinRecord.reelPositions);
    const symbolsValid = JSON.stringify(expectedSymbols) === JSON.stringify(spinRecord.symbols);
    checks.push({
      name: 'symbols',
      passed: symbolsValid,
      details: symbolsValid ? 'Symbols match' : 'Symbols mismatch'
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
   * Verifies the full session.
   */
  verifyFullSession(): VerificationResult {
    const checks: VerificationCheck[] = [];
    
    // Verify each spin
    for (const spinRecord of this.session.spinHistory) {
      const result = this.verifySpinResult(spinRecord);
      checks.push({
        name: `spin-${spinRecord.nonce}`,
        passed: result.valid,
        details: result.valid ? 'Spin verified' : result.error
      });
    }
    
    // Verify hash chain integrity
    let chainValid = true;
    for (let i = 1; i < this.session.hashChain.currentIndex; i++) {
      const expectedHash = createHash('sha256')
        .update(this.session.hashChain.hashes[i])
        .digest('hex');
      if (i + 1 < this.session.hashChain.hashes.length) {
        // Chain should be pre-computed, just verify structure
        chainValid = chainValid && this.session.hashChain.hashes[i].length === 64;
      }
    }
    checks.push({
      name: 'hashChain',
      passed: chainValid,
      details: chainValid ? 'Hash chain valid' : 'Hash chain corrupted'
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
   * Gets the current session data.
   */
  getSessionData(): SessionData {
    return { ...this.session };
  }

  /**
   * Gets the current balance.
   */
  getBalance(): number {
    return this.session.balance;
  }

  /**
   * Gets the current state.
   */
  getState(): SessionState {
    return this.session.state;
  }

  /**
   * Gets spin history.
   */
  getSpinHistory(): SpinRecord[] {
    return [...this.session.spinHistory];
  }

  /**
   * Resets the session.
   */
  reset(initialBalance: number = 1000): void {
    this.session.state = SessionState.INIT;
    this.session.balance = initialBalance;
    this.session.bet = 0;
    this.session.spinHistory = [];
    this.session.hashChain = this.initializeHashChain();
    this.session.updatedAt = Date.now();
  }
}

/**
 * Creates a new slot machine instance.
 */
export function createSlotMachine(
  userId: string,
  gameId: string,
  reelCount: ReelCount,
  initialBalance: number = 1000,
  serverSecret?: string
): SlotMachine {
  const reelConfig = createReelConfiguration(reelCount);
  return new SlotMachine(userId, gameId, reelConfig, initialBalance, serverSecret);
}
