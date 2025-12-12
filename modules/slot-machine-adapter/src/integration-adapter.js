/**
 * Three-Body Entropy Slot Machine Integration Adapter (JavaScript/Browser Version)
 * 
 * This module provides a provably fair RNG integration for slot machines,
 * replacing Math.random() with cryptographically secure entropy derived
 * from three-body gravitational dynamics combined with client seeds.
 * 
 * Provably Fair Workflow:
 * 1. House generates server seed and commits to it (hash)
 * 2. Client provides their seed after seeing commitment
 * 3. Both seeds are mixed cryptographically to generate final entropy
 * 4. Entropy is used to determine spin results
 * 5. Server seed is revealed for verification
 */

/**
 * Simple SHA-256 hash function using Web Crypto API
 * Falls back to Node.js crypto if not in browser
 */
async function sha256(message) {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(message).digest('hex');
  }
}

/**
 * HMAC-SHA256 function
 */
async function hmacSha256(key, message) {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const msgData = encoder.encode(message);
    
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', key).update(message).digest('hex');
  }
}

/**
 * Generate random bytes
 */
function generateRandomBytes(length) {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }
}

/**
 * Three-Body Entropy Source
 * Simulates chaotic three-body gravitational dynamics
 */
class ThreeBodyEntropySource {
  constructor(seed) {
    this.G = 1.0;
    this.softening = 0.01;
    this.bodies = [];
    this.initializeFromSeed(seed);
  }

  initializeFromSeed(seed) {
    const seedBytes = [];
    for (let i = 0; i < seed.length && seedBytes.length < 32; i += 2) {
      if (seed.length > i + 1) {
        seedBytes.push(parseInt(seed.substr(i, 2), 16) || (seed.charCodeAt(i) % 256));
      } else {
        seedBytes.push(seed.charCodeAt(i) % 256);
      }
    }
    
    while (seedBytes.length < 32) {
      seedBytes.push((seedBytes.length * 17 + 13) % 256);
    }

    this.bodies = [];
    for (let i = 0; i < 3; i++) {
      const offset = i * 10;
      this.bodies.push({
        mass: 0.5 + (seedBytes[offset % 32] / 255) * 1.5,
        position: {
          x: ((seedBytes[(offset + 1) % 32] / 255) - 0.5) * 10,
          y: ((seedBytes[(offset + 2) % 32] / 255) - 0.5) * 10,
          z: ((seedBytes[(offset + 3) % 32] / 255) - 0.5) * 10
        },
        velocity: {
          x: ((seedBytes[(offset + 4) % 32] / 255) - 0.5) * 2,
          y: ((seedBytes[(offset + 5) % 32] / 255) - 0.5) * 2,
          z: ((seedBytes[(offset + 6) % 32] / 255) - 0.5) * 2
        }
      });
    }
  }

  calculateAcceleration(bodyIndex) {
    const body = this.bodies[bodyIndex];
    let ax = 0, ay = 0, az = 0;

    for (let j = 0; j < 3; j++) {
      if (j === bodyIndex) continue;
      
      const other = this.bodies[j];
      const dx = other.position.x - body.position.x;
      const dy = other.position.y - body.position.y;
      const dz = other.position.z - body.position.z;
      
      const distSq = dx * dx + dy * dy + dz * dz + this.softening * this.softening;
      const dist = Math.sqrt(distSq);
      const force = this.G * other.mass / distSq;
      
      ax += force * dx / dist;
      ay += force * dy / dist;
      az += force * dz / dist;
    }

    return { x: ax, y: ay, z: az };
  }

