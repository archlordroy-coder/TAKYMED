#!/bin/bash

# Configuration
DEST_DIR="/home/TAKYMED"
SOURCE_DIR="$(pwd)"

echo "🚀 Starting deployment to $DEST_DIR..."

# 1. Create destination directory if it doesn't exist
if [ ! -d "$DEST_DIR" ]; then
    echo "📁 Creating directory $DEST_DIR..."
    sudo mkdir -p "$DEST_DIR"
    sudo chown $USER:$USER "$DEST_DIR"
fi

# 2. Sync code (excluding node_modules, dist, git)
echo "📦 Syncing files..."
rsync -av --progress "$SOURCE_DIR/" "$DEST_DIR/" \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '.vscode' \
    --exclude '.gemini' \
    --exclude 'bd.sqlite'

# 3. Navigate to destination
cd "$DEST_DIR" || exit

# 4. Install dependencies
echo "🔍 Installing dependencies..."
npm install

# 5. Build the application
echo "🛠️ Building application..."
npm run build

# 6. Start the application
# Note: Using 'npm start' as requested. 
# For production, consider using a process manager like pm2 later.
echo "🟢 Starting application..."
npm start
