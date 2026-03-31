#!/bin/bash
# =============================================================================
# Test des ports sur serveur distant
# =============================================================================

SERVER_IP="${1:-82.165.150.150}"

echo "=========================================="
echo "  TEST DES PORTS - $SERVER_IP"
echo "=========================================="
echo ""

# Test des ports critiques avec timeout
test_port() {
    local port=$1
    local name=$2
    timeout 2 bash -c "</dev/tcp/$SERVER_IP/$port" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "🔴 Port $port ($name): OCCUPÉ"
        return 0
    else
        echo "🟢 Port $port ($name): LIBRE"
        return 1
    fi
}

echo "Test des ports HTTP/HTTPS :"
test_port 80 "HTTP"
test_port 443 "HTTPS"

echo ""
echo "Test des ports d'application communs :"
test_port 3000 "Node.js dev"
test_port 3500 "Backend alt"
test_port 3500 "TAKYMED (cible)"
test_port 5000 "Flask/Python"
test_port 8000 "Django/HTTP"
test_port 8080 "HTTP alt"
test_port 9000 "PHP-FPM"

echo ""
echo "Test des ports PM2/Process :"
test_port 43554 "PM2 API"

echo ""
echo "=========================================="
echo "RÉSULTAT"
echo "=========================================="

# Si 3500 est libre et 80/443 aussi, on peut déployer
if ! test_port 3500 ""; then
    if ! test_port 80 "" && ! test_port 443 ""; then
        echo "✅ Configuration possible :"
        echo "   - Nginx sur 80/443 (reverse proxy)"
        echo "   - Backend TAKYMED sur 3500"
    else
        echo "⚠️  80/443 occupés - Nginx déjà présent probablement"
        echo "   Solution : ajouter config Nginx pour dev.takymed.com"
    fi
else
    echo "❌ Port 3500 occupé - choisir un autre port"
    echo "   Alternatives : 3501, 3600, 4000, 5000"
fi

echo ""
