#!/bin/bash

# Configuration (Loads from .env)
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Fallback values if not in .env
REMOTE_USER=${SERVER_USER:-"root"}
REMOTE_HOST=${SERVER_IP:-"localhost"}
REMOTE_DIR=${DEST_DIR:-"/home/TAKYMED"}
SOURCE_DIR="$(pwd)"

echo "🚀 Initializing deployment to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR..."

# 1. Create destination directory
echo "📁 Preparing remote directory..."
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR && chown $USER:$USER $REMOTE_DIR"

# 2. Sync code (excluding node_modules, dist, git, and local data)
echo "📦 Syncing files..."
rsync -av --progress "$SOURCE_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '.vscode' \
    --exclude '.gemini' \
    --exclude 'bd.sqlite' \
    --exclude 'bd.sqlite-shm' \
    --exclude 'bd.sqlite-wal' \
    --exclude 'public/uploads/*'

# 3. Run Build on Remote
echo "🛠️  Building application on remote..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && npm install && npm run build"

# 4. Start the application
echo "🟢 Starting application..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && pkill -f 'node dist/server/production.mjs' || true && nohup npm start > app.log 2>&1 &"

echo "✅ Deployment complete. Application is running on http://$REMOTE_HOST:$PORT"
