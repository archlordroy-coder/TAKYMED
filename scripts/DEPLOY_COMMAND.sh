#!/bin/bash
# Commande à exécuter sur le serveur 82.165.150.150 pour déployer automatiquement

# Option 1: Copier le projet puis exécuter le script
echo "=== COMMANDES À EXÉCUTER SUR TON SERVEUR ==="
echo ""
echo "1. Se connecter au serveur:"
echo "   ssh root@82.165.150.150"
echo ""
echo "2. Copier le projet (depuis ton PC local):"
echo "   scp -r /home/ravel/Documents/TAKYMED root@82.165.150.150:/root/"
echo ""
echo "3. Sur le serveur, exécuter:"
echo "   cd /root/TAKYMED && bash scripts/deploy-on-server.sh api.takymed.com ton-email@domain.com"
echo ""
echo "=== OU COMMANDE UNIQUE (à coller sur le serveur) ==="
echo ""

# Créer une version inline du script
cat > /tmp/inline-deploy.sh << 'INLINEEOF'
#!/bin/bash
set -e; RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m';
DOMAIN="${1:-api.takymed.com}"; EMAIL="${2:-admin@takymed.com}"; PORT="3001"; APP_NAME="takymed-backend";
echo -e "${BLUE}=== TAKYMED DEPLOYMENT ===${NC}"; echo "Domain: $DOMAIN | Port: $PORT";
if [ "$EUID" -ne 0 ]; then echo -e "${RED}Run as root${NC}"; exit 1; fi
if [ ! -d "/root/TAKYMED/backend" ]; then
  echo -e "${YELLOW}Project not found. Please run first from LOCAL:${NC}"
  echo "scp -r /home/ravel/Documents/TAKYMED root@82.165.150.150:/root/"
  exit 1
fi
cd /root/TAKYMED
echo -e "${YELLOW}[1/6] Installing dependencies...${NC}"
npm install --legacy-peer-deps 2>&1 | tail -3
cd backend && npm install --legacy-peer-deps 2>&1 | tail -3
echo -e "${GREEN}✓ Dependencies${NC}"
echo -e "${YELLOW}[2/6] Building...${NC}"
npm run build 2>&1 | tail -3
echo -e "${GREEN}✓ Built${NC}"
echo -e "${YELLOW}[3/6] Configuring .env...${NC}"
if [ ! -f ".env" ]; then
  echo -e "NODE_ENV=production\nPORT=3001\nCORS_ORIGIN=https://takymed.com\nSESSION_SECRET=$(openssl rand -hex 32)\nWHATSAPP_ENABLED=true" > .env
else
  sed -i "s/PORT=.*/PORT=3001/" .env; sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://takymed.com|" .env
fi
echo -e "${GREEN}✓ .env configured${NC}"
echo -e "${YELLOW}[4/6] Starting with PM2...${NC}"
cd /root/TAKYMED
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.cjs 2>/dev/null || pm2 start backend/dist/node-build.mjs --name $APP_NAME --env production
pm2 save
echo -e "${GREEN}✓ PM2 running${NC}"
echo -e "${YELLOW}[5/6] Configuring Nginx...${NC}"
command -v nginx &>/dev/null || { apt-get update && apt-get install -y nginx; }
cat > /etc/nginx/sites-available/takymed-api << 'NGINX'
server {
    listen 80;
    server_name api.takymed.com;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header 'Access-Control-Allow-Origin' 'https://takymed.com' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/takymed-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl restart nginx
echo -e "${GREEN}✓ Nginx configured${NC}"
echo -e "${YELLOW}[6/6] Installing SSL...${NC}"
command -v certbot &>/dev/null || apt-get install -y certbot python3-certbot-nginx
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short api.takymed.com 2>/dev/null | head -1)
if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
  certbot --nginx -d api.takymed.com --email $EMAIL --agree-tos --non-interactive --redirect 2>/dev/null && echo -e "${GREEN}✓ SSL installed${NC}" || echo -e "${YELLOW}SSL manual config needed${NC}"
else
  echo -e "${YELLOW}DNS not configured. Set api.takymed.com -> $SERVER_IP${NC}"
fi
echo -e "${BLUE}=== DEPLOYMENT COMPLETE ===${NC}"
echo -e "API: ${GREEN}http://$SERVER_IP:3001${NC}"
echo -e "PM2: pm2 status | pm2 logs $APP_NAME"
INLINEEOF

cat /tmp/inline-deploy.sh

echo ""
echo "=== POUR EXÉCUTER ==="
echo "ssh root@82.165.150.150 'bash -s' < /tmp/inline-deploy.sh api.takymed.com ton-email@domain.com"
