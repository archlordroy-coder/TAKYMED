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

echo "⬆️ Pushing updates to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR (preserving DB, .env, and uploads)..."

# 1. Sync code (excluding node_modules, dist, git, AND the database, env, and uploads)
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
    --exclude '.env' \
    --exclude 'public/uploads/*'

# 2. Rebuild on Remote
echo "🛠️ Rebuilding application on remote..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && npm install && npm run build"

# 3. Restart the application
echo "🔄 Restarting application..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && pkill -f 'node dist/server/production.mjs' || true && nohup npm start > app.log 2>&1 &"

echo "✅ Push complete. Application is restarting on http://$REMOTE_HOST:$PORT"
