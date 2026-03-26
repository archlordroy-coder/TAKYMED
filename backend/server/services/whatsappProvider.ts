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
import { fileURLToPath } from 'url';
import gTTS from 'gtts';
import { db } from "../db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({ level: 'info' });

// Path for auth state
const AUTH_STATE_DIR = path.join(process.cwd(), 'data', 'auth_info_baileys');

if (!fs.existsSync(AUTH_STATE_DIR)) {
    fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
}

let sock: any = null;
let connectionRetryCount = 0;
let connectingPromise: Promise<any> | null = null;

/**
 * Initialize WhatsApp connection
 */
export async function connectToWhatsApp() {
    if (sock) return sock;
    if (connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
        try {
            console.log('⏳ Initializing WhatsApp connection...');
            const result = await performConnection();
            connectingPromise = null;
            return result;
        } catch (err) {
            connectingPromise = null;
            throw err;
        }
    })();

    return connectingPromise;
}

async function performConnection() {
    if (sock) return sock;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_STATE_DIR);
    
    if (state.creds.registered) {
        console.log('✅ Found existing WhatsApp session. Connecting...');
    } else {
        console.log('ℹ️ No existing session found. Awaiting QR scan...');
    }
    
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        printQRInTerminal: false,
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
            const isAuthError = statusCode === DisconnectReason.badSession || statusCode === 401 || statusCode === 403;
            
            console.log(`🔴 WhatsApp Connection closed (Status: ${statusCode}). Should Reconnect: ${shouldReconnect}`);
            
            // If it's a critical auth error or logout, we must clear the state to allow a fresh scan
            if (!shouldReconnect || isAuthError) {
                console.log('⚠️  Critical connection error or logged out. Resetting session...');
                if (fs.existsSync(AUTH_STATE_DIR)) {
                    try {
                        // Keep the folder but remove contents to avoid path issues
                        const files = fs.readdirSync(AUTH_STATE_DIR);
                        for (const file of files) {
                            fs.unlinkSync(path.join(AUTH_STATE_DIR, file));
                        }
                    } catch (e) {
                        console.error('Failed to clear AUTH_STATE_DIR:', e);
                    }
                }
                sock = null;
                connectionRetryCount = 0;
                
                if (shouldReconnect) {
                    console.log('🔄 Attempting fresh start after reset...');
                    setTimeout(() => connectToWhatsApp(), 5000);
                }
            } else if (connectionRetryCount < 15) {
                connectionRetryCount++;
                sock = null; 
                // Exponential backoff
                const backoff = Math.min(30000, 2000 * Math.pow(1.5, connectionRetryCount));
                console.log(`🔄 Attempting reconnection session #${connectionRetryCount} in ${Math.round(backoff/1000)}s...`);
                setTimeout(() => connectToWhatsApp(), backoff);
            } else {
                console.log('❌ Maximum reconnection attempts reached. Please check server status.');
                sock = null;
                connectionRetryCount = 0;
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
 */
export async function sendWhatsAppMessage(to: string, text: string) {
    try {
        const currentSock = await connectToWhatsApp();
        if (!currentSock) return { success: false, error: 'Socket not initialized' };

        const cleanTo = to.replace(/\D/g, '');
        if (!cleanTo) return { success: false, error: 'Invalid phone number format' };
        
        const jid = `${cleanTo}@s.whatsapp.net`;
        console.log(`📡 Preparing to send WhatsApp to ${jid}...`);
        
        await currentSock.presenceSubscribe(jid);
        const delay = Math.floor(Math.random() * 2500) + 1500;
        await new Promise(resolve => setTimeout(resolve, delay));

        await currentSock.sendPresenceUpdate('composing', jid);
        const typingDelay = Math.floor(Math.random() * 1000) + 500;
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        await currentSock.sendPresenceUpdate('paused', jid);

        const result = await currentSock.sendMessage(jid, { text });
        
        if (result && result.key) {
            console.log(`📤 Message sent successfully to ${jid}. ID: ${result.key.id}`);
            return { success: true, messageId: result.key.id };
        }
        return { success: true, messageId: 'unknown' };
    } catch (error: any) {
        console.error('❌ Error sending WhatsApp message:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Sends a text-to-speech voice note via WhatsApp
 */
export async function sendWhatsAppVoice(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const currentSock = await connectToWhatsApp();
        if (!currentSock) return { success: false, error: 'WhatsApp service not initialized' };

        const cleanTo = to.replace(/\D/g, '');
        if (!cleanTo) return { success: false, error: 'Invalid phone number format' };
        
        const jid = `${cleanTo}@s.whatsapp.net`;

        // Generate TTS audio
        const gtts = new gTTS(message, 'fr');
        const tempDir = path.join(process.cwd(), 'data', 'temp_audio');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const filePath = path.join(tempDir, `voice_${Date.now()}.mp3`);

        return new Promise((resolve) => {
            gtts.save(filePath, async (err: any) => {
                if (err) {
                    console.error("[gTTS] Error saving audio:", err);
                    return resolve({ success: false, error: 'Failed to generate audio' });
                }

                try {
                    console.log(`📡 Sending Voice Note to ${jid}...`);
                    
                    const delay = Math.floor(Math.random() * 2000) + 1000;
                    await new Promise(r => setTimeout(r, delay));

                    const result = await currentSock.sendMessage(jid, { 
                        audio: { url: filePath }, 
                        mimetype: 'audio/mp4', 
                        ptt: true 
                    });

                    // Cleanup (delayed)
                    setTimeout(() => {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    }, 60000);

                    if (result && result.key) {
                        return resolve({ success: true, messageId: result.key.id });
                    }
                    resolve({ success: false, error: 'Failed to obtain result key' });
                } catch (sendErr: any) {
                    console.error("[WhatsApp Voice] Send error:", sendErr);
                    resolve({ success: false, error: sendErr.message });
                }
            });
        });
    } catch (error: any) {
        console.error("[WhatsApp Voice] Critical error:", error);
        return { success: false, error: error.message };
    }
}
