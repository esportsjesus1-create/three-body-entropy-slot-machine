/**
 * Database Models
 * 
 * PostgreSQL models for spin sessions and verification
 */

import { query, getClient } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Spin Session Model
 */
export const SpinSession = {
  /**
   * Create a new spin session with commitment
   */
  async create({ commitment, houseSeed, physicsState, thetaAngles, expiresAt }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO spin_sessions 
       (id, commitment, house_seed, physics_state, theta_angles, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, commitment, houseSeed, JSON.stringify(physicsState), JSON.stringify(thetaAngles), expiresAt]
    );
    return result.rows[0];
  },

  /**
   * Find session by ID
   */
  async findById(id) {
    const result = await query(
      'SELECT * FROM spin_sessions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find session by commitment hash
   */
  async findByCommitment(commitment) {
    const result = await query(
      'SELECT * FROM spin_sessions WHERE commitment = $1',
      [commitment]
    );
    return result.rows[0] || null;
  },

  /**
   * Update session with reveal data
   */
  async reveal(id, { clientSeed, result, proof }) {
    const updateResult = await query(
      `UPDATE spin_sessions 
       SET client_seed = $2, result = $3, proof = $4, revealed_at = NOW()
       WHERE id = $1 AND revealed_at IS NULL
       RETURNING *`,
      [id, clientSeed, JSON.stringify(result), JSON.stringify(proof)]
    );
    return updateResult.rows[0] || null;
  },

  /**
   * Check if session is expired
   */
  async isExpired(id) {
    const result = await query(
      'SELECT expires_at < NOW() as expired FROM spin_sessions WHERE id = $1',
      [id]
    );
    return result.rows[0]?.expired ?? true;
  },

  /**
   * Check if session is already revealed
   */
  async isRevealed(id) {
    const result = await query(
      'SELECT revealed_at IS NOT NULL as revealed FROM spin_sessions WHERE id = $1',
      [id]
    );
    return result.rows[0]?.revealed ?? false;
  },

  /**
   * Get session history for a user (if user tracking is implemented)
   */
  async getHistory(limit = 50, offset = 0) {
    const result = await query(
      `SELECT id, commitment, created_at, revealed_at, 
              result->>'totalWin' as total_win
       FROM spin_sessions 
       WHERE revealed_at IS NOT NULL
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  /**
   * Clean up expired unrevealed sessions
   */
  async cleanupExpired() {
    const result = await query(
      `DELETE FROM spin_sessions 
       WHERE expires_at < NOW() AND revealed_at IS NULL
       RETURNING id`
    );
    return result.rowCount;
  },

  /**
   * Get statistics
   */
  async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN revealed_at IS NOT NULL THEN 1 END) as revealed_sessions,
        COUNT(CASE WHEN expires_at < NOW() AND revealed_at IS NULL THEN 1 END) as expired_sessions,
        AVG(EXTRACT(EPOCH FROM (revealed_at - created_at))) as avg_reveal_time_seconds
      FROM spin_sessions
    `);
    return result.rows[0];
  }
};

/**
 * Verification Log Model
 * Tracks verification requests for audit purposes
 */
export const VerificationLog = {
  /**
   * Log a verification request
   */
  async create({ sessionId, verificationResult, clientIp }) {
    const result = await query(
      `INSERT INTO verification_logs 
       (session_id, verification_result, client_ip)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sessionId, JSON.stringify(verificationResult), clientIp]
    );
    return result.rows[0];
  },

  /**
   * Get verification history for a session
   */
  async getBySessionId(sessionId) {
    const result = await query(
      `SELECT * FROM verification_logs 
       WHERE session_id = $1 
       ORDER BY created_at DESC`,
      [sessionId]
    );
    return result.rows;
  }
};

export default { SpinSession, VerificationLog };
