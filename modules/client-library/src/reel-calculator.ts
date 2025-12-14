/**
 * Reel Calculator
 * 
 * Deterministic conversion of entropy values to reel positions
 * for 3-8 reel slot machine configurations.
 */

import { createHash, createHmac } from 'crypto';
import {
  ReelCount,
  ReelConfiguration,
  SpinResult,
  WinningPayline,
  EntropyData,
  Payline
} from './types';

/**
 * Validates reel count is within supported range.
 */
export function validateReelCount(count: number): count is ReelCount {
  return count >= 3 && count <= 8 && Number.isInteger(count);
}

/**
 * Validates a reel configuration.
 */
export function validateReelConfiguration(config: ReelConfiguration): void {
  if (!validateReelCount(config.reelCount)) {
    throw new Error(`Invalid reel count: ${config.reelCount}. Must be between 3 and 8.`);
  }
  
  if (config.symbolsPerReel < 1) {
    throw new Error('Symbols per reel must be at least 1');
  }
  
  if (config.symbols && config.symbols.length === 0) {
    throw new Error('Symbols array cannot be empty if provided');
  }
  
  if (config.paylines) {
    for (const payline of config.paylines) {
      if (payline.positions.length !== config.reelCount) {
        throw new Error(`Payline ${payline.id} has ${payline.positions.length} positions but reel count is ${config.reelCount}`);
      }
    }
  }
}

/**
 * Calculates reel positions from entropy value.
 * 
 * @param entropyValue - Entropy value (0-1 or hex string)
 * @param reelConfig - Reel configuration
 * @param clientSeed - Client seed for additional randomization
 * @param nonce - Nonce value
 * @returns Array of reel positions
 */
export function calculateReelPositions(
  entropyValue: number | string,
  reelConfig: ReelConfiguration,
  clientSeed: string,
  nonce: number
): number[] {
  validateReelConfiguration(reelConfig);
  
  const { reelCount, symbolsPerReel } = reelConfig;
  const positions: number[] = [];
  
  // Convert entropy to hex if it's a number
  const entropyHex = typeof entropyValue === 'number'
    ? entropyValue.toString(16).padStart(16, '0')
    : entropyValue;
  
  for (let reel = 0; reel < reelCount; reel++) {
    // Create HMAC for each reel position
    const hmac = createHmac('sha256', entropyHex);
    hmac.update(`${clientSeed}:${nonce}:${reel}`);
    const reelHash = hmac.digest('hex');
    
    // Convert first 8 hex chars to number and mod by symbols
    const numericValue = parseInt(reelHash.substring(0, 8), 16);
    const position = numericValue % symbolsPerReel;
    positions.push(position);
  }
  
  return positions;
}

/**
 * Calculates reel result from entropy data.
 * 
 * @param entropyData - Entropy data from server
 * @param reelConfig - Reel configuration
 * @param clientSeed - Client seed
 * @param nonce - Nonce value
 * @returns Spin result
 */
export function calculateReelResult(
  entropyData: EntropyData,
  reelConfig: ReelConfiguration,
  clientSeed: string,
  nonce: number
): SpinResult {
  const positions = calculateReelPositions(
    entropyData.hex,
    reelConfig,
    clientSeed,
    nonce
  );
  
  // Get symbols at positions if symbol definitions exist
  const symbols = reelConfig.symbols
    ? positions.map(pos => [pos % reelConfig.symbols!.length])
    : undefined;
  
  // Calculate wins if paylines exist
  const { winAmount, multiplier, winningPaylines } = reelConfig.paylines && reelConfig.symbols
    ? calculateWins(positions, reelConfig)
    : { winAmount: 0, multiplier: 0, winningPaylines: undefined };
  
  return {
    reelPositions: positions,
    symbols,
    winAmount,
    multiplier,
    winningPaylines
  };
}

/**
 * Calculates wins based on paylines.
 */
