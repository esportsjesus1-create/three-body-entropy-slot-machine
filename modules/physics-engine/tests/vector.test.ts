/**
 * Vector Operations Unit Tests
 */

import * as vec from '../src/vector';
import { Vector3D } from '../src/types';

describe('Vector Operations', () => {
  describe('createVector', () => {
    it('should create a vector with specified components', () => {
      const v = vec.createVector(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });
  });

  describe('zeroVector', () => {
    it('should create a zero vector', () => {
      const v = vec.zeroVector();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });
  });

  describe('add', () => {
    it('should add two vectors correctly', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 4, y: 5, z: 6 };
      const result = vec.add(a, b);
      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
      expect(result.z).toBe(9);
    });

    it('should handle negative values', () => {
      const a: Vector3D = { x: -1, y: 2, z: -3 };
      const b: Vector3D = { x: 1, y: -2, z: 3 };
      const result = vec.add(a, b);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('subtract', () => {
    it('should subtract two vectors correctly', () => {
      const a: Vector3D = { x: 5, y: 7, z: 9 };
      const b: Vector3D = { x: 1, y: 2, z: 3 };
      const result = vec.subtract(a, b);
      expect(result.x).toBe(4);
      expect(result.y).toBe(5);
      expect(result.z).toBe(6);
    });
  });

  describe('scale', () => {
    it('should scale a vector by a scalar', () => {
      const v: Vector3D = { x: 1, y: 2, z: 3 };
      const result = vec.scale(v, 2);
      expect(result.x).toBe(2);
      expect(result.y).toBe(4);
      expect(result.z).toBe(6);
    });

    it('should handle zero scalar', () => {
      const v: Vector3D = { x: 1, y: 2, z: 3 };
      const result = vec.scale(v, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });

    it('should handle negative scalar', () => {
      const v: Vector3D = { x: 1, y: 2, z: 3 };
      const result = vec.scale(v, -1);
      expect(result.x).toBe(-1);
      expect(result.y).toBe(-2);
      expect(result.z).toBe(-3);
    });
  });

  describe('dot', () => {
    it('should calculate dot product correctly', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 4, y: 5, z: 6 };
      const result = vec.dot(a, b);
      expect(result).toBe(32); // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    });

    it('should return zero for perpendicular vectors', () => {
      const a: Vector3D = { x: 1, y: 0, z: 0 };
      const b: Vector3D = { x: 0, y: 1, z: 0 };
      const result = vec.dot(a, b);
      expect(result).toBe(0);
    });
  });

  describe('cross', () => {
    it('should calculate cross product correctly', () => {
      const a: Vector3D = { x: 1, y: 0, z: 0 };
      const b: Vector3D = { x: 0, y: 1, z: 0 };
      const result = vec.cross(a, b);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(1);
    });

    it('should return zero for parallel vectors', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 2, y: 4, z: 6 };
      const result = vec.cross(a, b);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('magnitude', () => {
    it('should calculate magnitude correctly', () => {
      const v: Vector3D = { x: 3, y: 4, z: 0 };
      const result = vec.magnitude(v);
      expect(result).toBe(5);
    });

    it('should return zero for zero vector', () => {
      const v = vec.zeroVector();
      const result = vec.magnitude(v);
      expect(result).toBe(0);
    });
  });

  describe('magnitudeSquared', () => {
    it('should calculate squared magnitude correctly', () => {
      const v: Vector3D = { x: 3, y: 4, z: 0 };
      const result = vec.magnitudeSquared(v);
      expect(result).toBe(25);
    });
  });

  describe('normalize', () => {
    it('should normalize a vector to unit length', () => {
      const v: Vector3D = { x: 3, y: 4, z: 0 };
      const result = vec.normalize(v);
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
      expect(result.z).toBe(0);
      expect(vec.magnitude(result)).toBeCloseTo(1);
    });

    it('should return zero vector for zero input', () => {
      const v = vec.zeroVector();
      const result = vec.normalize(v);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const a: Vector3D = { x: 0, y: 0, z: 0 };
      const b: Vector3D = { x: 3, y: 4, z: 0 };
      const result = vec.distance(a, b);
      expect(result).toBe(5);
    });
  });

  describe('distanceSquared', () => {
    it('should calculate squared distance between two points', () => {
      const a: Vector3D = { x: 0, y: 0, z: 0 };
      const b: Vector3D = { x: 3, y: 4, z: 0 };
      const result = vec.distanceSquared(a, b);
      expect(result).toBe(25);
    });
  });

  describe('clone', () => {
    it('should create an independent copy', () => {
      const original: Vector3D = { x: 1, y: 2, z: 3 };
      const cloned = vec.clone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('approximatelyEqual', () => {
    it('should return true for equal vectors', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 1, y: 2, z: 3 };
      expect(vec.approximatelyEqual(a, b)).toBe(true);
    });

    it('should return true for vectors within tolerance', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 1.0000000001, y: 2, z: 3 };
      expect(vec.approximatelyEqual(a, b)).toBe(true);
    });

    it('should return false for vectors outside tolerance', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 1.1, y: 2, z: 3 };
      expect(vec.approximatelyEqual(a, b)).toBe(false);
    });

    it('should use custom tolerance', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 1.05, y: 2, z: 3 };
      expect(vec.approximatelyEqual(a, b, 0.1)).toBe(true);
    });
  });

  describe('lerp', () => {
    it('should interpolate between two vectors', () => {
      const a: Vector3D = { x: 0, y: 0, z: 0 };
      const b: Vector3D = { x: 10, y: 20, z: 30 };
      
      const result0 = vec.lerp(a, b, 0);
      expect(result0).toEqual(a);
      
      const result1 = vec.lerp(a, b, 1);
      expect(result1).toEqual(b);
      
      const resultHalf = vec.lerp(a, b, 0.5);
      expect(resultHalf.x).toBe(5);
      expect(resultHalf.y).toBe(10);
      expect(resultHalf.z).toBe(15);
    });
  });
});
