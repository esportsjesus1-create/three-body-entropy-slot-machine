/**
 * Statistical Analysis Utilities for Slot Adapter Validation
 * 
 * Provides chi-square tests, RTP calculations, and confidence intervals
 * for validating slot machine fairness.
 */

import { sum, mean, std, sqrt } from 'mathjs';

/**
 * Symbol distribution data structure.
 */
export interface SymbolDistribution {
  symbolId: string;
  observed: number;
  expected: number;
}

/**
 * Chi-square test result.
 */
export interface ChiSquareResult {
  chiSquareStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  isSignificant: boolean;
}

/**
 * Distribution analysis result.
 */
export interface DistributionAnalysis {
  symbolDistributions: SymbolDistribution[];
  chiSquareResult: ChiSquareResult;
  chiSquarePValue: number;
  totalSamples: number;
}

/**
 * RTP (Return to Player) analysis result.
 */
export interface RTPAnalysis {
  rtp: number;
  totalWagered: number;
  totalReturned: number;
  sampleSize: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  standardError: number;
}

/**
 * Spin result for analysis.
 */
export interface SpinResultForAnalysis {
  symbols: string[];
  winAmount: number;
  bet: number;
}

/**
 * Chi-square critical values for common significance levels.
 * Key: degrees of freedom, Value: critical value at alpha = 0.05
 */
const CHI_SQUARE_CRITICAL_VALUES: Record<number, number> = {
  1: 3.841,
  2: 5.991,
  3: 7.815,
  4: 9.488,
  5: 11.070,
  6: 12.592,
  7: 14.067,
  8: 15.507,
  9: 16.919,
  10: 18.307,
  11: 19.675,
  12: 21.026,
  13: 22.362,
  14: 23.685,
  15: 24.996,
  20: 31.410,
  25: 37.652,
  30: 43.773
};

/**
 * Approximates the chi-square p-value using the Wilson-Hilferty transformation.
 * This provides a reasonable approximation for large degrees of freedom.
 */
function approximateChiSquarePValue(chiSquare: number, df: number): number {
  if (df <= 0 || chiSquare < 0) {
    return 1;
  }

  // Wilson-Hilferty transformation
  const z = Math.pow(chiSquare / df, 1/3) - (1 - 2 / (9 * df));
  const denominator = Math.sqrt(2 / (9 * df));
  const standardNormal = z / denominator;

  // Approximate p-value using standard normal CDF
  // Using the error function approximation
  const pValue = 1 - normalCDF(standardNormal);
  
  return Math.max(0, Math.min(1, pValue));
}

/**
 * Standard normal cumulative distribution function approximation.
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Performs a chi-square goodness-of-fit test.
 */
export function chiSquareTest(
  observed: number[],
  expected: number[]
): ChiSquareResult {
  if (observed.length !== expected.length) {
    throw new Error('Observed and expected arrays must have the same length');
  }

  const df = observed.length - 1;
  
  let chiSquareStatistic = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      const diff = observed[i] - expected[i];
      chiSquareStatistic += (diff * diff) / expected[i];
    }
  }

  const pValue = approximateChiSquarePValue(chiSquareStatistic, df);
  const criticalValue = CHI_SQUARE_CRITICAL_VALUES[df] || CHI_SQUARE_CRITICAL_VALUES[30];
  const isSignificant = chiSquareStatistic > criticalValue;

  return {
    chiSquareStatistic,
    degreesOfFreedom: df,
    pValue,
    isSignificant
  };
}

/**
 * Analyzes the distribution of symbols across all spins.
 * 
 * @param results Array of spin results containing symbol arrays
 * @param expectedSymbols Array of expected symbol IDs
 * @returns Distribution analysis with chi-square test results
 */
export function analyzeDistribution(
  results: SpinResultForAnalysis[],
  expectedSymbols?: string[]
): DistributionAnalysis {
  // Count symbol occurrences across all reels
  const symbolCounts: Record<string, number> = {};
  let totalSymbols = 0;

  for (const result of results) {
    for (const symbol of result.symbols) {
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      totalSymbols++;
    }
  }

  // Get unique symbols
  const uniqueSymbols = expectedSymbols || Object.keys(symbolCounts);
  const numSymbols = uniqueSymbols.length;

  // Calculate expected count (uniform distribution)
  const expectedCount = totalSymbols / numSymbols;

  // Build distribution data
  const symbolDistributions: SymbolDistribution[] = uniqueSymbols.map(symbolId => ({
    symbolId,
    observed: symbolCounts[symbolId] || 0,
    expected: expectedCount
  }));

  // Perform chi-square test
  const observed = symbolDistributions.map(d => d.observed);
  const expected = symbolDistributions.map(d => d.expected);
  const chiSquareResult = chiSquareTest(observed, expected);

  return {
    symbolDistributions,
    chiSquareResult,
    chiSquarePValue: chiSquareResult.pValue,
    totalSamples: results.length
  };
}

