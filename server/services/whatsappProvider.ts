import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

const logger = pino({ level: 'info' });

// Path for auth state
const AUTH_STATE_DIR = path.join(process.cwd(), 'data', 'auth_info_baileys');

if (!fs.existsSync(AUTH_STATE_DIR)) {
    fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
}

let sock: any = null;
let connectionRetryCount = 0;

/**
 * Initialize WhatsApp connection
 */
export async function connectToWhatsApp() {
    if (sock) {
        console.log('ℹ️ WhatsApp socket already exists.');
        return sock;
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_STATE_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        printQRInTerminal: false, // We handle it manually for better control
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        browser: ['TAKYMED', 'Chrome', '110.0.0'],
        syncFullHistory: false,
    });

    sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📸 NEW QR CODE GENERATED - Scan with WhatsApp:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            qrcode.generate(qr, { small: true });
            console.log('\n(If you don\'t see the QR code, ensure your terminal supports ANSI)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`🔴 WhatsApp Connection closed (Status: ${statusCode}). Reconnecting: ${shouldReconnect}`);
            
            if (shouldReconnect && connectionRetryCount < 10) {
                connectionRetryCount++;
                sock = null; // Reset sock to allow clean re-init
                setTimeout(() => connectToWhatsApp(), 5000 * connectionRetryCount);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ Logged out of WhatsApp. Please delete data/auth_info_baileys and restart to re-scan.');
                sock = null;
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Connection Opened for TAKYMED!');
            connectionRetryCount = 0;
        }
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
}

/**
 * Send a WhatsApp message
 * @param to Phone number with country code (e.g., 237xxxxxx)
 * @param text Message content
 */
export async function sendWhatsAppMessage(to: string, text: string) {
    if (!sock) {
        // Try to recover if sock is null but we had a session
        console.log('ℹ️ Re-initializing WhatsApp socket before sending message...');
        await connectToWhatsApp();
        if (!sock) return { success: false, error: 'Socket not initialized' };
    }

    try {
        // Format number: remove non-digits and ensure @s.whatsapp.net suffix
        const cleanTo = to.replace(/\D/g, '');
        if (!cleanTo) {
            return { success: false, error: 'Invalid phone number format' };
        }
        const jid = `${cleanTo}@s.whatsapp.net`;

        console.log(`📡 Attempting to send WhatsApp to ${jid}...`);
        const result = await sock.sendMessage(jid, { text });
        
        if (result && result.key) {
            console.log(`📤 Message sent successfully to ${jid}. ID: ${result.key.id}`);
            return { success: true, messageId: result.key.id };
        } else {
            console.warn(`⚠️ Message sent to ${jid} but no result key received.`);
            return { success: true, messageId: 'unknown' };
        }
    } catch (error: any) {
        console.error('❌ Error sending WhatsApp message:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

// Automatical connection on import removed to avoid double initialization in some environments
// connectToWhatsApp().catch(err => console.error('Critical WhatsApp Init Error:', err));
