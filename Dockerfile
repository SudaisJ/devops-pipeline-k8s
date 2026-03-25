# ─── Stage 1: dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first — Docker layer cache: npm install only
# re-runs when package.json changes, not when src/ changes
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: test runner (used by CI, not shipped to prod) ───────────────────
FROM node:20-alpine AS test

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test

# ─── Stage 3: production image ────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from deps stage (keeps image small)
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Kubernetes will use /health for liveness + readiness probes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
