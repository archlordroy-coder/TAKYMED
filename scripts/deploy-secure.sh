#!/bin/bash
# =============================================================================
# TAKYMED Backend Deploy - Solution Durable avec HTTPS
# Compatible avec serveur existant (PM2 + Nginx)
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
DOMAIN="${1:-dev.takymed.com}"
EMAIL="${2:-admin@takymed.com}"
BACKEND_PORT=3500
BACKEND_DIR="/root/TAKYMED/backend"

check_existing_services() {
    log_info "Analyse du serveur existant..."
    
    # Vérifier PM2 existant
    if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q "online"; then
        log_warning "PM2 actif détecté - conflit potentiel"
        echo "Processus PM2 existants :"
        pm2 list | grep "online" || true
        read -p "Continuer quand même? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
    fi
    
    # Vérifier Nginx existant
    if systemctl is-active --quiet nginx 2>/dev/null; then
        log_warning "Nginx déjà actif"
        echo "Sites configurés :"
        ls /etc/nginx/sites-enabled/ 2>/dev/null || echo "Aucun"
    fi
    
    # Vérifier ports utilisés
    for port in 80 443 $BACKEND_PORT; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port " || \
           ss -tlnp 2>/dev/null | grep -q ":$port "; then
            log_warning "Port $port déjà utilisé"
        fi
    done
}

install_dependencies() {
    log_info "Installation des dépendances..."
    
    apt-get update -qq
    
    # Nginx si pas présent
    if ! command -v nginx &> /dev/null; then
        log_info "Installation Nginx..."
        apt-get install -y -qq nginx
    fi
    
    # Certbot si pas présent
    if ! command -v certbot &> /dev/null; then
        log_info "Installation Certbot..."
        apt-get install -y -qq certbot python3-certbot-nginx
    fi
    
    # Node.js si pas présent
    if ! command -v node &> /dev/null; then
        log_info "Installation Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
        apt-get install -y -qq nodejs
    fi
    
    # PM2 si pas présent
    if ! command -v pm2 &> /dev/null; then
        log_info "Installation PM2..."
        npm install -g pm2 &>/dev/null
    fi
    
    log_success "Dépendances OK"
}

configure_nginx_with_existing() {
    log_info "Configuration Nginx (coexistence avec existant)..."
    
    # Créer config pour notre API
    cat > /etc/nginx/sites-available/takymed-api << EOF
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://takymed.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, x-user-id' always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
}

server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}
EOF

    # Activer le site
    ln -sf /etc/nginx/sites-available/takymed-api /etc/nginx/sites-enabled/
    
    # Test config
    nginx -t && log_success "Nginx config OK" || log_error "Erreur config Nginx"
}

setup_ssl() {
    log_info "Configuration SSL (Let's Encrypt)..."
    
    # Obtenir certificat
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        certbot certonly --standalone --non-interactive --agree-tos \
            --email "$EMAIL" -d "$DOMAIN" --quiet
    fi
    
    # Renouvellement auto
    echo "0 3 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" \
        > /etc/cron.d/takymed-ssl-renewal
    
    log_success "SSL configuré"
}

deploy_backend() {
    log_info "Déploiement backend avec PM2..."
    
    cd "$BACKEND_DIR"
    
    # Build si nécessaire
    if [ ! -f "dist/node-build.mjs" ]; then
        log_info "Build du backend..."
        npm ci
        npm run build
    fi
    
    # Logs directory
    mkdir -p logs
    
    # Démarrer avec PM2 (nom unique pour éviter conflit)
    pm2 delete takymed-backend 2>/dev/null || true
    pm2 start ecosystem.config.cjs --name takymed-backend
    pm2 save
    
    # Auto-start au boot
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
    
    log_success "Backend déployé sur port $BACKEND_PORT"
}

start_services() {
    log_info "Démarrage des services..."
    
    # Reload Nginx (ne pas redémarrer pour ne pas casser l'existant)
    systemctl reload nginx || systemctl start nginx
    
    # Ouvrir firewall si fermé
    if command -v ufw &> /dev/null; then
        ufw allow 443/tcp 2>/dev/null || true
        ufw allow 80/tcp 2>/dev/null || true
    fi
    
    log_success "Services démarrés"
}

verify_deployment() {
    echo ""
    echo "=========================================="
    echo "  VÉRIFICATION"
    echo "=========================================="
    
    # Test backend local
    if curl -s http://localhost:$BACKEND_PORT/api > /dev/null; then
        log_success "Backend local: OK"
    else
        log_error "Backend local: ERREUR"
    fi
    
    # Test HTTPS
    if curl -s https://$DOMAIN/api > /dev/null 2>&1; then
        log_success "HTTPS externe: OK"
    else
        log_warning "HTTPS: Vérifiez le DNS (doit pointer vers ce serveur)"
    fi
    
    echo ""
    echo -e "${GREEN}URL API:${NC} https://$DOMAIN"
    echo -e "${GREEN}Frontend:${NC} https://takymed.com"
    echo ""
    echo "Commandes utiles :"
    echo "  pm2 logs takymed-backend    - Logs temps réel"
    echo "  pm2 status                  - Status processus"
    echo "  tail -f $BACKEND_DIR/logs/error.log"
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    echo "=========================================="
    echo "  TAKYMED DEPLOY - Solution Durable"
    echo "=========================================="
    echo ""
    
    [[ $EUID -ne 0 ]] && log_error "Exécuter en root: sudo $0" && exit 1
    
    check_existing_services
    install_dependencies
    configure_nginx_with_existing
    setup_ssl
    deploy_backend
    start_services
    verify_deployment
    
    echo ""
    log_success "Déploiement terminé!"
}

main "$@"
