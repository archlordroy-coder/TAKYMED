#!/bin/bash

set -euo pipefail

# Load .env if present
if [ -f .env ]; then
    export $(grep -v '^#' .env | sed 's/\r$//' | xargs)
fi

# Config (can be overridden by .env)
REMOTE_USER=${SERVER_USER:-"root"}
REMOTE_HOST=${SERVER_IP:-"localhost"}
REMOTE_DIR=${DEST_DIR:-"/root/TAKYMED/backend"}
PASS=${SERVER_PASS:-""}
PM2_APP=${PM2_APP_NAME:-"takymed-backend"}
WA_WAIT_TIMEOUT=${WA_WAIT_TIMEOUT:-300}
WA_NO_WATCH=${WA_NO_WATCH:-0}

CONTROL_SOCKET="/tmp/ssh-takymed-whatsapp-$USER"
SSH_OPT="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ControlMaster=auto -o ControlPath=$CONTROL_SOCKET -o ControlPersist=60"

if [ -n "$PASS" ]; then
    export SSHPASS="$PASS"
    SSH_CMD="sshpass -e ssh $SSH_OPT"
else
    SSH_CMD="ssh $SSH_OPT"
fi

echo "🔁 Resetting WhatsApp session on $REMOTE_USER@$REMOTE_HOST for app '$PM2_APP'..."

# Start SSH control connection
$SSH_CMD -f $REMOTE_USER@$REMOTE_HOST "exit" 2>/dev/null || true

cleanup() {
    echo "🧹 Closing SSH connection..."
    $SSH_CMD -O exit $REMOTE_USER@$REMOTE_HOST 2>/dev/null || true
    rm -f "$CONTROL_SOCKET"
}
trap cleanup EXIT

# Remote reset actions:
# - Backup current Baileys auth state
# - Clear auth directory to force new QR/account binding
# - Restart PM2 app
$SSH_CMD $REMOTE_USER@$REMOTE_HOST "
    set -e
    APP_DIR='$REMOTE_DIR'
    SESSION_DIR=\"\$APP_DIR/data/auth_info_baileys\"
    BACKUP_DIR=\"\$APP_DIR/data/wa_backups\"
    TS=\$(date +%Y%m%d_%H%M%S)
    mkdir -p \"\$BACKUP_DIR\"

    if [ -d \"\$SESSION_DIR\" ] && [ \"\$(ls -A \"\$SESSION_DIR\" 2>/dev/null)\" ]; then
        tar -czf \"\$BACKUP_DIR/auth_info_baileys_\$TS.tgz\" -C \"\$APP_DIR/data\" auth_info_baileys
        echo \"📦 Backup created: \$BACKUP_DIR/auth_info_baileys_\$TS.tgz\"
    else
        echo \"ℹ️ No existing WhatsApp session files to backup.\"
    fi

    rm -rf \"\$SESSION_DIR\"
    mkdir -p \"\$SESSION_DIR\"
    echo \"✅ Session directory reset: \$SESSION_DIR\"

    if command -v pm2 >/dev/null 2>&1; then
        pm2 flush '$PM2_APP' || true
        pm2 restart '$PM2_APP' || pm2 reload '$PM2_APP' || true
        pm2 save || true
        echo \"✅ PM2 app restarted: $PM2_APP\"
    else
        echo \"⚠️ PM2 not found on remote server. Restart manually.\"
        exit 1
    fi
"

if [ "$WA_NO_WATCH" = "1" ]; then
    echo "✅ Reset appliqué. Mode sans suivi activé (WA_NO_WATCH=1)."
    echo "ℹ️ Lance ensuite: $SSH_CMD $REMOTE_USER@$REMOTE_HOST \"pm2 logs '$PM2_APP' --lines 50 --raw\""
    exit 0
fi

echo "📱 Suivi des logs WhatsApp en direct (QR dans ce terminal). Timeout: ${WA_WAIT_TIMEOUT}s"
echo "ℹ️ Scanne le QR dès qu'il apparaît. Le script se termine automatiquement quand la connexion s'ouvre."

LOG_FILE="/tmp/takymed-wa-watch-$$.log"
rm -f "$LOG_FILE"

set +e
timeout "${WA_WAIT_TIMEOUT}s" $SSH_CMD $REMOTE_USER@$REMOTE_HOST "pm2 logs '$PM2_APP' --lines 0 --raw" | tee "$LOG_FILE"
PIPE_EXIT=$?
set -e

if grep -q "WhatsApp Connection Opened" "$LOG_FILE"; then
    rm -f "$LOG_FILE"
    echo "✅ WhatsApp reset done. Connexion ouverte et QR validé."
    exit 0
fi

if [ "$PIPE_EXIT" -eq 124 ]; then
    echo "❌ Timeout atteint (${WA_WAIT_TIMEOUT}s) avant connexion WhatsApp."
    echo "💡 Relance avec plus de temps: WA_WAIT_TIMEOUT=600 bash ./scripts/whatsapp.sh"
else
    echo "❌ Le suivi des logs PM2 s'est arrêté avant la connexion WhatsApp."
fi

rm -f "$LOG_FILE"
exit 1
