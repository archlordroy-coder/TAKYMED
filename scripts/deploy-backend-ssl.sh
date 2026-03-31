#!/bin/bash
# =============================================================================
# TAKYMED Backend Deployment Script with Auto HTTPS
# =============================================================================
# Ce script configure automatiquement:
# - Nginx reverse proxy avec HTTPS (Let's Encrypt)
# - PM2 pour le backend Node.js
# - Certificats SSL auto-renouvelables
# - Firewall (UFW)
# =============================================================================

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-dev.takymed.com}"
EMAIL="${2:-admin@takymed.com}"
BACKEND_PORT=3500
PROJECT_DIR="/root/TAKYMED"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_DIR="$BACKEND_DIR/logs"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Vérifications préliminaires
# =============================================================================
log_info "Vérification des prérequis..."

if [[ $EUID -ne 0 ]]; then
   log_error "Ce script doit être exécuté en root (sudo)"
   exit 1
fi

# Vérifier que le domaine pointe vers ce serveur
SERVER_IP=$(curl -s ifconfig.me)
log_info "IP du serveur: $SERVER_IP"
log_info "Domaine configuré: $DOMAIN"
log_warning "Assurez-vous que $DOMAIN pointe vers $SERVER_IP dans votre DNS"
read -p "Appuyez sur Entrée quand le DNS est configuré..."

# =============================================================================
# Installation des dépendances
# =============================================================================
log_info "Installation des paquets nécessaires..."

apt-get update
apt-get install -y nginx certbot python3-certbot-nginx ufw curl git

# Installation de Node.js si pas présent
if ! command -v node &> /dev/null; then
    log_info "Installation de Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Installation de PM2 globalement
if ! command -v pm2 &> /dev/null; then
    log_info "Installation de PM2..."
    npm install -g pm2
fi

log_success "Dépendances installées"

# =============================================================================
# Configuration du Firewall
# =============================================================================
log_info "Configuration du firewall UFW..."

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow $BACKEND_PORT/tcp

# Activer UFW si pas déjà actif
if ! ufw status | grep -q "Status: active"; then
    echo "y" | ufw enable
fi

log_success "Firewall configuré"

# =============================================================================
# Configuration Nginx (HTTP d'abord pour validation Let's Encrypt)
# =============================================================================
log_info "Configuration Nginx (phase 1: HTTP)..."

cat > /etc/nginx/sites-available/takymed-api << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://localhost:PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Augmenter les limites pour les uploads
    client_max_body_size 50M;
}
EOF

# Remplacer les placeholders
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/takymed-api
sed -i "s/PORT_PLACEHOLDER/$BACKEND_PORT/g" /etc/nginx/sites-available/takymed-api

# Activer le site
ln -sf /etc/nginx/sites-available/takymed-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test de configuration nginx
nginx -t

# Redémarrer Nginx
systemctl restart nginx
systemctl enable nginx

log_success "Nginx configuré (HTTP)"

# =============================================================================
# Génération des certificats SSL (Let's Encrypt)
# =============================================================================
log_info "Génération des certificats SSL avec Let's Encrypt..."

# Stopper temporairement Nginx pour le challenge HTTP
certbot certonly --standalone --non-interactive --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    --preferred-challenges http

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    log_error "Échec de la génération du certificat SSL"
    exit 1
fi

log_success "Certificats SSL générés"

# =============================================================================
# Configuration Nginx avec HTTPS
# =============================================================================
log_info "Configuration Nginx avec HTTPS..."

cat > /etc/nginx/sites-available/takymed-api << EOF
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Configuration SSL optimisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS (décommenter après tests)
    # add_header Strict-Transport-Security "max-age=63072000" always;

    # Headers de sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS headers pour le frontend takymed.com
    add_header 'Access-Control-Allow-Origin' 'https://takymed.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, x-user-id' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # Gérer les requêtes OPTIONS (preflight)
    location / {
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://takymed.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, x-user-id' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Content-Length' 0;
            return 204;
        }

        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    client_max_body_size 50M;
}

# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}
EOF

nginx -t
systemctl reload nginx

log_success "Nginx configuré avec HTTPS"

# =============================================================================
# Auto-renouvellement SSL
# =============================================================================
log_info "Configuration du renouvellement automatique SSL..."

# Créer un script de renouvellement
cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
# Renouvellement SSL avec reload Nginx
certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOF
chmod +x /usr/local/bin/renew-ssl.sh

# Cron job pour le renouvellement (tous les jours à 3h du matin)
echo "0 3 * * * root /usr/local/bin/renew-ssl.sh >> /var/log/letsencrypt-renewal.log 2>&1" > /etc/cron.d/letsencrypt-renewal
chmod 644 /etc/cron.d/letsencrypt-renewal

log_success "Renouvellement SSL automatique configuré"

# =============================================================================
# Déploiement du Backend avec PM2
# =============================================================================
log_info "Déploiement du backend avec PM2..."

cd "$BACKEND_DIR"

# Créer le dossier logs
mkdir -p "$LOG_DIR"

# Vérifier que le build existe
if [ ! -f "$BACKEND_DIR/dist/node-build.mjs" ]; then
    log_info "Build du backend en cours..."
    npm install
    npm run build
fi

# Démarrer/Redémarrer avec PM2
cd "$BACKEND_DIR"
pm2 stop takymed-backend 2>/dev/null || true
pm2 delete takymed-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs

# Sauvegarder la config PM2
pm2 save
pm2 startup systemd -u root --hp /root

log_success "Backend déployé avec PM2"

# =============================================================================
# Vérifications finales
# =============================================================================
log_info "Vérifications finales..."

echo ""
echo "=========================================="
echo "  STATUS DES SERVICES"
echo "=========================================="
echo ""

# Vérifier Nginx
if systemctl is-active --quiet nginx; then
    log_success "Nginx: ACTIF ✓"
else
    log_error "Nginx: INACTIF ✗"
fi

# Vérifier PM2
if pm2 describe takymed-backend | grep -q "online"; then
    log_success "Backend PM2: EN LIGNE ✓"
else
    log_error "Backend PM2: HORS LIGNE ✗"
fi

# Vérifier SSL
echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null && \
    log_success "SSL: CERTIFICAT VALIDE ✓" || \
    log_error "SSL: PROBLÈME DE CERTIFICAT ✗"

echo ""
echo "=========================================="
echo "  INFORMATIONS DE CONNEXION"
echo "=========================================="
echo ""
echo -e "${GREEN}URL API Backend:${NC} https://$DOMAIN"
echo -e "${GREEN}Frontend:${NC} https://takymed.com"
echo -e "${GREEN}IP Serveur:${NC} $SERVER_IP"
echo ""
echo -e "${YELLOW}Commandes utiles:${NC}"
echo "  pm2 status              - Voir le status du backend"
echo "  pm2 logs takymed-backend - Voir les logs en temps réel"
echo "  tail -f $LOG_DIR/error.log - Voir les erreurs"
echo "  certbot certificates    - Voir les certificats SSL"
echo ""
echo -e "${GREEN}✓ Déploiement terminé avec succès!${NC}"
echo ""

# Afficher les logs PM2
pm2 status
