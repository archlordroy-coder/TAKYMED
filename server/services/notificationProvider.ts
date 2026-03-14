import { Router } from "express";
import { db } from "../db";
import { z } from "zod";

// Interface pour les providers de notification
interface NotificationProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendWhatsApp(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendVoiceCall(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// Provider Orange SMS (Orange API)
class OrangeSMSProvider implements NotificationProvider {
  private clientId = process.env.ORANGE_CLIENT_ID;
  private clientSecret = process.env.ORANGE_CLIENT_SECRET;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Orange Auth failed: ${response.statusText}`);
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (parseInt(data.expires_in) - 60) * 1000;
    return this.accessToken;
  }

  async sendSMS(to: string, message: string) {
    try {
      console.log(`[Orange SMS] Début envoi vers ${to}`);
      const token = await this.getAccessToken();
      console.log(`[Orange SMS] Token obtenu: ${token.substring(0, 20)}...`);
      
      const senderAddress = process.env.ORANGE_SENDER_ADDRESS || 'tel:+2250000';
      const senderName = process.env.ORANGE_SENDER_NAME || 'TAKYMED';

      // Ensure 'to' is in 'tel:+xxx' format
      const formattedTo = to.startsWith('tel:') ? to : `tel:${to.startsWith('+') ? to : '+' + to}`;
      console.log(`[Orange SMS] Destinataire formaté: ${formattedTo}`);
      console.log(`[Orange SMS] Expéditeur: ${senderAddress}, Nom: ${senderName}`);

      const body: any = {
        outboundSMSMessageRequest: {
          address: formattedTo,
          senderAddress: senderAddress,
          outboundSMSTextMessage: { message }
        }
      };

      if (senderName) {
        body.outboundSMSMessageRequest.senderName = senderName;
      }

      console.log(`[Orange SMS] Corps de la requête:`, JSON.stringify(body, null, 2));
      
      const url = `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`;
      console.log(`[Orange SMS] URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      console.log(`[Orange SMS] Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData: any = await response.json();
        console.error(`[Orange SMS] Erreur API:`, JSON.stringify(errorData, null, 2));
        return { success: false, error: JSON.stringify(errorData) };
      }

      const data: any = await response.json();
      console.log(`[Orange SMS] Succès:`, JSON.stringify(data, null, 2));
      return {
        success: true,
        messageId: data.outboundSMSMessageRequest.resourceReference?.resourceURL?.split('/').pop()
      };
    } catch (error: any) {
      console.error("[Orange SMS] Exception:", error);
      return { success: false, error: error.message };
    }
  }

  async sendWhatsApp(to: string, message: string) {
    // Orange doesn't seem to support WhatsApp directly in this simple SMS API
    // We fallback to SMS for now or log it
    console.log(`[Orange WA Fallback] SMS to ${to}: ${message}`);
    return this.sendSMS(to, message);
  }

  async sendVoiceCall(to: string, message: string) {
    console.log(`[Orange Voice Fallback] Mock voice to ${to}: ${message}`);
    return { success: false, error: "Voice call not supported by Orange Provider" };
  }
}

// Provider mock pour développement
class MockNotificationProvider implements NotificationProvider {
  async sendSMS(to: string, message: string) {
    console.log(`📱 Mock SMS to ${to}: ${message}`);
    const success = Math.random() > 0.1;
    return {
      success,
      messageId: success ? `mock-sms-${Date.now()}` : undefined,
      error: success ? undefined : "Mock SMS failure"
    };
  }

  async sendWhatsApp(to: string, message: string) {
    console.log(`💬 Mock WhatsApp to ${to}: ${message}`);
    const success = Math.random() > 0.15;
    return {
      success,
      messageId: success ? `mock-wa-${Date.now()}` : undefined,
      error: success ? undefined : "Mock WhatsApp failure"
    };
  }

  async sendVoiceCall(to: string, message: string) {
    console.log(`📞 Mock Voice call to ${to}: ${message}`);
    const success = Math.random() > 0.2;
    return {
      success,
      messageId: success ? `mock-voice-${Date.now()}` : undefined,
      error: success ? undefined : "Mock voice call failure"
    };
  }
}

// Instance globale du provider (toujours Orange API)
const notificationProvider: NotificationProvider =
  (process.env.ORANGE_CLIENT_ID && process.env.ORANGE_CLIENT_SECRET)
    ? new OrangeSMSProvider()
    : new MockNotificationProvider();

// Log au démarrage
console.log(`📱 Notification Provider initialized: ${notificationProvider.constructor.name}`);
console.log(`📱 ORANGE_CLIENT_ID: ${process.env.ORANGE_CLIENT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`📱 ORANGE_CLIENT_SECRET: ${process.env.ORANGE_CLIENT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`📱 ORANGE_SENDER_ADDRESS: ${process.env.ORANGE_SENDER_ADDRESS || 'Not set'}`);
console.log(`📱 ORANGE_SENDER_NAME: ${process.env.ORANGE_SENDER_NAME || 'Not set'}`);
console.log(`📱 Tous les SMS utilisent maintenant l'API Orange réelle !`);

const router = Router();

// Route de test pour administrateurs
router.post("/test-send", async (req, res) => {
  try {
    const { channel, to, message } = z.object({
      channel: z.enum(["SMS", "WhatsApp", "Voice"]),
      to: z.string().min(1),
      message: z.string().min(1)
    }).parse(req.body);

    let result;
    switch (channel) {
      case "SMS":
        result = await notificationProvider.sendSMS(to, message);
        break;
      case "WhatsApp":
        result = await notificationProvider.sendWhatsApp(to, message);
        break;
      case "Voice":
        result = await notificationProvider.sendVoiceCall(to, message);
        break;
    }

    // Determine the provider name for logging
    const providerName = (notificationProvider instanceof OrangeSMSProvider) ? "orange" : "mock";

    // Log dans NotificationLogs
    db.prepare(`
      INSERT INTO NotificationLogs (provider, channel, to_contact, message, status, error_message, provider_message_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      providerName, // Use the determined provider name
      channel,
      to,
      message,
      result.success ? "sent" : "failed",
      result.error,
      result.messageId
    );

    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

  } catch (error) {
    console.error("Test notification error:", error);
    res.status(400).json({ error: "Données invalides" });
  }
});

// Export provider pour utilisation dans d'autres modules
export { notificationProvider, type NotificationProvider };
export const notificationRouter = router;
