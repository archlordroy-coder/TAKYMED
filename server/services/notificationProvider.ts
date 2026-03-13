import { Router } from "express";
import { db } from "../db";
import { z } from "zod";

// Interface pour les providers de notification
interface NotificationProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendWhatsApp(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendVoiceCall(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// Provider mock pour développement (remplacer par Twilio, etc.)
class MockNotificationProvider implements NotificationProvider {
  async sendSMS(to: string, message: string) {
    console.log(`📱 SMS to ${to}: ${message}`);
    // Simulate random success/failure for testing
    const success = Math.random() > 0.1; // 90% success rate
    return {
      success,
      messageId: success ? `mock-sms-${Date.now()}` : undefined,
      error: success ? undefined : "Mock SMS failure"
    };
  }

  async sendWhatsApp(to: string, message: string) {
    console.log(`💬 WhatsApp to ${to}: ${message}`);
    const success = Math.random() > 0.15; // 85% success rate
    return {
      success,
      messageId: success ? `mock-wa-${Date.now()}` : undefined,
      error: success ? undefined : "Mock WhatsApp failure"
    };
  }

  async sendVoiceCall(to: string, message: string) {
    console.log(`📞 Voice call to ${to}: ${message}`);
    const success = Math.random() > 0.2; // 80% success rate
    return {
      success,
      messageId: success ? `mock-voice-${Date.now()}` : undefined,
      error: success ? undefined : "Mock voice call failure"
    };
  }
}

// Instance globale du provider
const notificationProvider = new MockNotificationProvider();

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

    // Log dans NotificationLogs
    db.prepare(`
      INSERT INTO NotificationLogs (provider, channel, to_contact, message, status, error_message, provider_message_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "mock",
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
