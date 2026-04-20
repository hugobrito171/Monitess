# ============================
# Stage 1: Install dependencies
# ============================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root package files
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/dash/package.json ./apps/dash/

RUN npm install --workspaces --include-workspace-root

# ============================
# Stage 2: Build frontend
# ============================
FROM node:20-alpine AS dash-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dash/node_modules ./apps/dash/node_modules
COPY apps/dash ./apps/dash
COPY apps/api/package.json ./apps/api/package.json
COPY package.json ./

WORKDIR /app/apps/dash
RUN npm run build

# ============================
# Stage 3: Build backend
# ============================
FROM node:20-alpine AS api-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY package.json ./

WORKDIR /app/apps/api
RUN npm run build 2>/dev/null || true

# ============================
# Stage 4: Production runtime
# ============================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Install lm-sensors for temperature (Linux)
RUN apk add --no-cache lm-sensors lm-sensors-detect

# Copy built API
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api/package.json ./apps/api/package.json

# Copy built frontend into API's public dir
COPY --from=dash-builder /app/dist/public ./dist/public

# Copy root package
COPY package.json ./

# Non-root user for security
RUN addgroup -g 1001 -S monitess && adduser -S monitess -u 1001
# But keep root for sysinformation access in privileged mode
# USER monitess

EXPOSE 3001

WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