function calculateWins(
  positions: number[],
  reelConfig: ReelConfiguration
): { winAmount: number; multiplier: number; winningPaylines: WinningPayline[] } {
  if (!reelConfig.paylines || !reelConfig.symbols) {
    return { winAmount: 0, multiplier: 0, winningPaylines: [] };
  }
  
  const winningPaylines: WinningPayline[] = [];
  let totalWinAmount = 0;
  
  for (const payline of reelConfig.paylines) {
    // Get symbols on this payline
    const paylineSymbols = payline.positions.map((pos, reelIndex) => {
      const symbolIndex = (positions[reelIndex] + pos) % reelConfig.symbols!.length;
      return reelConfig.symbols![symbolIndex];
    });
    
    // Check for matching symbols from left
    const firstSymbol = paylineSymbols[0];
    let matchCount = 1;
    
    for (let i = 1; i < paylineSymbols.length; i++) {
      const symbol = paylineSymbols[i];
      if (symbol.id === firstSymbol.id || symbol.isWild || firstSymbol.isWild) {
        matchCount++;
      } else {
        break;
      }
    }
    
    // Award win if 3+ matches
    if (matchCount >= 3) {
      const winAmount = firstSymbol.value * matchCount;
      winningPaylines.push({
        paylineId: payline.id,
        symbol: firstSymbol.id,
        matchCount,
        winAmount
      });
      totalWinAmount += winAmount;
    }
  }
  
  const multiplier = totalWinAmount > 0 ? totalWinAmount / 10 : 0; // Simple multiplier calculation
  
  return {
    winAmount: totalWinAmount,
    multiplier,
    winningPaylines
  };
}

/**
 * Generates a deterministic result hash.
 */
export function generateResultHash(
  positions: number[],
  entropyHex: string,
  clientSeed: string,
  nonce: number
): string {
  const hash = createHash('sha256');
  const data = [
    positions.join(','),
    entropyHex,
    clientSeed,
    nonce.toString()
  ].join(':');
  
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Verifies that reel positions match the expected calculation.
 */
export function verifyReelPositions(
  positions: number[],
  entropyData: EntropyData,
  reelConfig: ReelConfiguration,
  clientSeed: string,
  nonce: number
): boolean {
  try {
    const expectedPositions = calculateReelPositions(
      entropyData.hex,
      reelConfig,
      clientSeed,
      nonce
    );
    
    return positions.every((pos, i) => pos === expectedPositions[i]);
  } catch {
    return false;
  }
}

/**
 * Creates a default reel configuration.
 */
export function createDefaultReelConfig(reelCount: ReelCount): ReelConfiguration {
  return {
    reelCount,
    symbolsPerReel: 20,
    symbols: [
      { id: 0, name: 'Cherry', value: 5 },
      { id: 1, name: 'Lemon', value: 10 },
      { id: 2, name: 'Orange', value: 15 },
      { id: 3, name: 'Plum', value: 20 },
      { id: 4, name: 'Bell', value: 30 },
      { id: 5, name: 'Bar', value: 50 },
      { id: 6, name: 'Seven', value: 100 },
      { id: 7, name: 'Wild', value: 200, isWild: true }
    ]
  };
}

/**
 * Creates paylines for a given reel count.
 */
export function createDefaultPaylines(reelCount: ReelCount): Payline[] {
  const paylines: Payline[] = [];
  
  // Center line
  paylines.push({
    id: 1,
    positions: Array(reelCount).fill(1)
  });
  
  // Top line
  paylines.push({
    id: 2,
    positions: Array(reelCount).fill(0)
  });
  
  // Bottom line
  paylines.push({
    id: 3,
    positions: Array(reelCount).fill(2)
  });
  
  // V-shape
  if (reelCount >= 5) {
    paylines.push({
      id: 4,
      positions: [0, 1, 2, 1, 0, ...Array(reelCount - 5).fill(0)].slice(0, reelCount)
    });
    
    // Inverted V
    paylines.push({
      id: 5,
      positions: [2, 1, 0, 1, 2, ...Array(reelCount - 5).fill(2)].slice(0, reelCount)
    });
  }
  
  return paylines;
}