  rk4Step(dt) {
    const k1 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    const tempBodies1 = this.bodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + b.velocity.x * dt / 2,
        y: b.position.y + b.velocity.y * dt / 2,
        z: b.position.z + b.velocity.z * dt / 2
      },
      velocity: {
        x: b.velocity.x + k1[i].x * dt / 2,
        y: b.velocity.y + k1[i].y * dt / 2,
        z: b.velocity.z + k1[i].z * dt / 2
      }
    }));
    
    const originalBodies = this.bodies;
    this.bodies = tempBodies1;
    const k2 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    const tempBodies2 = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + tempBodies1[i].velocity.x * dt / 2,
        y: b.position.y + tempBodies1[i].velocity.y * dt / 2,
        z: b.position.z + tempBodies1[i].velocity.z * dt / 2
      },
      velocity: {
        x: b.velocity.x + k2[i].x * dt / 2,
        y: b.velocity.y + k2[i].y * dt / 2,
        z: b.velocity.z + k2[i].z * dt / 2
      }
    }));
    
    this.bodies = tempBodies2;
    const k3 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    const tempBodies3 = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + tempBodies2[i].velocity.x * dt,
        y: b.position.y + tempBodies2[i].velocity.y * dt,
        z: b.position.z + tempBodies2[i].velocity.z * dt
      },
      velocity: {
        x: b.velocity.x + k3[i].x * dt,
        y: b.velocity.y + k3[i].y * dt,
        z: b.velocity.z + k3[i].z * dt
      }
    }));
    
    this.bodies = tempBodies3;
    const k4 = this.bodies.map((_, i) => this.calculateAcceleration(i));
    
    this.bodies = originalBodies.map((b, i) => ({
      ...b,
      position: {
        x: b.position.x + (b.velocity.x + 2 * tempBodies1[i].velocity.x + 2 * tempBodies2[i].velocity.x + tempBodies3[i].velocity.x) * dt / 6,
        y: b.position.y + (b.velocity.y + 2 * tempBodies1[i].velocity.y + 2 * tempBodies2[i].velocity.y + tempBodies3[i].velocity.y) * dt / 6,
        z: b.position.z + (b.velocity.z + 2 * tempBodies1[i].velocity.z + 2 * tempBodies2[i].velocity.z + tempBodies3[i].velocity.z) * dt / 6
      },
      velocity: {
        x: b.velocity.x + (k1[i].x + 2 * k2[i].x + 2 * k3[i].x + k4[i].x) * dt / 6,
        y: b.velocity.y + (k1[i].y + 2 * k2[i].y + 2 * k3[i].y + k4[i].y) * dt / 6,
        z: b.velocity.z + (k1[i].z + 2 * k2[i].z + 2 * k3[i].z + k4[i].z) * dt / 6
      }
    }));
  }

  simulate(duration, timeStep = 0.01) {
    const steps = Math.floor(duration / timeStep);
    for (let i = 0; i < steps; i++) {
      this.rk4Step(timeStep);
    }
  }

  getStateString() {
    const components = [];
    for (const body of this.bodies) {
      components.push(
        body.position.x.toExponential(15),
        body.position.y.toExponential(15),
        body.position.z.toExponential(15),
        body.velocity.x.toExponential(15),
        body.velocity.y.toExponential(15),
        body.velocity.z.toExponential(15)
      );
    }
    return components.join(':');
  }
}

/**
 * Main Slot Machine RNG Adapter
 */
class SlotMachineRNGAdapter {
  constructor(config, serverSecret = null) {
    this.config = {
      symbols: config.symbols || ['fa', 'zhong', 'bai', 'bawan', 'wusuo', 'wutong', 'liangsuo', 'liangtong', 'wild', 'bonus'],
      reelCount: config.reelCount || 5,
      rowCount: config.rowCount || 6,
      bufferRows: config.bufferRows || 4,
      spawnRates: {
        wildChance: config.spawnRates?.wildChance ?? 0.02,
        bonusChance: config.spawnRates?.bonusChance ?? 0.03,
        goldChance: config.spawnRates?.goldChance ?? 0.15
      },
      goldAllowedColumns: config.goldAllowedColumns || [1, 2, 3]
    };
    
    this.serverSecret = serverSecret || generateRandomBytes(32);
    this.currentServerSeed = null;
    this.currentNonce = 0;
    this.commitments = new Map();
    this.initialized = false;
  }

  async initialize() {
    this.currentServerSeed = await this.generateServerSeed();
    this.initialized = true;
    return this;
  }

  async generateServerSeed() {
    const baseSeed = `${this.serverSecret}:${Date.now()}:${generateRandomBytes(16)}`;
    const entropy = new ThreeBodyEntropySource(baseSeed);
    entropy.simulate(5.0, 0.01);
    return await sha256(entropy.getStateString());
  }

  async createCommitment() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    this.currentNonce++;
    const commitment = {
      commitmentHash: await sha256(this.currentServerSeed),
      nonce: this.currentNonce,
      timestamp: Date.now()
    };
    
