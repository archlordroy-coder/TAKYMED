#!/bin/bash
# =============================================================================
# TAKYMED Frontend Build & Deploy Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

PROJECT_DIR="/home/ravel/Documents/TAKYMED"
FRONTEND_DIR="$PROJECT_DIR/frontend"

cd "$PROJECT_DIR"

log_info "Build du Frontend TAKYMED..."
log_info "API Backend: $(grep VITE_API_BASE_URL $FRONTEND_DIR/.env | cut -d'=' -f2)"

cd "$FRONTEND_DIR"

# Nettoyer l'ancien build
log_info "Nettoyage du dist/ précédent..."
rm -rf dist/

# Installation des dépendances
log_info "Installation des dépendances..."
npm ci --production=false

# Build
log_info "Build en cours..."
npm run build

# Vérifier que le build a réussi
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo -e "${RED}[ERROR]${NC} Le build a échoué - dossier dist/ non trouvé"
    exit 1
fi

# Afficher les infos du build
echo ""
echo "=========================================="
echo "  BUILD FRONTEND TERMINÉ"
echo "=========================================="
echo ""
echo -e "${GREEN}Dossier dist:${NC} $FRONTEND_DIR/dist"
echo -e "${GREEN}Taille:${NC} $(du -sh $FRONTEND_DIR/dist | cut -f1)"
echo ""
echo -e "${YELLOW}Prochaines étapes:${NC}"
echo "1. Upload le contenu de dist/ sur ton hébergeur (takymed.com)"
echo "2. Vérifier que l'API URL est correcte:"
echo "   $(grep VITE_API_BASE_URL $FRONTEND_DIR/.env)"
echo ""
echo -e "${GREEN}✓ Build prêt pour déploiement!${NC}"
echo ""

# Liste des fichiers générés
ls -lh $FRONTEND_DIR/dist/
