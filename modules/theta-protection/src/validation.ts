/**
 * Theta Proof Validation
 * 
 * Implements validation logic for theta proofs to ensure
 * spin results are tamper-proof and verifiable.
 */

import { createHash, createHmac } from 'crypto';
import {
  ThetaProof,
  ValidationResult,
  ValidationCheck,
  ValidateProofOptions,
  SpinResult,
  ThetaCommitment
} from './types';
import {
  calculateTheta,
  deriveReelPositions,
  calculateResultHash,
  getConfig
} from './theta';

/**
 * Validates a theta proof for integrity and correctness.
 * 
 * @param options - Validation options
 * @returns Validation result
 */
export function validateThetaProof(options: ValidateProofOptions): ValidationResult {
  const { proof, expectedResult, serverPublicKey } = options;
  const checks: ValidationCheck[] = [];
  const config = getConfig();
  
  // Check 1: Proof structure
  const structureCheck = validateProofStructure(proof);
  checks.push(structureCheck);
  
  if (!structureCheck.passed) {
    return {
      valid: false,
      checks,
      error: structureCheck.details,
      timestamp: Date.now()
    };
  }
  
  // Check 2: Commitment verification
  const commitmentCheck = validateCommitment(proof);
  checks.push(commitmentCheck);
  
  // Check 3: Reel positions verification
  const positionsCheck = validateReelPositions(proof);
  checks.push(positionsCheck);
  
  // Check 4: Result hash verification
  const resultHashCheck = validateResultHash(proof);
  checks.push(resultHashCheck);
  
  // Check 5: Signature verification (if public key provided)
  if (serverPublicKey) {
    const signatureCheck = validateSignature(proof, serverPublicKey);
    checks.push(signatureCheck);
  }
  
  // Check 6: Expected result match (if provided)
  if (expectedResult) {
    const resultMatchCheck = validateResultMatch(proof.result, expectedResult);
    checks.push(resultMatchCheck);
  }
  
  // Check 7: Timestamp validity
  const timestampCheck = validateTimestamp(proof);
  checks.push(timestampCheck);
  
  // Check 8: Version compatibility
  const versionCheck = validateVersion(proof);
  checks.push(versionCheck);
  
  // Determine overall validity
  const allPassed = checks.every(check => check.passed);
  const failedCheck = checks.find(check => !check.passed);
  
  return {
    valid: allPassed,
    checks,
    error: failedCheck ? `${failedCheck.name}: ${failedCheck.details}` : undefined,
    timestamp: Date.now()
  };
}

/**
 * Validates the proof structure.
 */
function validateProofStructure(proof: ThetaProof): ValidationCheck {
  const requiredFields = [
    'proofId',
    'commitment',
    'theta',
    'clientSeed',
    'nonce',
    'result',
    'signature',
    'timestamp',
    'version'
  ];
  
  const missingFields = requiredFields.filter(field => {
    const value = proof[field as keyof ThetaProof];
    return value === undefined || value === null;
  });
  
  if (missingFields.length > 0) {
    return {
      name: 'structure',
      passed: false,
      details: `Missing fields: ${missingFields.join(', ')}`
    };
  }
  
  // Validate result structure
  if (!proof.result.reelPositions || !Array.isArray(proof.result.reelPositions)) {
    return {
      name: 'structure',
      passed: false,
      details: 'Invalid result structure: missing reelPositions'
    };
  }
  
  if (proof.result.reelCount !== proof.result.reelPositions.length) {
    return {
      name: 'structure',
      passed: false,
      details: 'Reel count does not match positions array length'
    };
  }
  
  return {
    name: 'structure',
    passed: true,
    details: 'Proof structure is valid'
  };
}

/**
 * Validates the commitment hash.
 */
function validateCommitment(proof: ThetaProof): ValidationCheck {
  const config = getConfig();
  
  // We can't fully verify commitment without entropy data,
  // but we can verify the format
  if (!proof.commitment || proof.commitment.length !== 64) {
    return {
      name: 'commitment',
      passed: false,
      expected: '64-character hex string',
      actual: proof.commitment?.length?.toString() || 'undefined',
      details: 'Invalid commitment format'
    };
  }
  
  // Verify commitment is valid hex
  if (!/^[0-9a-f]{64}$/.test(proof.commitment)) {
    return {
      name: 'commitment',
      passed: false,
      details: 'Commitment is not valid hexadecimal'
    };
  }
  
  return {
    name: 'commitment',
    passed: true,
    details: 'Commitment format is valid'
  };
}

/**
 * Validates reel positions against theta derivation.
 */
