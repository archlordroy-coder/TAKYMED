#!/bin/bash

# Configuration
DEST_DIR="/home/TAKYMED"
SOURCE_DIR="$(pwd)"

echo "⬆️ Pushing updates to $DEST_DIR (preserving DB and .env)..."

# 1. Sync code (excluding node_modules, dist, git, AND the database/env)
echo "📦 Syncing files..."
rsync -av --progress "$SOURCE_DIR/" "$DEST_DIR/" \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '.vscode' \
    --exclude '.gemini' \
    --exclude 'bd.sqlite' \
    --exclude '.env'

# 2. Navigate to destination
cd "$DEST_DIR" || exit

# 3. Install dependencies
echo "🔍 Checking dependencies..."
npm install

# 4. Build the application
echo "🛠️ Rebuilding application..."
npm run build

# 5. Restart the application
# Note: For simple restart we kill and start, 
# but process managers are better for production.
echo "🔄 Restarting application..."
pkill -f "node dist/server/node-build.mjs" || true
nohup npm start > app.log 2>&1 &
echo "✅ Push complete. Application is restarting in the background."
