#!/bin/bash
# ==========================================
# TAKYMED BACKEND DEPLOYMENT
# Exécuté depuis l'environnement local vers le serveur 82.165.150.150
# ==========================================

set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | sed 's/\r$//' | xargs)
fi

# Configuration
REMOTE_USER=${SERVER_USER:-"root"}
REMOTE_HOST=${SERVER_IP:-"82.165.150.150"}
DEST_DIR=${DEST_DIR:-"/root/TAKYMED"}
BACKEND_DIR="$DEST_DIR/backend"
SOURCE_DIR="$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
PASS=${SERVER_PASS:-""}
PORT="3500"
APP_NAME="takymed-backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TAKYMED BACKEND DEPLOYMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Server: ${GREEN}$REMOTE_USER@$REMOTE_HOST${NC}"
echo -e "Backend Dir: ${GREEN}$BACKEND_DIR${NC}"
echo -e "Port: ${GREEN}$PORT${NC}"
echo ""

# SSH configuration with sshpass
CONTROL_SOCKET="/tmp/ssh-takymed-deploy-$USER"
SSH_OPT="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ControlMaster=auto -o ControlPath=$CONTROL_SOCKET -o ControlPersist=60"

if [ -n "$PASS" ]; then
    export SSHPASS="$PASS"
    SSH_CMD="sshpass -e ssh $SSH_OPT"
    RSYNC_SSH="sshpass -e ssh $SSH_OPT"
else
    echo -e "${RED}❌ No password found in .env (SERVER_PASS)${NC}"
    exit 1
fi

# Test SSH connection first
echo -e "${YELLOW}🔌 Testing SSH connection...${NC}"
if ! $SSH_CMD -o ConnectTimeout=10 $REMOTE_USER@$REMOTE_HOST "echo 'SSH OK'" 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to server. Check credentials.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection OK${NC}"

# Cleanup function
cleanup() {
    ssh -o ControlPath=$CONTROL_SOCKET -O exit $REMOTE_USER@$REMOTE_HOST 2>/dev/null || true
    rm -f "$CONTROL_SOCKET"
}
trap cleanup EXIT

# 1. Create staging area
echo ""
echo -e "${YELLOW}📦 Preparing deployment package...${NC}"
STAGING_DIR="/tmp/takymed-backend-deploy"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# Copy backend files
cp -r "$SOURCE_DIR/backend/dist" "$STAGING_DIR/"
cp -r "$SOURCE_DIR/backend/data" "$STAGING_DIR/" 2>/dev/null || true
mkdir -p "$STAGING_DIR/public/uploads"
cp "$SOURCE_DIR/backend/package.json" "$STAGING_DIR/"
cp "$SOURCE_DIR/backend/package-lock.json" "$STAGING_DIR/" 2>/dev/null || true

# Copy ecosystem.config.cjs if exists
if [ -f "$SOURCE_DIR/ecosystem.config.cjs" ]; then
    cp "$SOURCE_DIR/ecosystem.config.cjs" "$STAGING_DIR/"
fi

echo -e "${GREEN}✅ Package prepared${NC}"

# 2. Deploy via rsync
echo ""
echo -e "${YELLOW}📤 Uploading to server...${NC}"
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "mkdir -p $BACKEND_DIR/public/uploads"

rsync -avz \
    -e "$RSYNC_SSH" \
    --delete \
    "$STAGING_DIR/" \
    "$REMOTE_USER@$REMOTE_HOST:$BACKEND_DIR/" \
    --exclude=node_modules \
    --exclude='.env.example'

echo -e "${GREEN}✅ Upload complete${NC}"

# 3. Configure .env on server
echo ""
echo -e "${YELLOW}🔧 Configuring .env on server...${NC}"
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "cd $BACKEND_DIR && \
    if [ ! -f .env ]; then
        echo -e \"NODE_ENV=production\nPORT=3500\nCORS_ORIGIN=https://takymed.com\nSESSION_SECRET=\\$(openssl rand -hex 32)\nWHATSAPP_ENABLED=true\" > .env
        echo '.env created'
    else
        sed -i 's/PORT=.*/PORT=3500/' .env
        sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://takymed.com|' .env
        echo '.env updated (port 3500, cors takymed.com)'
    fi"

echo -e "${GREEN}✅ .env configured${NC}"

# 4. Install dependencies and start
echo ""
echo -e "${YELLOW}📥 Installing dependencies and starting...${NC}"
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "cd $BACKEND_DIR && \
    # Update Node.js if needed
    NODE_VER=\$(node -v | cut -d. -f1 | sed 's/v//') && \
    if [ \"\$NODE_VER\" -lt 20 ]; then
        echo 'Updating Node.js to 22...'
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y nodejs
    fi && \
    # Install PM2 if needed
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi && \
    # Install dependencies
    npm install --production && \
    # Stop old process
    pm2 delete $APP_NAME 2>/dev/null || true && \
    # Start with PM2
    pm2 start dist/node-build.mjs --name $APP_NAME --env production && \
    pm2 save"

echo -e "${GREEN}✅ Backend started with PM2${NC}"

# 5. Configure Nginx
echo ""
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "
    # Install nginx if needed
    if ! command -v nginx &> /dev/null; then
        apt-get update && apt-get install -y nginx
    fi
    
    # Create nginx config
    cat > /etc/nginx/sites-available/takymed-api << 'NGINXCFG'
server {
    listen 80;
    server_name dev.takymed.com;
    
    location / {
        proxy_pass http://127.0.0.1:3500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        add_header 'Access-Control-Allow-Origin' 'https://takymed.com' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
}
NGINXCFG
    
    # Enable site
    ln -sf /etc/nginx/sites-available/takymed-api /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # Test and reload
    nginx -t && systemctl restart nginx
"

echo -e "${GREEN}✅ Nginx configured${NC}"

# 6. Health check
echo ""
echo -e "${YELLOW}🏥 Health check...${NC}"
sleep 3

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$REMOTE_HOST:$PORT/api 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" != "000" ] && [ "$HEALTH_STATUS" != "" ]; then
    echo -e "${GREEN}✅ Backend responding (HTTP $HEALTH_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️ Backend not responding yet (checking logs...)${NC}"
    $SSH_CMD $REMOTE_USER@$REMOTE_HOST "pm2 logs $APP_NAME --lines 5" 2>/dev/null || true
fi

# Cleanup
rm -rf "$STAGING_DIR"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Backend URL: ${GREEN}http://$REMOTE_HOST:$PORT${NC}"
echo -e "API Domain:  ${GREEN}https://dev.takymed.com${NC} (configure DNS)"
echo ""
echo -e "Commands:"
echo "  PM2:     pm2 status | pm2 logs $APP_NAME"
echo "  Nginx:   systemctl status nginx"
echo ""
