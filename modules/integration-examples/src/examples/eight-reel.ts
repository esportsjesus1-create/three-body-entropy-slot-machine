/**
 * Eight-Reel Slot Machine Example
 * 
 * Demonstrates a complete 8-reel slot machine session with:
 * - Extended reel configuration
 * - Custom symbols
 * - Multiple paylines
 * - Full verification
 */

import { SlotMachine, createReelConfiguration } from '../slot-machine';
import { SessionState, ExampleResult, SpinResult, VerificationResult, Symbol, Payline } from '../types';

/**
 * Custom symbols for 8-reel slot.
 */
const CUSTOM_SYMBOLS: Symbol[] = [
  { id: 'star', name: 'Star', value: 1 },
  { id: 'moon', name: 'Moon', value: 2 },
  { id: 'sun', name: 'Sun', value: 3 },
  { id: 'planet', name: 'Planet', value: 5 },
  { id: 'comet', name: 'Comet', value: 8 },
  { id: 'galaxy', name: 'Galaxy', value: 15 },
  { id: 'blackhole', name: 'Black Hole', value: 25 },
  { id: 'supernova', name: 'Supernova', value: 50 },
  { id: 'nebula', name: 'Nebula', value: 100 }
];

/**
 * Custom paylines for 8-reel slot.
 */
const CUSTOM_PAYLINES: Payline[] = [
  { id: 1, positions: [1, 1, 1, 1, 1, 1, 1, 1], multiplier: 1 },
  { id: 2, positions: [0, 0, 0, 0, 0, 0, 0, 0], multiplier: 1 },
  { id: 3, positions: [2, 2, 2, 2, 2, 2, 2, 2], multiplier: 1 },
  { id: 4, positions: [0, 1, 2, 2, 2, 2, 1, 0], multiplier: 1.5 },
  { id: 5, positions: [2, 1, 0, 0, 0, 0, 1, 2], multiplier: 1.5 },
  { id: 6, positions: [0, 0, 1, 1, 1, 1, 0, 0], multiplier: 2 },
  { id: 7, positions: [2, 2, 1, 1, 1, 1, 2, 2], multiplier: 2 },
  { id: 8, positions: [1, 0, 1, 0, 1, 0, 1, 0], multiplier: 3 }
];

/**
 * Runs the 8-reel slot machine example.
 */
