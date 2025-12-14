/**
 * Three-Body Entropy RNG API Server
 * 
 * Express server providing provably fair RNG endpoints
 * using three-body gravitational dynamics for entropy generation.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { healthCheck, close } from './config/database.js';
import { generalLimiter } from './middleware/rateLimit.js';
import spinRoutes from './routes/spin.js';
import verifyRoutes from './routes/verify.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Request logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// General rate limiting
app.use(generalLimiter);

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const healthy = dbHealth.postgres === 'healthy';
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: NODE_ENV,
      services: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness check endpoint
app.get('/ready', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    if (dbHealth.postgres === 'healthy') {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'Database not ready' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, reason: error.message });
  }
});

// API routes
app.use('/api/v1/spin', spinRoutes);
app.use('/api/v1/verify', verifyRoutes);

// API documentation endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Three-Body Entropy RNG API',
    version: '1.0.0',
    description: 'Provably fair RNG using three-body gravitational dynamics',
    endpoints: {
      'POST /api/v1/spin/commit': 'Create commitment for new spin',
      'POST /api/v1/spin/reveal': 'Reveal spin result with client seed',
      'POST /api/v1/spin/quick': 'Quick spin (commit + reveal)',
      'GET /api/v1/verify/:sessionId': 'Get session data for verification',
      'POST /api/v1/verify/:sessionId': 'Verify spin result',
      'GET /api/v1/verify': 'Get spin history',
      'GET /api/v1/verify/stats': 'Get statistics'
    },
    documentation: 'https://github.com/esportsjesus1-create/three-body-entropy-rng'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    requestId: req.requestId
  });
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    await close();
    console.log('Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Three-Body Entropy RNG API Server                     ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(42)}║
║  Port: ${PORT.toString().padEnd(49)}║
║  Health: http://localhost:${PORT}/health${' '.repeat(24)}║
║  API: http://localhost:${PORT}/api/v1${' '.repeat(27)}║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
