-- Migration: 001_initial
-- Description: Create initial tables for Three-Body Entropy RNG

-- Spin Sessions Table
CREATE TABLE IF NOT EXISTS spin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment VARCHAR(64) NOT NULL,
  house_seed VARCHAR(128) NOT NULL,
  client_seed VARCHAR(128),
  result JSONB,
  proof JSONB,
  physics_state JSONB,
  theta_angles JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  revealed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Indexes for spin_sessions
CREATE INDEX IF NOT EXISTS idx_spin_sessions_commitment ON spin_sessions(commitment);
CREATE INDEX IF NOT EXISTS idx_spin_sessions_created ON spin_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_spin_sessions_expires ON spin_sessions(expires_at);

-- Verification Logs Table (for audit purposes)
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES spin_sessions(id),
  verification_result JSONB NOT NULL,
  client_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for verification_logs
CREATE INDEX IF NOT EXISTS idx_verification_logs_session ON verification_logs(session_id);

-- API Keys Table (for authenticated access)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '["spin:commit", "spin:reveal", "verify:read"]',
  rate_limit INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- Index for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
