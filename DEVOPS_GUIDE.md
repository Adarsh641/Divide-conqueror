# 🚀 The Universal DevOps Blueprint & Playbook
> **A repeatable, production-grade guide for Docker, CI/CD (GitHub Actions), Docker Hub, and Cloud Deployment (Vercel / Containers).**  
> *Use this blueprint as your standard template for every project you build.*

---

## 🗺 The End-to-End Architecture Flow

```
┌─────────────────┐       git push       ┌──────────────────────┐
│  Local Machine  │ ───────────────────▶ │  GitHub Repository   │
└─────────────────┘                      └──────────┬───────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────────┐
                                         │ GitHub Actions CI/CD │
                                         └──────────┬───────────┘
                                                    │
                   ┌────────────────────────────────┴────────────────────────────────┐
                   │                                                                 │
                   ▼                                                                 ▼
        [Job 1: Test & Validate]                                        [Job 2: Build & Push]
   - Spin up ephemeral DB service                                  - Authenticate with Docker Hub
   - Run linter & test suite                                       - Build multi-stage Docker image
   - Fails build if any test breaks                                - Push tags: `:latest`, `:<sha>`
                   │                                                                 │
                   └────────────────────────────────┬────────────────────────────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────────┐
                                         │ Production Deploy    │
                                         │ - 🔺 Vercel (Edge)   │
                                         │ - 🐳 Cloud Container │
                                         └──────────────────────┘
```

---

## 📋 Phase 1: Local Containerization (Docker & Compose)

Before deploying to the cloud, ensure the application runs deterministically in a container.

### 1. The `.dockerignore` File
Prevents local dependencies, temporary logs, and sensitive credentials from leaking into the container image.
```dockerignore
node_modules/
.env
.env.*.local
.git/
.github/
.agents/
.DS_Store
*.log
coverage/
scratch/
```

### 2. The Production `Dockerfile`
A multi-stage, security-hardened Dockerfile using Alpine Linux:
```dockerfile
# 1. Base image: Ultra-lightweight Node.js LTS
FROM node:22-alpine AS runner

# 2. Set working directory
WORKDIR /app

# 3. Define production environment
ENV NODE_ENV=production
ENV PORT=5001

# 4. Layer caching: install dependencies first
COPY package*.json ./
RUN npm ci --omit=dev

# 5. Copy application source
COPY server/ ./server/
COPY preview/ ./preview/
COPY src/ ./src/

# 6. Security: run as unprivileged user 'node' instead of root
USER node

# 7. Expose application port
EXPOSE 5001

# 8. Start server
CMD ["node", "server/server.js"]
```

### 3. The `docker-compose.yml` File
Allows 1-command startup of the application and a local database without cloud dependencies:
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: my-app
    restart: unless-stopped
    ports:
      - "5001:5001"
    environment:
      - PORT=5001
      - NODE_ENV=development
      - MONGO_URI=mongodb://mongo:27017/my_database
      - JWT_SECRET=local_dev_secret_key
    depends_on:
      - mongo
    networks:
      - app-network

  mongo:
    image: mongo:7.0
    container_name: my-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mongo_data:
    driver: local
```

#### Local CLI Commands:
- `docker build -t my-app:latest .` ➔ Build image
- `docker run -p 5001:5001 --env-file .env my-app:latest` ➔ Run single container
- `docker compose up --build` ➔ Run multi-container stack
- `docker compose down -v` ➔ Stop and clean volumes

---

## 🛡 Phase 2: Repository & Secret Hygiene

1. **Rule #1**: Never commit `.env` to Git. Always create a `.env.example` file:
   ```env
   PORT=5001
   NODE_ENV=production
   MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/dbname
   JWT_SECRET=your_32_character_secret_key
   ```
2. **Rule #2**: Add `.env` and `node_modules/` to `.gitignore` before making the initial commit.

---

## ⚡ Phase 3: Continuous Integration (CI) with GitHub Actions

Every commit must be verified automatically. If tests require a database, use GitHub Actions **Service Containers** instead of connecting to a remote cloud DB.

### File: `.github/workflows/ci-cd.yml`
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test-and-validate:
    name: Run Automated Test Suite
    runs-on: ubuntu-latest

    # Ephemeral service container spun up in memory
    services:
      mongo:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: 📥 Check out repository code
        uses: actions/checkout@v4

      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🧪 Run test suite
        run: npm test
        env:
          NODE_ENV: test
          JWT_SECRET: ci_secret_token
          MONGO_URI: mongodb://127.0.0.1:27017/test_db
```

---

## 🐳 Phase 4: Continuous Delivery (CD) to Docker Hub

Automatically build and push Docker images upon merging into `main`.

### 1. Configure GitHub Secrets:
1. Open **[hub.docker.com](https://hub.docker.com)** ➔ Avatar ➔ **Account Settings** ➔ **Security**.
2. Click **New Access Token** ➔ Description: `github-actions` ➔ Access: **Read & Write** ➔ Generate & Copy.
3. Open your GitHub repository ➔ **Settings** ➔ **Secrets and variables** ➔ **Actions**.
4. Add:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username.
   - `DOCKERHUB_TOKEN`: Paste the access token (`dckr_pat_...`).

### 2. Add CD Job to Workflow:
```yaml
  build-and-push-docker:
    name: Build & Push Image to Docker Hub
    needs: test-and-validate
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')

    steps:
      - name: 📥 Check out repository code
        uses: actions/checkout@v4

      - name: 🐳 Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 🔑 Log in to Docker Hub
        if: env.DOCKERHUB_USERNAME != ''
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
        env:
          DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}

      - name: 🚀 Build and Push Image
        if: env.DOCKERHUB_USERNAME != ''
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/my-app:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/my-app:${{ github.sha }}
        env:
          DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
```

---

## 🔺 Phase 5: Cloud Deployment on Vercel

To deploy an Express + Static frontend stack to Vercel:

### 1. Entrypoint: `api/index.js`
Caches the database connection across serverless function invocations:
```javascript
const app = require('../server/app');
const connectDB = require('../server/config/db');

let isConnected = false;
module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app(req, res);
};
```

### 2. Configuration: `vercel.json`
Routes `/api/*` to the serverless handler and all other paths to the static web directory:
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/preview/$1" }
  ]
}
```

### 3. Vercel Dashboard Steps:
1. Log in to [vercel.com](https://vercel.com) ➔ Click **Add New... ➔ Project**.
2. Select your GitHub repository ➔ Click **Import**.
3. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `your_mongodb_atlas_uri`
   - `JWT_SECRET`: `your_jwt_secret`
4. Click **Deploy**.

---

## 🔁 Standard Project Checklist (Every Future Project)

| Order | Action | Command / File |
|:---:|---|---|
| 1 | Create `.dockerignore` | Exclude `node_modules`, `.env`, `.git` |
| 2 | Create `Dockerfile` | Multi-stage, `node:alpine`, non-root user |
| 3 | Create `docker-compose.yml` | App + Database container setup |
| 4 | Create `.gitignore` & `.env.example` | Protect credentials before Git init |
| 5 | Initialize Git & push | `git init`, `git add .`, `git commit`, `git push` |
| 6 | Create `.github/workflows/ci-cd.yml` | Ephemeral test services (`mongo`/`postgres`) |
| 7 | Add GitHub Secrets | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` |
| 8 | Deploy to Vercel / Cloud | Add `vercel.json` and production env variables |
