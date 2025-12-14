/**
 * Three-Reel Slot Machine Example
 * 
 * Demonstrates a complete 3-reel slot machine session with:
 * - Session initialization
 * - Hash chain setup
 * - Multiple spins
 * - Result verification
 */

import { createSlotMachine, createReelConfiguration } from '../slot-machine';
import { SessionState, ExampleResult, SpinResult, VerificationResult } from '../types';

/**
 * Runs the 3-reel slot machine example.
 */
export async function run3ReelExample(): Promise<ExampleResult> {
  const startTime = Date.now();
  const spinResults: SpinResult[] = [];
  const verificationResults: VerificationResult[] = [];
  
  console.log('='.repeat(60));
  console.log('THREE-REEL SLOT MACHINE EXAMPLE');
  console.log('='.repeat(60));
  
  // Step 1: Create slot machine
  console.log('\n[Step 1] Creating 3-reel slot machine...');
  const slotMachine = createSlotMachine(
    'user-001',
    'three-reel-classic',
    3,
    1000,
    'example-server-secret'
  );
  
  console.log(`  Session ID: ${slotMachine.getSessionData().sessionId}`);
  console.log(`  Initial Balance: $${slotMachine.getBalance()}`);
  console.log(`  State: ${slotMachine.getState()}`);
  
  // Step 2: Get server commitment
  console.log('\n[Step 2] Getting server commitment...');
  const commitment = slotMachine.getServerCommitment();
  console.log(`  Server Commitment: ${commitment.substring(0, 32)}...`);
  
  // Step 3: Set client seed
  console.log('\n[Step 3] Setting client seed...');
  const clientSeed = `client-seed-${Date.now()}`;
  slotMachine.setClientSeed(clientSeed);
  console.log(`  Client Seed: ${clientSeed}`);
  
  // Step 4: Start session
  console.log('\n[Step 4] Starting session...');
  slotMachine.start();
  console.log(`  State: ${slotMachine.getState()}`);
  
  // Step 5: Perform multiple spins
  console.log('\n[Step 5] Performing spins...');
  const bets = [10, 20, 15, 25, 10];
  
  for (let i = 0; i < bets.length; i++) {
    const bet = bets[i];
    console.log(`\n  Spin ${i + 1}:`);
    console.log(`    Bet: $${bet}`);
    
    const result = await slotMachine.spin({
      sessionId: slotMachine.getSessionData().sessionId,
      bet
    });
    
    spinResults.push(result);
    
    if (result.success && result.spinRecord) {
      console.log(`    Symbols: ${result.spinRecord.symbols.join(' | ')}`);
      console.log(`    Positions: ${result.spinRecord.reelPositions.join(', ')}`);
      console.log(`    Win: $${result.spinRecord.winAmount}`);
      console.log(`    Balance: $${result.newBalance}`);
      
      // Verify spin
      const verification = slotMachine.verifySpinResult(result.spinRecord);
      verificationResults.push(verification);
      console.log(`    Verified: ${verification.valid ? 'YES' : 'NO'}`);
    } else {
      console.log(`    Error: ${result.error}`);
    }
  }
  
  // Step 6: Verify full session
  console.log('\n[Step 6] Verifying full session...');
  const sessionVerification = slotMachine.verifyFullSession();
  console.log(`  Session Valid: ${sessionVerification.valid ? 'YES' : 'NO'}`);
  console.log(`  Checks Passed: ${sessionVerification.checks.filter(c => c.passed).length}/${sessionVerification.checks.length}`);
  
  // Step 7: Summary
  console.log('\n[Step 7] Session Summary');
  console.log('-'.repeat(40));
  const sessionData = slotMachine.getSessionData();
  const totalWins = spinResults.filter(r => r.success && r.spinRecord && r.spinRecord.winAmount > 0).length;
  const totalLosses = spinResults.filter(r => r.success && r.spinRecord && r.spinRecord.winAmount === 0).length;
  
  console.log(`  Total Spins: ${spinResults.length}`);
  console.log(`  Wins: ${totalWins}`);
  console.log(`  Losses: ${totalLosses}`);
  console.log(`  Final Balance: $${sessionData.balance}`);
  console.log(`  Net Result: $${sessionData.balance - 1000}`);
  
  const executionTime = Date.now() - startTime;
  console.log(`\n  Execution Time: ${executionTime}ms`);
  console.log('='.repeat(60));
  
  return {
    success: true,
    sessionData,
    spinResults,
    verificationResults,
    totalSpins: spinResults.length,
    totalWins,
    totalLosses,
    finalBalance: sessionData.balance,
    executionTime
  };
}

// Run if executed directly
if (require.main === module) {
  run3ReelExample()
    .then(result => {
      console.log('\nExample completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}
