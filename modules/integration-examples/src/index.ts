/**
 * Integration Examples Module
 * 
 * Sample implementations for 3-8 reel slot machines using Three-Body Entropy.
 * 
 * @packageDocumentation
 */

// Export types
export {
  ReelCount,
  Symbol,
  ReelConfiguration,
  Payline,
  SessionState,
  SessionData,
  SpinRecord,
  SpinProof,
  HashChainData,
  SpinRequest,
  SpinResult,
  VerificationResult,
  VerificationCheck,
  ExampleConfig,
  ExampleResult
} from './types';

// Export slot machine
export {
  SlotMachine,
  createSlotMachine,
  createReelConfiguration
} from './slot-machine';

// Export examples
export { run3ReelExample } from './examples/three-reel';
export { run8ReelExample } from './examples/eight-reel';
export { runAllExamples } from './examples/run-all';

/**
 * Verifies a full session with all spin records.
 */
export function verifyFullSession(sessionData: import('./types').SessionData): import('./types').VerificationResult {
  const checks: import('./types').VerificationCheck[] = [];
  
  // Verify session has valid structure
  checks.push({
    name: 'sessionStructure',
    passed: !!(sessionData.sessionId && sessionData.userId && sessionData.gameId),
    details: 'Session has required fields'
  });
  
  // Verify spin history exists
  checks.push({
    name: 'spinHistory',
    passed: Array.isArray(sessionData.spinHistory),
    details: `Session has ${sessionData.spinHistory?.length || 0} spins`
  });
  
  // Verify hash chain
  checks.push({
    name: 'hashChain',
    passed: !!(sessionData.hashChain && sessionData.hashChain.serverCommitment),
    details: 'Hash chain is initialized'
  });
  
  // Verify each spin has required fields
  let allSpinsValid = true;
  for (const spin of sessionData.spinHistory || []) {
    if (!spin.spinId || !spin.entropyHex || !spin.proof) {
      allSpinsValid = false;
      break;
    }
  }
  checks.push({
    name: 'spinRecords',
    passed: allSpinsValid,
    details: allSpinsValid ? 'All spin records valid' : 'Some spin records invalid'
  });
  
  const allPassed = checks.every(c => c.passed);
  const failedCheck = checks.find(c => !c.passed);
  
  return {
    valid: allPassed,
    checks,
    error: failedCheck ? `${failedCheck.name}: ${failedCheck.details}` : undefined
  };
}
