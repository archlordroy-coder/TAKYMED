#!/bin/bash

# Configuration (Loads from .env)
if [ -f .env ]; then
    # Load .env variables without leaking everything to xargs
    export $(grep -v '^#' .env | sed 's/\r$//' | xargs)
fi

# Fallback values if not in .env
REMOTE_USER=${SERVER_USER:-"root"}
REMOTE_HOST=${SERVER_IP:-"localhost"}
REMOTE_DIR=${DEST_DIR:-"/home/TAKYMED"}
SOURCE_DIR="$(pwd)"
PORT=${PORT:-3500}

# SSH/RSYNC configurations
SSH_OPT="-o StrictHostKeyChecking=no"
SSH_CMD="ssh $SSH_OPT"

echo " Pushing updates to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR (preserving DB, .env, and uploads)..."

# 1. Ensure remote directory structure
echo " Preparing remote directory..."
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR/public/uploads && chown -R $REMOTE_USER:$REMOTE_USER $REMOTE_DIR" || { echo " Failed to prepare remote directory."; exit 1; }

# 2. Sync code (excluding node_modules, dist, git, AND the database, env, and uploads)
echo " Syncing files..."
rsync -av -e "ssh $SSH_OPT" --progress "$SOURCE_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '.vscode' \
    --exclude '.gemini' \
    --exclude 'bd.sqlite' \
    --exclude 'bd.sqlite-shm' \
    --exclude 'bd.sqlite-wal' \
    --exclude '.env' \
    --exclude 'public/uploads/*' || { echo " File synchronization failed."; exit 1; }

# 3. Rebuild on Remote (with Node.js version check and PM2)
echo " Checking Node.js version and rebuilding on remote..."
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    NODE_VER=\$(node -v | cut -d. -f1 | sed 's/v//') && \
    if [ \"\$NODE_VER\" -lt 20 ]; then \
        echo \" Node.js version too old (\$NODE_VER). Updating to Node 22...\" && \
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs; \
    fi && \
    if ! command -v pm2 &> /dev/null; then \
        echo \" Installing PM2 globally...\" && \
        npm install -g pm2; \
    fi && \
    npm install && npm run build" || { echo " Remote update/build failed."; exit 1; }

# 4. Restart the application with PM2
echo " Restarting application with PM2..."
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    pm2 reload takymed || (PORT=3500 pm2 start dist/server/node-build.mjs --name takymed) && \
    pm2 save" || { echo " Failed to restart application with PM2."; exit 1; }

# 5. Health Check
echo " Performing health check..."
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_PASSED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "Wait for server to start... (Attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 5
    RESPONSE=$(curl -s http://$REMOTE_HOST:$PORT/api/ping || echo "")
    if [[ "$RESPONSE" == *"message"* ]]; then
        echo " Health check passed! Application is responding with data."
        HEALTH_PASSED=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ "$HEALTH_PASSED" = false ]; then
    echo "  Health check failed after $MAX_RETRIES attempts."
    echo "Please check remote logs with: ssh $REMOTE_USER@$REMOTE_HOST 'tail -n 50 $REMOTE_DIR/app.log'"
    exit 1
fi

echo " Push complete. Application is restarting on http://${DOMAIN:-$REMOTE_HOST}:$PORT"