/**
 * Calculates the Return to Player (RTP) percentage.
 * 
 * @param results Array of spin results with bet and win amounts
 * @returns RTP analysis with confidence intervals
 */
export function calculateRTP(results: SpinResultForAnalysis[]): RTPAnalysis {
  if (results.length === 0) {
    return {
      rtp: 0,
      totalWagered: 0,
      totalReturned: 0,
      sampleSize: 0,
      confidenceInterval: { lower: 0, upper: 0 },
      standardError: 0
    };
  }

  const totalWagered = results.reduce((acc, r) => acc + r.bet, 0);
  const totalReturned = results.reduce((acc, r) => acc + r.winAmount, 0);
  const rtp = (totalReturned / totalWagered) * 100;

  // Calculate per-spin RTP for variance estimation
  const perSpinRTP = results.map(r => (r.winAmount / r.bet) * 100);
  const rtpMean = Number(mean(perSpinRTP));
  const rtpStd = Number(std(perSpinRTP));
  
  // Standard error of the mean
  const standardError = rtpStd / Math.sqrt(results.length);
  
  // 95% confidence interval (z = 1.96)
  const zScore = 1.96;
  const marginOfError = zScore * standardError;

  return {
    rtp,
    totalWagered,
    totalReturned,
    sampleSize: results.length,
    confidenceInterval: {
      lower: rtpMean - marginOfError,
      upper: rtpMean + marginOfError
    },
    standardError
  };
}

/**
 * Validates that the RTP is within the expected range.
 * 
 * @param rtpAnalysis RTP analysis result
 * @param targetRTP Target RTP percentage (e.g., 96)
 * @param tolerance Acceptable deviation in percentage points (e.g., 1 for +/- 1%)
 * @returns Whether the RTP is within acceptable range
 */
export function validateRTP(
  rtpAnalysis: RTPAnalysis,
  targetRTP: number,
  tolerance: number
): boolean {
  const lowerBound = targetRTP - tolerance;
  const upperBound = targetRTP + tolerance;
  
  return rtpAnalysis.rtp >= lowerBound && rtpAnalysis.rtp <= upperBound;
}

/**
 * Calculates the minimum sample size needed for a given confidence level.
 * 
 * @param targetPrecision Desired precision (e.g., 0.01 for 1%)
 * @param confidenceLevel Confidence level (e.g., 0.95 for 95%)
 * @param estimatedVariance Estimated variance of the RTP
 * @returns Minimum sample size
 */
export function calculateMinimumSampleSize(
  targetPrecision: number,
  confidenceLevel: number = 0.95,
  estimatedVariance: number = 100
): number {
  // Z-score for common confidence levels
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  };
  
  const z = zScores[confidenceLevel] || 1.96;
  const n = Math.ceil((z * z * estimatedVariance) / (targetPrecision * targetPrecision));
  
  return n;
}

/**
 * Performs a runs test to check for randomness in the sequence.
 * 
 * @param sequence Array of boolean values (e.g., win/loss)
 * @returns Whether the sequence appears random
 */
export function runsTest(sequence: boolean[]): { isRandom: boolean; zScore: number } {
  if (sequence.length < 20) {
    return { isRandom: true, zScore: 0 };
  }

  const n1 = sequence.filter(x => x).length;
  const n2 = sequence.filter(x => !x).length;
  const n = n1 + n2;

  if (n1 === 0 || n2 === 0) {
    return { isRandom: false, zScore: Infinity };
  }

  // Count runs
  let runs = 1;
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] !== sequence[i - 1]) {
      runs++;
    }
  }

  // Expected number of runs
  const expectedRuns = ((2 * n1 * n2) / n) + 1;
  
  // Variance of runs
  const variance = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
  
  // Z-score
  const zScore = (runs - expectedRuns) / Math.sqrt(variance);
  
  // Random if |z| < 1.96 (95% confidence)
  const isRandom = Math.abs(zScore) < 1.96;

  return { isRandom, zScore };
}

/**
 * Analyzes symbol frequency per reel position.
 * 
 * @param results Array of spin results
 * @param reelCount Number of reels
 * @returns Per-reel symbol distribution analysis
 */
