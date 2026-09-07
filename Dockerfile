# =========================================================
# Divide & Rule — Production Multi-Stage Dockerfile
# Base Image: Alpine Linux with Node.js 22 LTS (Ultra-lightweight ~150MB)
# =========================================================

FROM node:22-alpine AS runner

# 1. Set working directory
WORKDIR /app

# 2. Set production environment
ENV NODE_ENV=production
ENV PORT=5001

# 3. Install dependencies first (leverages Docker layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# 4. Copy backend source code, web preview, and static assets
COPY server/ ./server/
COPY preview/ ./preview/
COPY src/ ./src/

# 5. Security Best Practice: Use unprivileged built-in 'node' user instead of root
RUN chown -R node:node /app
USER node

# 6. Expose the server port
EXPOSE 5001

# 7. Start the unified Express application (serves API & Web Client)
CMD ["node", "server/server.js"]
