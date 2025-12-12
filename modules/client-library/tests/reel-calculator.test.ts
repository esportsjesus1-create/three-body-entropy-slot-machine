/**
 * Reel Calculator Unit Tests
 */

import {
  validateReelCount,
  validateReelConfiguration,
  calculateReelPositions,
  calculateReelResult,
  generateResultHash,
  verifyReelPositions,
  createDefaultReelConfig,
  createDefaultPaylines,
  ReelConfiguration,
  EntropyData
} from '../src';

describe('Reel Calculator', () => {
  const mockEntropyData: EntropyData = {
    value: 0.123456789,
    hex: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    sourceHash: 'source123hash456',
    timestamp: 1700000000000
  };

  describe('validateReelCount', () => {
    it('should return true for valid reel counts', () => {
      expect(validateReelCount(3)).toBe(true);
      expect(validateReelCount(4)).toBe(true);
      expect(validateReelCount(5)).toBe(true);
      expect(validateReelCount(6)).toBe(true);
      expect(validateReelCount(7)).toBe(true);
      expect(validateReelCount(8)).toBe(true);
    });

    it('should return false for invalid reel counts', () => {
      expect(validateReelCount(2)).toBe(false);
      expect(validateReelCount(9)).toBe(false);
      expect(validateReelCount(0)).toBe(false);
      expect(validateReelCount(-1)).toBe(false);
      expect(validateReelCount(3.5)).toBe(false);
    });
  });

  describe('validateReelConfiguration', () => {
    it('should accept valid configuration', () => {
      const config: ReelConfiguration = {
        reelCount: 5,
        symbolsPerReel: 20
      };
      expect(() => validateReelConfiguration(config)).not.toThrow();
    });

    it('should reject invalid reel count', () => {
      const config = {
        reelCount: 2 as any,
        symbolsPerReel: 20
      };
      expect(() => validateReelConfiguration(config)).toThrow('Invalid reel count');
    });

    it('should reject zero symbols per reel', () => {
      const config: ReelConfiguration = {
        reelCount: 5,
        symbolsPerReel: 0
      };
      expect(() => validateReelConfiguration(config)).toThrow('Symbols per reel must be at least 1');
    });

    it('should reject empty symbols array', () => {
      const config: ReelConfiguration = {
        reelCount: 5,
        symbolsPerReel: 20,
        symbols: []
      };
      expect(() => validateReelConfiguration(config)).toThrow('Symbols array cannot be empty');
    });

    it('should reject paylines with wrong position count', () => {
      const config: ReelConfiguration = {
        reelCount: 5,
        symbolsPerReel: 20,
        paylines: [{ id: 1, positions: [0, 0, 0] }] // Only 3 positions for 5 reels
      };
      expect(() => validateReelConfiguration(config)).toThrow('positions');
    });
  });

  describe('calculateReelPositions', () => {
    it('should calculate positions for 3 reels', () => {
      const config: ReelConfiguration = { reelCount: 3, symbolsPerReel: 20 };
      const positions = calculateReelPositions(
        mockEntropyData.hex,
        config,
        'client-seed',
        1
      );

      expect(positions).toHaveLength(3);
      positions.forEach(pos => {
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(20);
      });
    });

    it('should calculate positions for 8 reels', () => {
      const config: ReelConfiguration = { reelCount: 8, symbolsPerReel: 30 };
      const positions = calculateReelPositions(
        mockEntropyData.hex,
        config,
        'client-seed',
        1
      );

      expect(positions).toHaveLength(8);
      positions.forEach(pos => {
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(30);
      });
    });

    it('should be deterministic', () => {
      const config: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const positions1 = calculateReelPositions(mockEntropyData.hex, config, 'seed', 1);
      const positions2 = calculateReelPositions(mockEntropyData.hex, config, 'seed', 1);

      expect(positions1).toEqual(positions2);
    });

    it('should produce different results for different nonces', () => {
      const config: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const positions1 = calculateReelPositions(mockEntropyData.hex, config, 'seed', 1);
      const positions2 = calculateReelPositions(mockEntropyData.hex, config, 'seed', 2);

      expect(positions1).not.toEqual(positions2);
    });

    it('should produce different results for different client seeds', () => {
      const config: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const positions1 = calculateReelPositions(mockEntropyData.hex, config, 'seed1', 1);
      const positions2 = calculateReelPositions(mockEntropyData.hex, config, 'seed2', 1);

      expect(positions1).not.toEqual(positions2);
    });

    it('should accept numeric entropy value', () => {
      const config: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const positions = calculateReelPositions(0.5, config, 'seed', 1);

      expect(positions).toHaveLength(5);
    });
  });

  describe('calculateReelResult', () => {
    it('should calculate complete result', () => {
      const config: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const result = calculateReelResult(mockEntropyData, config, 'seed', 1);

      expect(result.reelPositions).toHaveLength(5);
      expect(typeof result.winAmount).toBe('number');
      expect(typeof result.multiplier).toBe('number');
    });

    it('should include symbols when defined', () => {
      const config = createDefaultReelConfig(5);
      const result = calculateReelResult(mockEntropyData, config, 'seed', 1);

      expect(result.symbols).toBeDefined();
      expect(result.symbols).toHaveLength(5);
    });

    it('should calculate wins with paylines', () => {
      const config = createDefaultReelConfig(5);
      config.paylines = createDefaultPaylines(5);
      const result = calculateReelResult(mockEntropyData, config, 'seed', 1);

      expect(result.winningPaylines).toBeDefined();
    });
  });

  describe('generateResultHash', () => {
    it('should generate consistent hash', () => {
      const positions = [1, 2, 3, 4, 5];
      const hash1 = generateResultHash(positions, mockEntropyData.hex, 'seed', 1);
      const hash2 = generateResultHash(positions, mockEntropyData.hex, 'seed', 1);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different hashes for different inputs', () => {
      const positions = [1, 2, 3, 4, 5];
      const hash1 = generateResultHash(positions, mockEntropyData.hex, 'seed', 1);
      const hash2 = generateResultHash(positions, mockEntropyData.hex, 'seed', 2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyReelPositions', () => {
    it('should verify valid positions', () => {
      const config: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const positions = calculateReelPositions(mockEntropyData.hex, config, 'seed', 1);

      const valid = verifyReelPositions(positions, mockEntropyData, config, 'seed', 1);
      expect(valid).toBe(true);
    });

    it('should reject invalid positions', () => {
      const config: ReelConfiguration = { reelCount: 5, symbolsPerReel: 20 };
      const positions = [99, 99, 99, 99, 99];

      const valid = verifyReelPositions(positions, mockEntropyData, config, 'seed', 1);
      expect(valid).toBe(false);
    });

    it('should handle errors gracefully', () => {
      const config = { reelCount: 2 as any, symbolsPerReel: 20 };
      const valid = verifyReelPositions([1, 2], mockEntropyData, config, 'seed', 1);
      expect(valid).toBe(false);
    });
  });

  describe('createDefaultReelConfig', () => {
    it('should create config for each reel count', () => {
      for (const count of [3, 4, 5, 6, 7, 8] as const) {
        const config = createDefaultReelConfig(count);
        expect(config.reelCount).toBe(count);
        expect(config.symbolsPerReel).toBe(20);
        expect(config.symbols).toBeDefined();
        expect(config.symbols!.length).toBeGreaterThan(0);
      }
    });

    it('should include wild symbol', () => {
      const config = createDefaultReelConfig(5);
      const wildSymbol = config.symbols!.find(s => s.isWild);
      expect(wildSymbol).toBeDefined();
    });
  });

  describe('createDefaultPaylines', () => {
    it('should create paylines for each reel count', () => {
      for (const count of [3, 4, 5, 6, 7, 8] as const) {
        const paylines = createDefaultPaylines(count);
        expect(paylines.length).toBeGreaterThan(0);
        
        for (const payline of paylines) {
          expect(payline.positions).toHaveLength(count);
        }
      }
    });

    it('should include center, top, and bottom lines', () => {
      const paylines = createDefaultPaylines(5);
      expect(paylines.find(p => p.id === 1)).toBeDefined(); // Center
      expect(paylines.find(p => p.id === 2)).toBeDefined(); // Top
      expect(paylines.find(p => p.id === 3)).toBeDefined(); // Bottom
    });

    it('should include V-shape for 5+ reels', () => {
      const paylines = createDefaultPaylines(5);
      expect(paylines.find(p => p.id === 4)).toBeDefined(); // V-shape
      expect(paylines.find(p => p.id === 5)).toBeDefined(); // Inverted V
    });
  });
});
