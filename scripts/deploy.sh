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
PASS=${SERVER_PASS:-""}

# SSH Control socket for persistent connection
CONTROL_SOCKET="/tmp/ssh-takymed-deploy-$USER"

# SSH/RSYNC configurations with ControlMaster for single auth
SSH_OPT="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ControlMaster=auto -o ControlPath=$CONTROL_SOCKET -o ControlPersist=60"

if [ -n "$PASS" ]; then
    export SSHPASS="$PASS"
    SSH_CMD="sshpass -e ssh $SSH_OPT"
    RSYNC_SSH="sshpass -e ssh $SSH_OPT"
else
    SSH_CMD="ssh $SSH_OPT"
    RSYNC_SSH="ssh $SSH_OPT"
fi

echo "🚀 Initializing deployment to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR..."

# Start SSH control master (single auth for entire session)
echo "� Establishing SSH connection..."
$SSH_CMD -f $REMOTE_USER@$REMOTE_HOST "exit" 2>/dev/null || true

# Cleanup function
cleanup() {
    echo "🧹 Closing SSH connection..."
    ssh -o ControlPath=$CONTROL_SOCKET -O exit $REMOTE_USER@$REMOTE_HOST 2>/dev/null || true
    rm -f "$CONTROL_SOCKET"
}
trap cleanup EXIT

# 1. Clean and Ensure remote directory structure (preserve .env and bd.sqlite)
echo "🛠️ Cleaning and preparing remote directory..."
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "
    # Backup .env if it exists
    if [ -f $REMOTE_DIR/.env ]; then
        cp $REMOTE_DIR/.env /tmp/takymed-env-backup
    fi
    # Backup database if it exists
    if [ -f $REMOTE_DIR/bd.sqlite ]; then
        cp $REMOTE_DIR/bd.sqlite /tmp/takymed-db-backup
    fi
    # Clean directory
    rm -rf $REMOTE_DIR/*
    mkdir -p $REMOTE_DIR/public/uploads
    # Restore .env
    if [ -f /tmp/takymed-env-backup ]; then
        mv /tmp/takymed-env-backup $REMOTE_DIR/.env
    fi
    # Restore database
    if [ -f /tmp/takymed-db-backup ]; then
        mv /tmp/takymed-db-backup $REMOTE_DIR/bd.sqlite
    fi
" || { echo "❌ Failed to prepare remote directory."; exit 1; }

# 2. Sync code (including .env for API keys, without dist, will build on server)
echo "📦 Syncing files (including .env)..."
rsync -avz -e "$RSYNC_SSH" --progress "$SOURCE_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '.vscode' \
    --exclude '.gemini' \
    --exclude 'bd.sqlite*' \
    --exclude 'public/uploads/*' || { echo "❌ File synchronization failed."; exit 1; }

# 2.1 Verify .env was transferred
echo "🔍 Verifying .env file on server..."
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "ls -la $REMOTE_DIR/.env && echo '--- Orange API vars ---' && grep 'ORANGE' $REMOTE_DIR/.env || echo '❌ .env file missing or no ORANGE vars!'"

# 3. Build on Remote
echo "🛠️ Building on remote server..."
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    NODE_VER=\$(node -v | cut -d. -f1 | sed 's/v//') && \
    if [ \"\$NODE_VER\" -lt 20 ]; then \
        echo \"⚠️ Node.js version too old (\$NODE_VER). Updating to Node 22...\" && \
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs; \
    fi && \
    if ! command -v pm2 &> /dev/null; then \
        echo \"📦 Installing PM2 globally...\" && \
        npm install -g pm2; \
    fi && \
    npm install && npm run build" || { echo "❌ Remote build failed."; exit 1; }

# 4. Start the application with PM2
echo "🟢 Starting application with PM2 (Production Mode)..."
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && \
    pm2 delete takymed || true && \
    PORT=$PORT pm2 start dist/server/node-build.mjs --name takymed && \
    pm2 save" || { echo "❌ Failed to start application with PM2."; exit 1; }

# 5. Health Check
echo "🔍 Performing health check..."
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_PASSED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "Wait for server to start... (Attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 5
    RESPONSE=$(curl -s http://$REMOTE_HOST:$PORT/api/ping || echo "")
    if [[ "$RESPONSE" == *"message"* ]]; then
        echo "✅ Health check passed! Application is responding with data."
        HEALTH_PASSED=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ "$HEALTH_PASSED" = false ]; then
    echo "⚠️  Health check failed after $MAX_RETRIES attempts."
    exit 1
fi

echo "🚀 Deployment complete. Application is running on http://${DOMAIN:-$REMOTE_HOST}:$PORT"
