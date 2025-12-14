/**
 * Database Configuration
 * 
 * Configures PostgreSQL and Redis connections
 */

import pg from 'pg';
import { createClient } from 'redis';

const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis client
let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
  }
  return redisClient;
}

// Database query helper
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get a client from the pool for transactions
async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };
  
  return client;
}

// Health check
async function healthCheck() {
  try {
    await pool.query('SELECT 1');
    return { postgres: 'healthy' };
  } catch (error) {
    return { postgres: 'unhealthy', error: error.message };
  }
}

// Close connections
async function close() {
  await pool.end();
  if (redisClient) {
    await redisClient.quit();
  }
}

export {
  pool,
  query,
  getClient,
  getRedisClient,
  healthCheck,
  close
};