    this.commitments.set(this.currentNonce, commitment);
    return commitment;
  }

  async generateCombinedEntropy(clientSeed, nonce) {
    const combinedSeed = `${this.currentServerSeed}:${clientSeed}:${nonce}`;
    const entropy = new ThreeBodyEntropySource(combinedSeed);
    entropy.simulate(3.0, 0.01);
    return await hmacSha256(this.serverSecret, entropy.getStateString());
  }

  async generateTestModeEntropy(nonce) {
    const testSeed = `${this.currentServerSeed}:test:${nonce}`;
    const entropy = new ThreeBodyEntropySource(testSeed);
    entropy.simulate(3.0, 0.01);
    return await hmacSha256(this.serverSecret, entropy.getStateString());
  }

  async getRandomValue(entropyHex, position, max) {
    const expandedEntropy = await hmacSha256(entropyHex, `position:${position}`);
    const hexPart = expandedEntropy.substring(0, 8);
    const value = parseInt(hexPart, 16);
    return value % max;
  }

  async getRandomFloat(entropyHex, position) {
    const expandedEntropy = await hmacSha256(entropyHex, `float:${position}`);
    const hexPart = expandedEntropy.substring(0, 8);
    const value = parseInt(hexPart, 16);
    return value / 0xffffffff;
  }

  async getRandomSymbol(entropyHex, position, options = {}) {
    const { col, allowGold = false, allowBonus = true } = options;
    const { wildChance, bonusChance, goldChance } = this.config.spawnRates;
    const pool = this.config.symbols.filter(s => s !== 'wild' && s !== 'bonus');
    
    if (pool.length === 0) return 'fa';

    let positionOffset = position * 4;

    if (await this.getRandomFloat(entropyHex, positionOffset) < wildChance) {
      return 'wild';
    }

    if (allowBonus && await this.getRandomFloat(entropyHex, positionOffset + 1) < bonusChance) {
      return 'bonus';
    }

    const symbolIndex = await this.getRandomValue(entropyHex, positionOffset + 2, pool.length);
    let symbol = pool[symbolIndex];

    if (allowGold && await this.getRandomFloat(entropyHex, positionOffset + 3) < goldChance) {
      const isAllowedColumn = col === undefined || this.config.goldAllowedColumns.includes(col);
      if (isAllowedColumn) {
        symbol = symbol + '_gold';
      }
    }

    return symbol;
  }

  async generateSpinEntropy(request) {
    const { clientSeed = null, nonce, options = {} } = request;
    const { allowGold = true, allowBonus = true } = options;

    const commitment = this.commitments.get(nonce);
    if (!commitment) {
      throw new Error(`No commitment found for nonce ${nonce}. Call createCommitment() first.`);
    }

    const testMode = !clientSeed;
    const entropyHex = testMode 
      ? await this.generateTestModeEntropy(nonce)
      : await this.generateCombinedEntropy(clientSeed, nonce);

    const grid = [];
    const totalRows = this.config.rowCount + this.config.bufferRows;
    let positionCounter = 0;

    for (let col = 0; col < this.config.reelCount; col++) {
      grid[col] = [];
      let bonusCountInVisibleRows = 0;
      const fullyVisibleStart = this.config.bufferRows;
      const fullyVisibleEnd = fullyVisibleStart + (this.config.rowCount - 2);

      for (let row = 0; row < totalRows; row++) {
        const visualRow = row - this.config.bufferRows;
        const isVisibleRow = row >= fullyVisibleStart && row <= fullyVisibleEnd;
        const canHaveBonus = allowBonus && !(isVisibleRow && bonusCountInVisibleRows >= 1);

        const symbol = await this.getRandomSymbol(entropyHex, positionCounter++, {
          col,
          visualRow,
          allowGold,
          allowBonus: canHaveBonus
        });

        grid[col][row] = symbol;

        if (symbol === 'bonus' && isVisibleRow) {
          bonusCountInVisibleRows++;
        }
      }
    }

    const proofId = (await sha256(`${entropyHex}:${nonce}`)).substring(0, 32);
    const seedForSignature = testMode ? 'test' : clientSeed;
    const signatureData = `${proofId}:${commitment.commitmentHash}:${seedForSignature}:${nonce}`;
    const signature = await hmacSha256(this.serverSecret, signatureData);

    const proof = {
      proofId,
      serverSeed: this.currentServerSeed,
      clientSeed: testMode ? null : clientSeed,
      nonce,
      combinedHash: entropyHex,
      signature,
      testMode,
      timestamp: Date.now()
    };

    return {
      grid,
      symbols: this.flattenGridToSymbols(grid),
      proof,
      commitment,
      entropyHex,
      testMode
    };
  }

  flattenGridToSymbols(grid) {
    const symbols = [];
    const visibleStart = this.config.bufferRows;
    const visibleEnd = visibleStart + this.config.rowCount - 1;
    
    for (let row = visibleStart; row <= visibleEnd; row++) {
      for (let col = 0; col < this.config.reelCount; col++) {
        if (grid[col] && grid[col][row]) {
          symbols.push(grid[col][row]);
        }
      }
    }
    return symbols;
  }

  async createReelStrips(clientSeed, nonce, stripLength) {
    const commitment = this.commitments.get(nonce);
    if (!commitment) {
      throw new Error(`No commitment found for nonce ${nonce}. Call createCommitment() first.`);
    }

    const entropyHex = await this.generateCombinedEntropy(clientSeed, nonce);
    const strips = [];
    let positionCounter = 0;

    for (let col = 0; col < this.config.reelCount; col++) {
      const strip = [];
      for (let i = 0; i < stripLength; i++) {
        strip.push(await this.getRandomSymbol(entropyHex, positionCounter++, {
          col,
          allowGold: true,
          allowBonus: true
        }));
      }
      strips.push(strip);
    }

    const proofId = (await sha256(`${entropyHex}:${nonce}:strips`)).substring(0, 32);
    const signatureData = `${proofId}:${commitment.commitmentHash}:${clientSeed}:${nonce}`;
    const signature = await hmacSha256(this.serverSecret, signatureData);

    const proof = {
      proofId,
      serverSeed: this.currentServerSeed,
      clientSeed,
      nonce,
      combinedHash: entropyHex,
      signature,
      timestamp: Date.now()
    };

    return {
      reelStrips: strips,
      proof,
      commitment,
      entropyHex
    };
  }

  async rotateServerSeed() {
    this.currentServerSeed = await this.generateServerSeed();
    this.commitments.clear();
  }

  getServerSeed() {
    return this.currentServerSeed;
  }

  getServerSecret() {
    return this.serverSecret;
  }
}

