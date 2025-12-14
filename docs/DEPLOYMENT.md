# Three-Body Entropy Slot Machine Deployment Guide

## Overview

This guide covers deploying the Three-Body Entropy Slot Machine system to production environments. It includes instructions for AWS/DigitalOcean deployment, PM2 process management, NGINX reverse proxy configuration, Redis for caching/sessions, and PostgreSQL for persistent data.

## Prerequisites

- Node.js 18+ LTS
- npm or yarn
- Git
- Linux server (Ubuntu 20.04+ recommended)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX                                    │
│                    (Reverse Proxy)                               │
│                    Port 80/443                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PM2                                      │
│                  (Process Manager)                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Worker 1   │  │  Worker 2   │  │  Worker N   │             │
│  │  Port 3001  │  │  Port 3002  │  │  Port 300N  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Redis   │    │ PostgreSQL│    │  Files   │
    │  :6379   │    │   :5432   │    │  (logs)  │
    └──────────┘    └──────────┘    └──────────┘
```

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl git build-essential

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Create Application User

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash slotmachine
sudo usermod -aG sudo slotmachine

# Switch to user
sudo su - slotmachine
```

### 3. Clone and Build Application

```bash
# Clone repository
git clone https://github.com/your-org/three-body-entropy-slot-machine.git
cd three-body-entropy-slot-machine

# Install dependencies
npm install

# Build all modules
npm run build

# Run tests to verify
npm test
```

## Redis Setup

### Installation

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

### Configuration

```conf
# /etc/redis/redis.conf

# Bind to localhost only
bind 127.0.0.1

# Set password
requirepass your_redis_password_here

# Enable persistence
appendonly yes
appendfsync everysec

# Memory limit
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Start Redis

```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl status redis-server
```

## PostgreSQL Setup

### Installation

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start service
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Database Configuration

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE slotmachine;
CREATE USER slotuser WITH ENCRYPTED PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE slotmachine TO slotuser;
\q
```

### Schema Setup

```sql
-- Connect to database
\c slotmachine

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    game_id VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'INIT',
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    hash_chain JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spins table
CREATE TABLE spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    nonce INTEGER NOT NULL,
    bet DECIMAL(15,2) NOT NULL,
    entropy_hex VARCHAR(64) NOT NULL,
    reel_positions INTEGER[] NOT NULL,
    symbols VARCHAR(50)[] NOT NULL,
    win_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    proof JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_state ON sessions(state);
CREATE INDEX idx_spins_session_id ON spins(session_id);
CREATE INDEX idx_spins_created_at ON spins(created_at);
```

## PM2 Process Management

### Installation

```bash
# Install PM2 globally
sudo npm install -g pm2
```

### Ecosystem Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'slot-machine-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      REDIS_URL: 'redis://:your_redis_password@127.0.0.1:6379',
      DATABASE_URL: 'postgresql://slotuser:your_password@127.0.0.1:5432/slotmachine',
      SERVER_SECRET: 'your_server_secret_here'
    }
  }]
};
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
pm2 logs slot-machine-api

# Restart
pm2 restart slot-machine-api

# Stop
pm2 stop slot-machine-api

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

## NGINX Configuration

### Installation

```bash
sudo apt install -y nginx
```

### Site Configuration

Create `/etc/nginx/sites-available/slotmachine`:

```nginx
upstream slot_backend {
    least_conn;
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/slotmachine_access.log;
    error_log /var/log/nginx/slotmachine_error.log;

    # API Location
    location /api {
        proxy_pass http://slot_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Health Check
    location /health {
        proxy_pass http://slot_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    location /api/spin {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://slot_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/slotmachine /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Environment Variables

Create `.env.production`:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
SERVER_SECRET=your_very_long_random_secret_here
JWT_SECRET=another_random_secret_for_jwt

# Redis
REDIS_URL=redis://:your_redis_password@127.0.0.1:6379
REDIS_TTL=3600

# PostgreSQL
DATABASE_URL=postgresql://slotuser:your_password@127.0.0.1:5432/slotmachine

# Simulation
DEFAULT_SIMULATION_DURATION=10.0
DEFAULT_SIMULATION_TIMESTEP=0.001

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web dashboard
pm2 plus
```

### Health Check Endpoint

```typescript
// Add to your server
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### Log Rotation

```bash
# Install logrotate config
sudo nano /etc/logrotate.d/slotmachine
```

```
/home/slotmachine/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 slotmachine slotmachine
}
```

## Backup Strategy

### Database Backup

```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/home/slotmachine/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U slotuser slotmachine > $BACKUP_DIR/db_$DATE.sql
gzip $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

### Redis Backup

```bash
# Redis automatically creates RDB snapshots
# Copy dump.rdb periodically
cp /var/lib/redis/dump.rdb /home/slotmachine/backups/redis_$(date +%Y%m%d).rdb
```

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication only
- [ ] Fail2ban installed
- [ ] SSL/TLS enabled
- [ ] Database passwords set
- [ ] Redis password set
- [ ] Server secret generated
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Regular backups scheduled
- [ ] Log monitoring enabled

## Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

## Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check PM2 logs
pm2 logs slot-machine-api --lines 100

# Check Node.js version
node --version
```

**Database connection failed:**
```bash
# Test connection
psql -U slotuser -h 127.0.0.1 -d slotmachine

# Check PostgreSQL status
sudo systemctl status postgresql
```

**Redis connection failed:**
```bash
# Test connection
redis-cli -a your_redis_password ping

# Check Redis status
sudo systemctl status redis-server
```

**NGINX 502 Bad Gateway:**
```bash
# Check if app is running
pm2 status

# Check NGINX error logs
sudo tail -f /var/log/nginx/slotmachine_error.log
```

## Scaling

### Horizontal Scaling

1. Add more application servers
2. Use load balancer (AWS ALB, DigitalOcean Load Balancer)
3. Configure Redis cluster for session sharing
4. Use PostgreSQL read replicas

### Vertical Scaling

1. Increase server resources (CPU, RAM)
2. Optimize PM2 cluster instances
3. Tune PostgreSQL configuration
4. Increase Redis memory limit
