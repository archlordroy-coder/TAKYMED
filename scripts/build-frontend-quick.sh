#!/bin/bash
# =============================================================================
# Frontend Build avec vérification API URL
# =============================================================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FRONTEND_DIR="/home/ravel/Documents/TAKYMED/frontend"

echo -e "${BLUE}[INFO]${NC} Build Frontend TAKYMED"
echo "========================================"

cd "$FRONTEND_DIR"

# Vérifier l'API URL configurée
API_URL=$(grep VITE_API_BASE_URL .env | cut -d'=' -f2)
echo -e "${BLUE}API URL configurée:${NC} $API_URL"

if [[ "$API_URL" == *"localhost"* ]] || [[ "$API_URL" == *"127.0.0.1"* ]]; then
    echo -e "${RED}[ERREUR]${NC} API URL en localhost! Changez-la pour https://dev.takymed.com"
    exit 1
fi

if [[ "$API_URL" == http://* ]]; then
    echo -e "${YELLOW}[ATTENTION]${NC} API en HTTP - risque de Mixed Content"
    read -p "Continuer quand même? (y/n) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# Build
echo -e "${BLUE}[INFO]${NC} Installation dépendances..."
npm ci 2>&1 | tail -5

echo -e "${BLUE}[INFO]${NC} Build production..."
npm run build 2>&1 | tail -10

# Vérifier
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    SIZE=$(du -sh dist | cut -f1)
    echo -e "${GREEN}[SUCCESS]${NC} Build terminé ($SIZE)"
    echo ""
    echo "Prochaines étapes :"
    echo "1. Upload le dossier 'dist/' sur ton hébergeur"
    echo "2. Vérifier https://takymed.com"
    echo ""
    ls -lh dist/
else
    echo -e "${RED}[ERROR]${NC} Build échoué"
    exit 1
fi
