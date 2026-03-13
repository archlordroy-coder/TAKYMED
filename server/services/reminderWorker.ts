import { db } from "../db";
import { notificationProvider } from "../services/notificationProvider";

// Intervalle de vérification des rappels (1 minute)
const REMINDER_CHECK_INTERVAL = 60 * 1000;

// Générer le message de rappel
function generateReminderMessage(medName: string, dose: number, unit: string, time: string): string {
  return `🔔 RAPPEL TAKYMED: Il est temps de prendre votre ${medName} (${dose} ${unit}) à ${time}. Bonne santé!`;
}

// Worker de rappels
export function startReminderWorker() {
  console.log("🚀 Starting reminder worker...");

  setInterval(async () => {
    try {
      await checkAndSendReminders();
    } catch (error) {
      console.error("Reminder worker error:", error);
    }
  }, REMINDER_CHECK_INTERVAL);
}

async function checkAndSendReminders() {
  const now = new Date();
  const nowStr = now.toISOString();

  // Trouver les rappels dus (non envoyés, dans les 5 prochaines minutes)
  const dueReminders = db.prepare(`
    SELECT
      cp.id_calendrier_prise,
      cp.heure_prevue,
      cp.dose,
      u.nom_unite,
      m.nom as med_name,
      o.nom_patient,
      pnu.valeur_contact,
      cn.nom_canal,
      u2.numero_telephone,
      u2.id_utilisateur
    FROM CalendrierPrises cp
    JOIN ElementsOrdonnance eo ON cp.id_element_ordonnance = eo.id_element_ordonnance
    JOIN Ordonnances o ON eo.id_ordonnance = o.id_ordonnance
    JOIN Medicaments m ON eo.id_medicament = m.id_medicament
    JOIN Unites u ON cp.id_unite = u.id_unite
    JOIN Utilisateurs u2 ON o.id_utilisateur = u2.id_utilisateur
    LEFT JOIN PreferencesNotificationUtilisateurs pnu ON u2.id_utilisateur = pnu.id_utilisateur
    LEFT JOIN CanauxNotification cn ON pnu.id_canal = cn.id_canal
    WHERE cp.rappel_envoye = 0
      AND cp.heure_prevue <= datetime('now', '+5 minutes')
      AND cp.heure_prevue > datetime('now', '-1 hour')  -- Ne pas spammer les anciens rappels
      AND pnu.est_active = 1
      AND o.est_active = 1
  `).all();

  console.log(`📋 Found ${dueReminders.length} reminders to send`);

  for (const reminder of dueReminders) {
    try {
      await sendReminder(reminder);
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id_calendrier_prise}:`, error);
    }
  }
}

async function sendReminder(reminder: any) {
  const {
    id_calendrier_prise,
    heure_prevue,
    dose,
    nom_unite,
    med_name,
    nom_patient,
    valeur_contact,
    nom_canal,
    numero_telephone,
    id_utilisateur
  } = reminder;

  // Format de l'heure
  const timeStr = new Date(heure_prevue).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Générer le message
  const message = generateReminderMessage(med_name, dose, nom_unite, timeStr);

  // Déterminer le contact (préférence utilisateur ou numéro par défaut)
  const contact = valeur_contact || numero_telephone;
  const channel = nom_canal || "SMS";

  console.log(`📤 Sending ${channel} reminder to ${contact} for ${med_name}`);

  // Créer le job de notification
  const jobId = db.prepare(`
    INSERT INTO NotificationJobs (
      id_utilisateur,
      id_calendrier_prise,
      channel,
      message,
      contact_value,
      scheduled_at,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, 'processing')
  `).run(
    id_utilisateur,
    id_calendrier_prise,
    channel,
    message,
    contact,
    new Date().toISOString()
  ).lastInsertRowid;

  let result;

  // Envoyer selon le canal
  try {
    switch (channel) {
      case "SMS":
        result = await notificationProvider.sendSMS(contact, message);
        break;
      case "WhatsApp":
        result = await notificationProvider.sendWhatsApp(contact, message);
        break;
      case "Voice":
        result = await notificationProvider.sendVoiceCall(contact, message);
        break;
      default:
        result = { success: false, error: "Unsupported channel" };
    }
  } catch (error) {
    result = { success: false, error: error.message };
  }

  // Mettre à jour le job
  db.prepare(`
    UPDATE NotificationJobs
    SET status = ?, processed_at = datetime('now')
    WHERE id_job = ?
  `).run(result.success ? 'sent' : 'failed', jobId);

  // Loguer dans NotificationLogs
  db.prepare(`
    INSERT INTO NotificationLogs (
      id_job,
      provider,
      channel,
      to_contact,
      message,
      status,
      error_message,
      provider_message_id,
      cost
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    "mock", // TODO: remplacer par le vrai provider
    channel,
    contact,
    message,
    result.success ? "sent" : "failed",
    result.error,
    result.messageId,
    0.0 // TODO: calculer le coût réel
  );

  // Marquer le rappel comme envoyé si succès
  if (result.success) {
    db.prepare(`
      UPDATE CalendrierPrises
      SET rappel_envoye = 1
      WHERE id_calendrier_prise = ?
    `).run(id_calendrier_prise);

    console.log(`✅ Reminder sent for ${med_name} (${id_calendrier_prise})`);
  } else {
    console.log(`❌ Failed to send reminder for ${med_name} (${id_calendrier_prise}): ${result.error}`);
  }
}