export function analyzePerReelDistribution(
  results: SpinResultForAnalysis[],
  reelCount: number
): DistributionAnalysis[] {
  const analyses: DistributionAnalysis[] = [];

  for (let reel = 0; reel < reelCount; reel++) {
    const reelResults: SpinResultForAnalysis[] = results.map(r => ({
      symbols: [r.symbols[reel]],
      winAmount: r.winAmount,
      bet: r.bet
    }));

    analyses.push(analyzeDistribution(reelResults));
  }

  return analyses;
}

/**
 * Calculates hit frequency (percentage of spins that result in a win).
 * 
 * @param results Array of spin results
 * @returns Hit frequency as a percentage
 */
export function calculateHitFrequency(results: SpinResultForAnalysis[]): number {
  if (results.length === 0) return 0;
  
  const wins = results.filter(r => r.winAmount > 0).length;
  return (wins / results.length) * 100;
}

/**
 * Calculates volatility index based on win distribution.
 * 
 * @param results Array of spin results
 * @returns Volatility index (higher = more volatile)
 */
export function calculateVolatility(results: SpinResultForAnalysis[]): number {
  if (results.length === 0) return 0;

  const winAmounts = results.map(r => r.winAmount);
  const avgWin = Number(mean(winAmounts));
  const stdWin = Number(std(winAmounts));

  // Coefficient of variation as volatility measure
  return avgWin > 0 ? (stdWin / avgWin) * 100 : 0;
}

/**
 * Calculates expected symbol probabilities based on slot machine configuration.
 * 
 * When symbolsPerReel is not evenly divisible by numSymbols, some symbols
 * will have higher probabilities than others due to modulo mapping.
 * 
 * @param symbolsPerReel Number of positions on each reel
 * @param numSymbols Number of unique symbols
 * @returns Array of expected probabilities for each symbol
 */
export function calculateExpectedProbabilities(
  symbolsPerReel: number,
  numSymbols: number
): number[] {
  const probabilities: number[] = [];
  
  for (let i = 0; i < numSymbols; i++) {
    // Count how many reel positions map to this symbol
    let count = 0;
    for (let pos = 0; pos < symbolsPerReel; pos++) {
      if (pos % numSymbols === i) {
        count++;
      }
    }
    probabilities.push(count / symbolsPerReel);
  }
  
  return probabilities;
}

/**
 * Analyzes the distribution of symbols with custom expected probabilities.
 * 
 * This is useful when the slot machine has non-uniform symbol probabilities
 * by design (e.g., when symbolsPerReel is not evenly divisible by numSymbols).
 * 
 * @param results Array of spin results containing symbol arrays
 * @param expectedSymbols Array of expected symbol IDs
 * @param expectedProbabilities Array of expected probabilities for each symbol
 * @returns Distribution analysis with chi-square test results
 */
export function analyzeDistributionWithProbabilities(
  results: SpinResultForAnalysis[],
  expectedSymbols: string[],
  expectedProbabilities: number[]
): DistributionAnalysis {
  // Count symbol occurrences across all reels
  const symbolCounts: Record<string, number> = {};
  let totalSymbols = 0;

  for (const result of results) {
    for (const symbol of result.symbols) {
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      totalSymbols++;
    }
  }

  // Build distribution data with custom expected probabilities
  const symbolDistributions: SymbolDistribution[] = expectedSymbols.map((symbolId, index) => ({
    symbolId,
    observed: symbolCounts[symbolId] || 0,
    expected: totalSymbols * expectedProbabilities[index]
  }));

  // Perform chi-square test
  const observed = symbolDistributions.map(d => d.observed);
  const expected = symbolDistributions.map(d => d.expected);
  const chiSquareResult = chiSquareTest(observed, expected);

  return {
    symbolDistributions,
    chiSquareResult,
    chiSquarePValue: chiSquareResult.pValue,
    totalSamples: results.length
  };
}

/**
 * Analyzes symbol frequency per reel position with custom expected probabilities.
 * 
 * @param results Array of spin results
 * @param reelCount Number of reels
 * @param expectedSymbols Array of expected symbol IDs
 * @param expectedProbabilities Array of expected probabilities for each symbol
 * @returns Per-reel symbol distribution analysis
 */
export function analyzePerReelDistributionWithProbabilities(
  results: SpinResultForAnalysis[],
  reelCount: number,
  expectedSymbols: string[],
  expectedProbabilities: number[]
): DistributionAnalysis[] {
  const analyses: DistributionAnalysis[] = [];

  for (let reel = 0; reel < reelCount; reel++) {
    const reelResults: SpinResultForAnalysis[] = results.map(r => ({
      symbols: [r.symbols[reel]],
      winAmount: r.winAmount,
      bet: r.bet
    }));

    analyses.push(analyzeDistributionWithProbabilities(reelResults, expectedSymbols, expectedProbabilities));
  }

  return analyses;
}
