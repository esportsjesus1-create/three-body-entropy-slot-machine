/**
 * Vector3D Operations Module
 * 
 * Provides mathematical operations for 3D vectors used in the
 * gravitational simulation.
 */

import { Vector3D } from './types';

/**
 * Creates a new Vector3D with the specified components.
 */
export function createVector(x: number, y: number, z: number): Vector3D {
  return { x, y, z };
}

/**
 * Creates a zero vector.
 */
export function zeroVector(): Vector3D {
  return { x: 0, y: 0, z: 0 };
}

/**
 * Adds two vectors together.
 */
export function add(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z
  };
}

/**
 * Subtracts vector b from vector a.
 */
export function subtract(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  };
}

/**
 * Multiplies a vector by a scalar.
 */
export function scale(v: Vector3D, scalar: number): Vector3D {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar
  };
}

/**
 * Calculates the dot product of two vectors.
 */
export function dot(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculates the cross product of two vectors.
 */
export function cross(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

/**
 * Calculates the magnitude (length) of a vector.
 */
export function magnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Calculates the squared magnitude of a vector (more efficient when
 * only comparing magnitudes).
 */
export function magnitudeSquared(v: Vector3D): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

/**
 * Normalizes a vector to unit length.
 */
export function normalize(v: Vector3D): Vector3D {
  const mag = magnitude(v);
  if (mag === 0) {
    return zeroVector();
  }
  return scale(v, 1 / mag);
}

/**
 * Calculates the distance between two points.
 */
export function distance(a: Vector3D, b: Vector3D): number {
  return magnitude(subtract(a, b));
}

/**
 * Calculates the squared distance between two points.
 */
export function distanceSquared(a: Vector3D, b: Vector3D): number {
  return magnitudeSquared(subtract(a, b));
}

/**
 * Clones a vector.
 */
export function clone(v: Vector3D): Vector3D {
  return { x: v.x, y: v.y, z: v.z };
}

/**
 * Checks if two vectors are approximately equal within a tolerance.
 */
export function approximatelyEqual(a: Vector3D, b: Vector3D, tolerance: number = 1e-10): boolean {
  return (
    Math.abs(a.x - b.x) < tolerance &&
    Math.abs(a.y - b.y) < tolerance &&
    Math.abs(a.z - b.z) < tolerance
  );
}

/**
 * Linearly interpolates between two vectors.
 */
export function lerp(a: Vector3D, b: Vector3D, t: number): Vector3D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  };
}