function validateReelPositions(proof: ThetaProof): ValidationCheck {
  try {
    const expectedPositions = deriveReelPositions(
      proof.theta,
      proof.clientSeed,
      proof.nonce,
      proof.result.reelCount,
      proof.result.symbolsPerReel
    );
    
    const positionsMatch = proof.result.reelPositions.every(
      (pos, i) => pos === expectedPositions[i]
    );
    
    if (!positionsMatch) {
      return {
        name: 'reelPositions',
        passed: false,
        expected: expectedPositions.join(','),
        actual: proof.result.reelPositions.join(','),
        details: 'Reel positions do not match expected derivation'
      };
    }
    
    return {
      name: 'reelPositions',
      passed: true,
      details: 'Reel positions match expected derivation'
    };
  } catch (error) {
    return {
      name: 'reelPositions',
      passed: false,
      details: `Error validating positions: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validates the result hash.
 */
function validateResultHash(proof: ThetaProof): ValidationCheck {
  const expectedHash = calculateResultHash(
    proof.result.reelPositions,
    proof.theta,
    proof.clientSeed,
    proof.nonce
  );
  
  if (proof.result.resultHash !== expectedHash) {
    return {
      name: 'resultHash',
      passed: false,
      expected: expectedHash,
      actual: proof.result.resultHash,
      details: 'Result hash does not match calculated hash'
    };
  }
  
  return {
    name: 'resultHash',
    passed: true,
    details: 'Result hash is valid'
  };
}

/**
 * Validates the proof signature.
 */
function validateSignature(proof: ThetaProof, serverPublicKey: string): ValidationCheck {
  const config = getConfig();
  
  // Reconstruct proof data
  const proofData = [
    proof.proofId,
    proof.commitment,
    proof.theta,
    proof.clientSeed,
    proof.nonce.toString(),
    proof.result.resultHash,
    proof.timestamp.toString()
  ].join(':');
  
  // Verify signature using HMAC (simplified - in production use asymmetric crypto)
  const hmac = createHmac(config.hashAlgorithm, serverPublicKey);
  hmac.update(proofData);
  const expectedSignature = hmac.digest('hex');
  
  if (proof.signature !== expectedSignature) {
    return {
      name: 'signature',
      passed: false,
      details: 'Signature verification failed'
    };
  }
  
  return {
    name: 'signature',
    passed: true,
    details: 'Signature is valid'
  };
}

/**
 * Validates that the result matches expected result.
 */
function validateResultMatch(actual: SpinResult, expected: SpinResult): ValidationCheck {
  if (actual.reelCount !== expected.reelCount) {
    return {
      name: 'resultMatch',
      passed: false,
      expected: expected.reelCount.toString(),
      actual: actual.reelCount.toString(),
      details: 'Reel count mismatch'
    };
  }
  
  const positionsMatch = actual.reelPositions.every(
    (pos, i) => pos === expected.reelPositions[i]
  );
  
  if (!positionsMatch) {
    return {
      name: 'resultMatch',
      passed: false,
      expected: expected.reelPositions.join(','),
      actual: actual.reelPositions.join(','),
      details: 'Reel positions do not match expected'
    };
  }
  
  return {
    name: 'resultMatch',
    passed: true,
    details: 'Result matches expected'
  };
}

/**
 * Validates the proof timestamp.
 */
function validateTimestamp(proof: ThetaProof): ValidationCheck {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  if (proof.timestamp > now) {
    return {
      name: 'timestamp',
      passed: false,
      details: 'Proof timestamp is in the future'
    };
  }
  
  if (now - proof.timestamp > maxAge) {
    return {
      name: 'timestamp',
      passed: false,
      details: 'Proof timestamp is too old (>24 hours)'
    };
  }
  
  return {
    name: 'timestamp',
    passed: true,
    details: 'Timestamp is valid'
  };
}

/**
 * Validates the proof version.
 */
function validateVersion(proof: ThetaProof): ValidationCheck {
  const supportedVersions = ['1.0.0'];
  
  if (!supportedVersions.includes(proof.version)) {
    return {
      name: 'version',
      passed: false,
      expected: supportedVersions.join(', '),
      actual: proof.version,
      details: 'Unsupported proof version'
    };
  }
  
  return {
    name: 'version',
    passed: true,
    details: 'Version is supported'
  };
}

/**
 * Validates a theta commitment.
 */
export function validateThetaCommitment(commitment: ThetaCommitment): ValidationCheck {
  const now = Date.now();
  
  if (!commitment.hash || commitment.hash.length !== 64) {
    return {
      name: 'commitmentValidation',
      passed: false,
      details: 'Invalid commitment hash format'
    };
  }
  
  if (commitment.expiresAt < now) {
    return {
      name: 'commitmentValidation',
      passed: false,
      details: 'Commitment has expired'
    };
  }
  
  return {
    name: 'commitmentValidation',
    passed: true,
    details: 'Commitment is valid'
  };
}

/**
 * Performs a quick validation of proof integrity.
 * Faster than full validation, suitable for initial checks.
 */
export function quickValidate(proof: ThetaProof): boolean {
  // Check basic structure
  if (!proof.proofId || !proof.theta || !proof.result) {
    return false;
  }
  
  // Check result hash
  const expectedHash = calculateResultHash(
    proof.result.reelPositions,
    proof.theta,
    proof.clientSeed,
    proof.nonce
  );
  
  return proof.result.resultHash === expectedHash;
}

/**
 * Extracts validation summary from a validation result.
 */
export function getValidationSummary(result: ValidationResult): string {
  const passed = result.checks.filter(c => c.passed).length;
  const total = result.checks.length;
  
  if (result.valid) {
    return `Valid: ${passed}/${total} checks passed`;
  }
  
  const failed = result.checks.filter(c => !c.passed);
  return `Invalid: ${failed.map(c => c.name).join(', ')} failed`;
}
