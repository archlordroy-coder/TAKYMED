#!/bin/bash

# TAKYMED Dev Server Launcher
# Kills any existing Vite process used by this project, then starts fresh on port 3500.

PORT=3500
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔧 TAKYMED Dev Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill all vite processes running from THIS project directory
PIDS=$(pgrep -f "vite.*--port\|vite$" 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "⚡ Arrêt des serveurs Vite actifs..."
  echo "$PIDS" | xargs kill -9 2>/dev/null
  sleep 1
  echo "✅ Serveurs arrêtés."
else
  echo "ℹ️  Aucun serveur Vite actif."
fi

# Also free the port if something else is on it
fuser -k ${PORT}/tcp 2>/dev/null || true
sleep 0.5

echo ""
echo "🚀 Démarrage sur http://localhost:${PORT}/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_DIR"
exec npx vite --port ${PORT}
