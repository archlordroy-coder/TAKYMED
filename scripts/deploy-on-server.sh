#!/bin/bash
# ==========================================
# TAKYMED BACKEND - DEPLOYMENT SCRIPT
# À exécuter sur le serveur 82.165.150.150
# ==========================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-dev.takymed.com}"
EMAIL="${2:-admin@takymed.com}"
BACKEND_DIR="/root/TAKYMED/backend"
PORT="3500"
APP_NAME="takymed-backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TAKYMED BACKEND DEPLOYMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Domaine API: ${GREEN}$DOMAIN${NC}"
echo -e "Email: ${GREEN}$EMAIL${NC}"
echo -e "Port: ${GREEN}$PORT${NC}"
echo ""

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Erreur: Exécutez ce script en root${NC}"
    exit 1
fi

# Vérifier si le projet existe
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Erreur: $BACKEND_DIR n'existe pas${NC}"
    echo "Copiez d'abord le projet avec: scp -r TAKYMED root@82.165.150.150:/root/"
    exit 1
fi

cd "$BACKEND_DIR"

echo -e "${YELLOW}📦 Étape 1: Installation des dépendances...${NC}"
cd ..
npm install --legacy-peer-deps 2>&1 | tail -5
cd backend
npm install --legacy-peer-deps 2>&1 | tail -5
echo -e "${GREEN}✅ Dépendances installées${NC}"

echo ""
echo -e "${YELLOW}🔧 Étape 2: Compilation du backend...${NC}"
npm run build 2>&1 | tail -5
echo -e "${GREEN}✅ Backend compilé${NC}"

echo ""
echo -e "${YELLOW}📝 Étape 3: Vérification du fichier .env...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << EOF
NODE_ENV=production
PORT=3500
CORS_ORIGIN=https://takymed.com
SESSION_SECRET=$(openssl rand -hex 32)
WHATSAPP_ENABLED=true
EOF
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
else
    # Mise à jour des valeurs critiques
    sed -i "s/PORT=.*/PORT=3500/" .env
    sed -i "s/CORS_ORIGIN=.*/CORS_ORIGIN=https:\/\/takymed.com/" .env
    echo -e "${GREEN}✅ Fichier .env mis à jour (port 3500, CORS takymed.com)${NC}"
fi

echo ""
echo -e "${YELLOW}🚀 Étape 4: Configuration PM2...${NC}"
if [ -f "../ecosystem.config.cjs" ]; then
    cd ..
    pm2 delete $APP_NAME 2>/dev/null || true
    pm2 start ecosystem.config.cjs
    pm2 save
    echo -e "${GREEN}✅ PM2 configuré${NC}"
else
    echo -e "${YELLOW}⚠️ ecosystem.config.cjs non trouvé, configuration manuelle...${NC}"
    cd "$BACKEND_DIR"
    pm2 delete $APP_NAME 2>/dev/null || true
    pm2 start dist/node-build.mjs --name $APP_NAME --env production --log /var/log/takymed.log
    pm2 save
fi

echo ""
echo -e "${YELLOW}🔒 Étape 5: Configuration Nginx...${NC}"

# Installer Nginx si nécessaire
if ! command -v nginx &> /dev/null; then
    apt-get update
    apt-get install -y nginx
fi

# Config Nginx pour l'API
cat > /etc/nginx/sites-available/takymed-api << 'EOF'
server {
    listen 80;
    server_name dev.takymed.com;
    
    location / {
        proxy_pass http://127.0.0.1:3500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://takymed.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
EOF

ln -sf /etc/nginx/sites-available/takymed-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t && systemctl restart nginx
echo -e "${GREEN}✅ Nginx configuré${NC}"

echo ""
echo -e "${YELLOW}🔐 Étape 6: Installation SSL (Let's Encrypt)...${NC}"
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi

# Test if domain points to this server
echo -e "${YELLOW}Test DNS pour $DOMAIN...${NC}"
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null || nslookup $DOMAIN 2>/dev/null | grep -A1 "Name:" | grep "Address:" | head -1 | awk '{print $2}')

if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
    echo -e "${GREEN}✅ DNS correct: $DOMAIN -> $SERVER_IP${NC}"
    certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect
    echo -e "${GREEN}✅ SSL installé${NC}"
else
    echo -e "${YELLOW}⚠️ Le domaine $DOMAIN ne pointe pas vers ce serveur ($SERVER_IP)${NC}"
    echo -e "${YELLOW}   Configure le DNS d'abord, puis relance: certbot --nginx -d $DOMAIN${NC}"
fi

echo ""
echo -e "${YELLOW}✅ Étape 7: Vérification...${NC}"
sleep 2

# Test backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/api 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" != "000" ]; then
    echo -e "${GREEN}✅ Backend répond sur port $PORT (HTTP $BACKEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Backend ne répond pas sur port $PORT${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 DÉPLOIEMENT TERMINÉ !${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Backend: ${GREEN}http://$SERVER_IP:$PORT${NC}"
echo -e "API URL: ${GREEN}https://$DOMAIN${NC} (si SSL configuré)"
echo ""
echo -e "Commandes utiles:"
echo "  pm2 status                    # Voir les processus"
echo "  pm2 logs $APP_NAME            # Voir les logs"
echo "  pm2 restart $APP_NAME         # Redémarrer"
echo "  pm2 stop $APP_NAME            # Arrêter"
echo "  tail -f /var/log/nginx/error.log  # Logs Nginx"
echo ""