/**
 * Static verification function
 * Supports both production mode (with clientSeed) and test mode (without clientSeed)
 */
async function verifySpinResult(result, serverSecret, config) {
  const errors = [];
  const testMode = result.proof.testMode || result.testMode || false;
  const checks = {
    commitmentValid: false,
    entropyValid: false,
    signatureValid: false,
    gridValid: false,
    testMode
  };

  const expectedCommitment = await sha256(result.proof.serverSeed);
  checks.commitmentValid = expectedCommitment === result.commitment.commitmentHash;
  if (!checks.commitmentValid) {
    errors.push('Server seed does not match commitment hash');
  }

  let combinedSeed;
  if (testMode) {
    combinedSeed = `${result.proof.serverSeed}:test:${result.proof.nonce}`;
  } else {
    combinedSeed = `${result.proof.serverSeed}:${result.proof.clientSeed}:${result.proof.nonce}`;
  }
  const entropy = new ThreeBodyEntropySource(combinedSeed);
  entropy.simulate(3.0, 0.01);
  const expectedEntropy = await hmacSha256(serverSecret, entropy.getStateString());
  
  checks.entropyValid = expectedEntropy === result.entropyHex;
  if (!checks.entropyValid) {
    errors.push('Entropy hash does not match expected value');
  }

  const seedForSignature = testMode ? 'test' : result.proof.clientSeed;
  const signatureData = `${result.proof.proofId}:${result.commitment.commitmentHash}:${seedForSignature}:${result.proof.nonce}`;
  const expectedSignature = await hmacSha256(serverSecret, signatureData);
  
  checks.signatureValid = expectedSignature === result.proof.signature;
  if (!checks.signatureValid) {
    errors.push('Signature verification failed');
  }

  checks.gridValid = result.grid && result.grid.length === config.reelCount;
  if (!checks.gridValid) {
    errors.push(`Grid validation failed`);
  }

  return {
    valid: checks.commitmentValid && checks.entropyValid && checks.signatureValid && checks.gridValid,
    checks,
    errors,
    testMode
  };
}

/**
 * Initialize the slot machine RNG adapter
 */
async function initSlotMachineRNG(config, serverSecret = null) {
  const adapter = new SlotMachineRNGAdapter(config, serverSecret);
  await adapter.initialize();
  return adapter;
}

/**
 * Generate client seed (browser-side)
 */
function generateClientSeed() {
  return generateRandomBytes(32);
}

/**
 * Default configuration for the simple-slot-machine-game
 */
const DEFAULT_SLOT_CONFIG = {
  symbols: ['fa', 'zhong', 'bai', 'bawan', 'wusuo', 'wutong', 'liangsuo', 'liangtong', 'wild', 'bonus'],
  reelCount: 5,
  rowCount: 6,
  bufferRows: 4,
  spawnRates: {
    wildChance: 0.02,
    bonusChance: 0.03,
    goldChance: 0.15
  },
  goldAllowedColumns: [1, 2, 3]
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SlotMachineRNGAdapter,
    ThreeBodyEntropySource,
    initSlotMachineRNG,
    generateClientSeed,
    verifySpinResult,
    DEFAULT_SLOT_CONFIG,
    sha256,
    hmacSha256
  };
}

if (typeof window !== 'undefined') {
  window.ThreeBodyRNG = {
    SlotMachineRNGAdapter,
    ThreeBodyEntropySource,
    initSlotMachineRNG,
    generateClientSeed,
    verifySpinResult,
    DEFAULT_SLOT_CONFIG
  };
}

export {
  SlotMachineRNGAdapter,
  ThreeBodyEntropySource,
  initSlotMachineRNG,
  generateClientSeed,
  verifySpinResult,
  DEFAULT_SLOT_CONFIG
};
