#!/bin/bash

# Backend Deployment Script
# Deploys the backend to the production/staging server

set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | sed 's/\r$//' | xargs)
fi

# Configuration
REMOTE_USER=${SERVER_USER:-"root"}
REMOTE_HOST=${SERVER_IP:-"localhost"}
DEST_DIR=${DEST_DIR:-"/home/TAKYMED"}
BACKEND_DIR="$DEST_DIR/backend"
SOURCE_DIR="$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
PASS=${SERVER_PASS:-""}

# SSH configuration
CONTROL_SOCKET="/tmp/ssh-takymed-$USER"
SSH_OPT="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ControlMaster=auto -o ControlPath=$CONTROL_SOCKET -o ControlPersist=60"

# Setup SSH command
if [ -n "$PASS" ]; then
    export SSHPASS="$PASS"
    SSH_CMD="sshpass -e ssh $SSH_OPT"
    RSYNC_SSH="sshpass -e ssh $SSH_OPT"
else
    SSH_CMD="ssh $SSH_OPT"
    RSYNC_SSH="ssh $SSH_OPT"
fi

echo "🚀 TAKYMED Backend Deployment"
echo "=============================="
echo "Server: $REMOTE_USER@$REMOTE_HOST"
echo "Backend Directory: $BACKEND_DIR"
echo ""

# Check if backend build exists
if [ ! -f "$SOURCE_DIR/backend/dist/node-build.mjs" ]; then
    echo "❌ Backend build not found! Running build..."
    cd "$SOURCE_DIR/backend"
    npm run build
    cd - > /dev/null
fi

echo "📦 Preparing deployment package..."
echo ""

# Create a staging area
STAGING_DIR="/tmp/takymed-backend-deploy"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# Copy backend files
cp -r "$SOURCE_DIR/backend/dist" "$STAGING_DIR/"
cp -r "$SOURCE_DIR/backend/data" "$STAGING_DIR/" 2>/dev/null || true
cp -r "$SOURCE_DIR/backend/public" "$STAGING_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR/backend/package.json" "$STAGING_DIR/"
cp "$SOURCE_DIR/backend/package-lock.json" "$STAGING_DIR/" 2>/dev/null || true

echo "✓ Backend files prepared"
echo ""

# Deploy via rsync
echo "📤 Uploading to server..."

# Create destination if it doesn't exist
$SSH_CMD "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $BACKEND_DIR"

# Rsync backend files
rsync -av \
    -e "$RSYNC_SSH" \
    --delete \
    "$STAGING_DIR/" \
    "$REMOTE_USER@$REMOTE_HOST:$BACKEND_DIR/" \
    --exclude=node_modules \
    --exclude='.env.example'

echo ""
echo "✓ Files uploaded successfully"
echo ""

# Install dependencies on remote server
echo "📥 Installing dependencies on server..."
$SSH_CMD "$REMOTE_USER@$REMOTE_HOST" "cd $BACKEND_DIR && npm install --production"

echo ""
echo "✓ Dependencies installed"
echo ""

# Stop old process if running
echo "🛑 Stopping old backend process..."
$SSH_CMD "$REMOTE_USER@$REMOTE_HOST" "cd $BACKEND_DIR && npm stop || true"

sleep 1

# Start backend
echo "▶️  Starting backend..."
$SSH_CMD "$REMOTE_USER@$REMOTE_HOST" "cd $BACKEND_DIR && npm run start &"

sleep 2

# Check if backend is running
echo ""
echo "✅ Checking backend status..."
if $SSH_CMD "$REMOTE_USER@$REMOTE_HOST" "curl -s http://localhost:3001/api | grep -q 'TAKYMED API'"; then
    echo "✅ Backend is running successfully!"
    echo ""
    echo "📊 Summary:"
    echo "   Backend: http://$REMOTE_HOST:3001"
    echo "   Status: ✓ Running"
else
    echo "⚠️  Backend might not be responding yet (check logs)"
    echo ""
    echo "📝 View logs:"
    echo "   ssh $REMOTE_USER@$REMOTE_HOST"
    echo "   cd $BACKEND_DIR"
    echo "   tail -f server_logs.txt"
fi

# Cleanup
rm -rf "$STAGING_DIR"

echo ""
echo "✨ Deployment complete!"