export async function run8ReelExample(): Promise<ExampleResult> {
  const startTime = Date.now();
  const spinResults: SpinResult[] = [];
  const verificationResults: VerificationResult[] = [];
  
  console.log('='.repeat(70));
  console.log('EIGHT-REEL COSMIC SLOT MACHINE EXAMPLE');
  console.log('='.repeat(70));
  
  // Step 1: Create custom reel configuration
  console.log('\n[Step 1] Creating 8-reel configuration...');
  const reelConfig = createReelConfiguration(8, 30, CUSTOM_SYMBOLS, CUSTOM_PAYLINES);
  console.log(`  Reels: ${reelConfig.reelCount}`);
  console.log(`  Symbols per Reel: ${reelConfig.symbolsPerReel}`);
  console.log(`  Total Symbols: ${reelConfig.symbols.length}`);
  console.log(`  Paylines: ${reelConfig.paylines.length}`);
  
  // Step 2: Create slot machine
  console.log('\n[Step 2] Creating slot machine...');
  const slotMachine = new SlotMachine(
    'cosmic-player-001',
    'eight-reel-cosmic',
    reelConfig,
    5000,
    'cosmic-server-secret',
    2.0,
    0.005
  );
  
  console.log(`  Session ID: ${slotMachine.getSessionData().sessionId}`);
  console.log(`  Initial Balance: $${slotMachine.getBalance()}`);
  
  // Step 3: Setup hash chain
  console.log('\n[Step 3] Setting up hash chain...');
  const commitment = slotMachine.getServerCommitment();
  console.log(`  Server Commitment: ${commitment.substring(0, 40)}...`);
  
  const clientSeed = `cosmic-seed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  slotMachine.setClientSeed(clientSeed);
  console.log(`  Client Seed: ${clientSeed}`);
  
  // Step 4: Start session
  console.log('\n[Step 4] Starting session...');
  slotMachine.start();
  console.log(`  State: ${slotMachine.getState()}`);
  
  // Step 5: Perform spins with varying bets
  console.log('\n[Step 5] Performing cosmic spins...');
  const bets = [50, 100, 75, 150, 200, 100, 50, 250];
  
  for (let i = 0; i < bets.length; i++) {
    const bet = bets[i];
    console.log(`\n  Spin ${i + 1} (Bet: $${bet}):`);
    
    const result = await slotMachine.spin({
      sessionId: slotMachine.getSessionData().sessionId,
      bet
    });
    
    spinResults.push(result);
    
    if (result.success && result.spinRecord) {
      // Display symbols in a visual format
      const symbols = result.spinRecord.symbols;
      console.log(`    [${symbols.slice(0, 4).join('] [')}]`);
      console.log(`    [${symbols.slice(4).join('] [')}]`);
      console.log(`    Win: $${result.spinRecord.winAmount} | Balance: $${result.newBalance}`);
      
      // Verify spin
      const verification = slotMachine.verifySpinResult(result.spinRecord);
      verificationResults.push(verification);
      
      if (!verification.valid) {
        console.log(`    WARNING: Verification failed - ${verification.error}`);
      }
    } else {
      console.log(`    Error: ${result.error}`);
    }
  }
  
  // Step 6: Display spin history
  console.log('\n[Step 6] Spin History Analysis');
  console.log('-'.repeat(50));
  const history = slotMachine.getSpinHistory();
  
  let totalBet = 0;
  let totalWon = 0;
  
  for (const spin of history) {
    totalBet += spin.bet;
    totalWon += spin.winAmount;
  }
  
  console.log(`  Total Bet: $${totalBet}`);
  console.log(`  Total Won: $${totalWon}`);
  console.log(`  Net: $${totalWon - totalBet}`);
  console.log(`  RTP: ${((totalWon / totalBet) * 100).toFixed(2)}%`);
  
  // Step 7: Full session verification
  console.log('\n[Step 7] Full Session Verification');
  console.log('-'.repeat(50));
  const sessionVerification = slotMachine.verifyFullSession();
  
  console.log(`  Overall Valid: ${sessionVerification.valid ? 'YES' : 'NO'}`);
  console.log(`  Verification Checks:`);
  
  for (const check of sessionVerification.checks) {
    const status = check.passed ? 'PASS' : 'FAIL';
    console.log(`    [${status}] ${check.name}`);
  }
  
  // Step 8: Final summary
  console.log('\n[Step 8] Final Summary');
  console.log('='.repeat(70));
  const sessionData = slotMachine.getSessionData();
  const totalWins = spinResults.filter(r => r.success && r.spinRecord && r.spinRecord.winAmount > 0).length;
  const totalLosses = spinResults.filter(r => r.success && r.spinRecord && r.spinRecord.winAmount === 0).length;
  
  console.log(`  Game: ${sessionData.gameId}`);
  console.log(`  Player: ${sessionData.userId}`);
  console.log(`  Total Spins: ${history.length}`);
  console.log(`  Winning Spins: ${totalWins}`);
  console.log(`  Losing Spins: ${totalLosses}`);
  console.log(`  Win Rate: ${((totalWins / history.length) * 100).toFixed(1)}%`);
  console.log(`  Starting Balance: $5000`);
  console.log(`  Final Balance: $${sessionData.balance}`);
  console.log(`  Profit/Loss: $${sessionData.balance - 5000}`);
  
  const executionTime = Date.now() - startTime;
  console.log(`\n  Execution Time: ${executionTime}ms`);
  console.log('='.repeat(70));
  
  return {
    success: true,
    sessionData,
    spinResults,
    verificationResults,
    totalSpins: history.length,
    totalWins,
    totalLosses,
    finalBalance: sessionData.balance,
    executionTime
  };
}

// Run if executed directly
if (require.main === module) {
  run8ReelExample()
    .then(result => {
      console.log('\nCosmic example completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Cosmic example failed:', error);
      process.exit(1);
    });
}
