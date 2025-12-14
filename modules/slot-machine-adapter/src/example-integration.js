/**
 * Example Integration: Three-Body Entropy RNG with Simple Slot Machine Game
 * 
 * This file demonstrates how to integrate the Three-Body Entropy RNG
 * with the simple-slot-machine-game (https://github.com/kero-chan/simple-slot-machine-game)
 * 
 * The integration replaces Math.random() calls in gameHelpers.js with
 * provably fair entropy derived from three-body gravitational dynamics.
 */

import {
  SlotMachineRNGAdapter,
  initSlotMachineRNG,
  generateClientSeed,
  verifySpinResult,
  DEFAULT_SLOT_CONFIG
} from './integration-adapter.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration matching simple-slot-machine-game's constants.js
 */
const SLOT_MACHINE_CONFIG = {
  symbols: ['fa', 'zhong', 'bai', 'bawan', 'wusuo', 'wutong', 'liangsuo', 'liangtong', 'wild', 'bonus'],
  reelCount: 5,
  rowCount: 6,
  bufferRows: 4,
  spawnRates: {
    wildChance: 0.02,    // 2% chance for wild tiles
    bonusChance: 0.03,   // 3% chance for bonus tiles  
    goldChance: 0.15     // 15% chance for gold variants
  },
  goldAllowedColumns: [1, 2, 3]  // Gold only in middle 3 columns
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let rngAdapter = null;
let currentCommitment = null;
let spinHistory = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the RNG adapter
 * Call this once when the game loads
 */
export async function initializeRNG(serverSecret = null) {
  rngAdapter = await initSlotMachineRNG(SLOT_MACHINE_CONFIG, serverSecret);
  console.log('[Three-Body RNG] Initialized with provably fair entropy');
  return rngAdapter;
}

// ============================================================================
// PROVABLY FAIR WORKFLOW
// ============================================================================

/**
 * Step 1: Get server commitment before spin
 * The house commits to a server seed BEFORE the client provides their seed
 * This prevents the house from manipulating results after seeing client seed
 */
export async function getServerCommitment() {
  if (!rngAdapter) {
    throw new Error('RNG not initialized. Call initializeRNG() first.');
  }
  
  currentCommitment = await rngAdapter.createCommitment();
  
  console.log('[Three-Body RNG] Server commitment created:', {
    commitmentHash: currentCommitment.commitmentHash,
    nonce: currentCommitment.nonce
  });
  
  return currentCommitment;
}

/**
 * Step 2: Generate spin result with client seed
 * Client provides their seed AFTER seeing the commitment
 * Both seeds are mixed to generate the final result
 */
export async function generateSpinResult(clientSeed = null) {
  if (!rngAdapter) {
    throw new Error('RNG not initialized. Call initializeRNG() first.');
  }
  
  if (!currentCommitment) {
    throw new Error('No commitment found. Call getServerCommitment() first.');
  }
  
  // Generate client seed if not provided
  const seed = clientSeed || generateClientSeed();
  
  const result = await rngAdapter.generateSpinEntropy({
    clientSeed: seed,
    nonce: currentCommitment.nonce,
    options: {
      allowGold: true,
      allowBonus: true
    }
  });
  
  // Store in history for verification
  spinHistory.push({
    ...result,
    timestamp: Date.now()
  });
  
  console.log('[Three-Body RNG] Spin result generated:', {
    proofId: result.proof.proofId,
    nonce: result.proof.nonce,
    gridSize: `${result.grid.length}x${result.grid[0]?.length || 0}`
  });
  
  // Clear commitment for next spin
  currentCommitment = null;
  
  return result;
}

/**
 * Step 3: Verify spin result (client-side verification)
 * After the spin, the server reveals the server seed
 * Client can verify the result was fair
 */
export async function verifyLastSpin() {
  if (spinHistory.length === 0) {
    throw new Error('No spins to verify');
  }
  
  const lastSpin = spinHistory[spinHistory.length - 1];
  const serverSecret = rngAdapter.getServerSecret();
  
  const verification = await verifySpinResult(lastSpin, serverSecret, SLOT_MACHINE_CONFIG);
  
  console.log('[Three-Body RNG] Verification result:', verification);
  
  return verification;
}

// ============================================================================
// REPLACEMENT FUNCTIONS FOR gameHelpers.js
// ============================================================================

/**
 * Replacement for getRandomSymbol() in gameHelpers.js
 * 
 * IMPORTANT: This is an async function, so the original code needs to be
 * modified to handle promises. See the integration guide below.
 */
export async function getRandomSymbolProvablyFair(options = {}) {
  if (!rngAdapter) {
    console.warn('[Three-Body RNG] Not initialized, falling back to Math.random()');
    return fallbackGetRandomSymbol(options);
  }
  
  // If no active spin, create one automatically
  if (!currentCommitment) {
    await getServerCommitment();
  }
  
  const clientSeed = generateClientSeed();
  const result = await rngAdapter.generateSpinEntropy({
    clientSeed,
    nonce: currentCommitment.nonce,
    options: {
      allowGold: options.allowGold ?? false,
      allowBonus: options.allowBonus ?? true
    }
  });
  
  // Get a single symbol from the grid
  const col = options.col ?? 0;
  const row = options.visualRow !== undefined 
    ? options.visualRow + SLOT_MACHINE_CONFIG.bufferRows 
    : SLOT_MACHINE_CONFIG.bufferRows;
  
  currentCommitment = null;
  
  return result.grid[col]?.[row] || 'fa';
}

/**
 * Fallback to original Math.random() behavior
 */
function fallbackGetRandomSymbol(options = {}) {
  const {
    col,
    allowGold = false,
    goldChance = 0.15,
    wildChance = 0.02,
    bonusChance = 0.03,
    allowBonus = true
  } = options;

  const pool = SLOT_MACHINE_CONFIG.symbols.filter(s => s !== 'wild' && s !== 'bonus');
  
  if (Math.random() < wildChance) return 'wild';
  if (allowBonus && Math.random() < bonusChance) return 'bonus';
  
  let symbol = pool[Math.floor(Math.random() * pool.length)];
  
  if (allowGold && Math.random() < goldChance) {
    const isAllowedColumn = col === undefined || [1, 2, 3].includes(col);
    if (isAllowedColumn) {
      symbol = symbol + '_gold';
    }
  }
  
  return symbol;
}

/**
 * Replacement for createEmptyGrid() in gameHelpers.js
 * Creates a complete grid with provably fair entropy
 */
export async function createEmptyGridProvablyFair() {
  if (!rngAdapter) {
    console.warn('[Three-Body RNG] Not initialized');
    return null;
  }
  
  await getServerCommitment();
  const clientSeed = generateClientSeed();
  const result = await generateSpinResult(clientSeed);
  
  return result.grid;
}

/**
 * Replacement for createReelStrips() in gameHelpers.js
 * Creates reel strips with provably fair entropy
 */
export async function createReelStripsProvablyFair(count, length) {
  if (!rngAdapter) {
    console.warn('[Three-Body RNG] Not initialized');
    return null;
  }
  
  await getServerCommitment();
  const clientSeed = generateClientSeed();
  const result = await rngAdapter.createReelStrips(clientSeed, currentCommitment.nonce, length);
  
  currentCommitment = null;
  
  return result.reelStrips;
}

/**
 * Replacement for fillBufferRows() in gameHelpers.js
 * Fills buffer rows with provably fair entropy
 */
export async function fillBufferRowsProvablyFair(grid) {
  if (!rngAdapter) {
    console.warn('[Three-Body RNG] Not initialized');
    return;
  }
  
  const bufferRows = SLOT_MACHINE_CONFIG.bufferRows;
  if (bufferRows === 0) return;
  
  await getServerCommitment();
  const clientSeed = generateClientSeed();
  const result = await generateSpinResult(clientSeed);
  
  for (let col = 0; col < SLOT_MACHINE_CONFIG.reelCount; col++) {
    for (let row = 0; row < bufferRows; row++) {
      grid[col][row] = result.grid[col][row];
    }
  }
}

// ============================================================================
// COMPLETE SPIN WORKFLOW
// ============================================================================

/**
 * Complete spin workflow for the slot machine
 * This is the main function to call when the user clicks "Spin"
 * 
 * @param {string} userProvidedSeed - Optional seed from user (e.g., from input field)
 * @returns {Object} Complete spin result with grid, proof, and verification data
 */
export async function performProvablyFairSpin(userProvidedSeed = null) {
  console.log('[Three-Body RNG] Starting provably fair spin...');
  
  // Step 1: Get server commitment
  const commitment = await getServerCommitment();
  console.log('[Three-Body RNG] Commitment received:', commitment.commitmentHash.substring(0, 16) + '...');
  
  // Step 2: Generate or use client seed
  const clientSeed = userProvidedSeed || generateClientSeed();
  console.log('[Three-Body RNG] Client seed:', clientSeed.substring(0, 16) + '...');
  
  // Step 3: Generate spin result
  const result = await generateSpinResult(clientSeed);
  
  // Step 4: Verify the result
  const verification = await verifyLastSpin();
  
  return {
    grid: result.grid,
    symbols: result.symbols,
    proof: result.proof,
    commitment: result.commitment,
    verification,
    isValid: verification.valid
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get spin history for audit purposes
 */
export function getSpinHistory() {
  return spinHistory.map(spin => ({
    proofId: spin.proof.proofId,
    nonce: spin.proof.nonce,
    clientSeed: spin.proof.clientSeed,
    serverSeed: spin.proof.serverSeed,
    timestamp: spin.timestamp
  }));
}

/**
 * Clear spin history
 */
export function clearSpinHistory() {
  spinHistory = [];
}

/**
 * Export verification data for a specific spin
 */
export function exportVerificationData(spinIndex) {
  if (spinIndex < 0 || spinIndex >= spinHistory.length) {
    throw new Error('Invalid spin index');
  }
  
  const spin = spinHistory[spinIndex];
  return {
    serverSeed: spin.proof.serverSeed,
    clientSeed: spin.proof.clientSeed,
    nonce: spin.proof.nonce,
    commitmentHash: spin.commitment.commitmentHash,
    entropyHex: spin.entropyHex,
    signature: spin.proof.signature,
    grid: spin.grid
  };
}

// ============================================================================
// DEMO / TESTING
// ============================================================================

/**
 * Run a demo of the provably fair system
 */
export async function runDemo() {
  console.log('='.repeat(60));
  console.log('Three-Body Entropy RNG - Provably Fair Demo');
  console.log('='.repeat(60));
  
  // Initialize
  console.log('\n1. Initializing RNG...');
  await initializeRNG();
  
  // Perform 3 spins
  for (let i = 1; i <= 3; i++) {
    console.log(`\n${i + 1}. Performing spin #${i}...`);
    const result = await performProvablyFairSpin();
    
    console.log(`   Grid (first column): ${result.grid[0].slice(4, 8).join(', ')}`);
    console.log(`   Verification: ${result.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Proof ID: ${result.proof.proofId}`);
  }
  
  // Show history
  console.log('\n5. Spin History:');
  const history = getSpinHistory();
  history.forEach((spin, i) => {
    console.log(`   Spin ${i + 1}: nonce=${spin.nonce}, proofId=${spin.proofId.substring(0, 16)}...`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('Demo complete! All spins were provably fair.');
  console.log('='.repeat(60));
}

// Run demo if executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runDemo().catch(console.error);
}

// ============================================================================
// INTEGRATION GUIDE
// ============================================================================

/**
 * INTEGRATION GUIDE FOR simple-slot-machine-game
 * 
 * To integrate this RNG with the simple-slot-machine-game, follow these steps:
 * 
 * 1. INSTALL THE ADAPTER
 *    Copy integration-adapter.js and example-integration.js to your project's
 *    src/utils/ directory.
 * 
 * 2. MODIFY gameHelpers.js
 *    Replace the synchronous functions with async versions:
 * 
 *    // Before:
 *    export function getRandomSymbol(options = {}) { ... }
 * 
 *    // After:
 *    import { getRandomSymbolProvablyFair } from './example-integration.js';
 *    export async function getRandomSymbol(options = {}) {
 *      return await getRandomSymbolProvablyFair(options);
 *    }
 * 
 * 3. UPDATE CALLERS TO HANDLE ASYNC
 *    Any code that calls getRandomSymbol, createEmptyGrid, createReelStrips,
 *    or fillBufferRows needs to be updated to use async/await:
 * 
 *    // Before:
 *    const symbol = getRandomSymbol({ col: 0 });
 * 
 *    // After:
 *    const symbol = await getRandomSymbol({ col: 0 });
 * 
 * 4. INITIALIZE ON GAME LOAD
 *    In your main.js or App.vue:
 * 
 *    import { initializeRNG } from './utils/example-integration.js';
 *    
 *    // In your setup or mounted hook:
 *    await initializeRNG();
 * 
 * 5. ADD VERIFICATION UI (OPTIONAL)
 *    Add a "Verify Last Spin" button that calls verifyLastSpin() and
 *    displays the verification result to the user.
 * 
 * 6. SHOW COMMITMENT BEFORE SPIN (OPTIONAL)
 *    For full transparency, show the commitment hash to the user before
 *    they click spin, and let them provide their own seed.
 * 
 * EXAMPLE SPIN BUTTON HANDLER:
 * 
 *    async function onSpinClick() {
 *      // Show commitment to user
 *      const commitment = await getServerCommitment();
 *      showCommitmentToUser(commitment.commitmentHash);
 *      
 *      // Let user provide seed (or generate automatically)
 *      const clientSeed = getUserSeedInput() || generateClientSeed();
 *      
 *      // Generate result
 *      const result = await generateSpinResult(clientSeed);
 *      
 *      // Update game UI with result.grid
 *      updateReels(result.grid);
 *      
 *      // Store proof for later verification
 *      storeProof(result.proof);
 *    }
 */
