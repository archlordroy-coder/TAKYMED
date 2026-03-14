import { db } from "../db";
import { notificationProvider } from "../services/notificationProvider";

// Intervalle de vérification des rappels (5 secondes)
const REMINDER_CHECK_INTERVAL = 5 * 1000;

// Générer le message de rappel (supporte plusieurs médicaments)
function generateCombinedReminderMessage(patientName: string, items: any[]): string {
  const medsList = items.map(item => `- ${item.dose} ${item.nom_unite || 'unité'}(s) de ${item.med_name}`).join("\n");
  return `🔔 TAKYMED : Rappel pour ${patientName}.\nIl est temps de prendre :\n${medsList}\nBonne santé !`;
}

/**
 * Exemples de messages proposés à l'utilisateur :
 * 1. Standard : "Bonjour [Nom], c'est l'heure de vos médicaments : [Liste]. Prenez soin de vous !"
 * 2. Empathique : "Petit rappel santé pour [Nom] : il est temps pour [Liste]. N'oubliez pas de boire un verre d'eau !"
 * 3. Professionnel : "TAKYMED : Rappel de prise pour [Patient]. Médicaments : [Liste]. Heure : [Heure]."
 */

// Worker de rappels
export function startReminderWorker() {
  console.log("🚀 Starting reminder worker (5s interval)...");

  setInterval(async () => {
    try {
      await checkAndSendReminders();
    } catch (error) {
      console.error("Reminder worker error:", error);
    }
  }, REMINDER_CHECK_INTERVAL);
}

async function checkAndSendReminders() {
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
      AND cp.heure_prevue > datetime('now', '-1 hour')
      AND (pnu.est_active = 1 OR pnu.est_active IS NULL)
      AND o.est_active = 1
  `).all() as any[];

  if (dueReminders.length === 0) return;

  // Grouper par contact (numéro de téléphone)
  const groups: Record<string, any[]> = {};
  dueReminders.forEach(r => {
    const contact = r.valeur_contact || r.numero_telephone;
    if (!groups[contact]) groups[contact] = [];
    groups[contact].push(r);
  });

  console.log(`📋 Found ${dueReminders.length} reminders for ${Object.keys(groups).length} recipients`);

  for (const [contact, items] of Object.entries(groups)) {
    try {
      await sendCombinedReminders(contact, items);
    } catch (error) {
      console.error(`Failed to send combined reminders to ${contact}:`, error);
    }
  }
}

async function sendCombinedReminders(contact: string, items: any[]) {
  const patientName = items[0].nom_patient;
  const channel = items[0].nom_canal || "SMS";
  const userId = items[0].id_utilisateur;
  const message = generateCombinedReminderMessage(patientName, items);

  console.log(`📤 Sending ${channel} to ${contact} (Combined ${items.length} items)`);

  // Créer le job de notification
  const jobId = db.prepare(`
    INSERT INTO NotificationJobs (
      id_utilisateur,
      channel,
      message,
      contact_value,
      scheduled_at,
      status
    ) VALUES (?, ?, ?, ?, ?, 'processing')
  `).run(
    userId,
    channel,
    message,
    contact,
    new Date().toISOString()
  ).lastInsertRowid as number;

  let result;
  try {
    if (channel === "SMS") {
      result = await notificationProvider.sendSMS(contact, message);
    } else if (channel === "WhatsApp") {
      result = await notificationProvider.sendWhatsApp(contact, message);
    } else {
      result = { success: false, error: "Unsupported channel" };
    }
  } catch (error: any) {
    result = { success: false, error: error.message };
  }

  // Mettre à jour le job
  db.prepare(`
    UPDATE NotificationJobs
    SET status = ?, processed_at = datetime('now')
    WHERE id_job = ?
  `).run(result.success ? 'sent' : 'failed', jobId);

  // Loguer
  const providerName = (notificationProvider.constructor.name.includes('Orange') ? 'orange' : 'mock');
  db.prepare(`
    INSERT INTO NotificationLogs (
      id_job, provider, channel, to_contact, message, status, error_message, provider_message_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    providerName,
    channel,
    contact,
    message,
    result.success ? "sent" : "failed",
    result.error,
    result.messageId
  );

  if (result.success) {
    // Marquer TOUS les rappels du groupe comme envoyés
    const placeholders = items.map(() => '?').join(',');
    const ids = items.map(i => i.id_calendrier_prise);
    db.prepare(`
      UPDATE CalendrierPrises
      SET rappel_envoye = 1
      WHERE id_calendrier_prise IN (${placeholders})
    `).run(...ids);

    console.log(`✅ Reminders sent for ${patientName} (${items.length} meds)`);
  } else {
    console.log(`❌ Failed to send reminders for ${patientName}: ${result.error}`);
  }
}
