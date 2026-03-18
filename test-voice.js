
import { sendWhatsAppVoice } from './server/services/whatsappProvider.js';

async function testVoice() {
    console.log("🚀 Starting manual voice test...");
    const result = await sendWhatsAppVoice('237674376524', "Bonjour, ceci est un test de rappel vocal automatique via gTTS pour TAKYMED. Si vous entendez ceci, l'intégration est un succès.");
    console.log("Result:", result);
    process.exit(result.success ? 0 : 1);
}

testVoice().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
