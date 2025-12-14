# Three-Body Entropy RNG API Server
# Multi-stage build for optimized production image

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy server source
COPY server/ ./

# Production stage
FROM node:20-alpine

# Add labels
LABEL maintainer="Three-Body Entropy RNG Team"
LABEL version="1.0.0"
LABEL description="Provably fair RNG API using three-body gravitational dynamics"

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --production && \
    npm cache clean --force

# Copy server source from builder
COPY --from=builder /app/ ./

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["node", "index.js"]
