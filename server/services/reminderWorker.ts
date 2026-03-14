import { db } from "../db";
import { notificationProvider } from "../services/notificationProvider";

// Intervalle de vérification des rappels (5 secondes)
const REMINDER_CHECK_INTERVAL = 5 * 1000;

// Flag pour éviter les exécutions concurrentes
let isChecking = false;

// Générer le message de rappel (supporte plusieurs médicaments à la même heure)
function generateCombinedReminderMessage(patientName: string, items: any[]): string {
  if (items.length === 0) return "";
  
  // Dédupliquer les items physiques par id_calendrier_prise
  const uniqueItemsMap = new Map();
  items.forEach(item => {
    if (!uniqueItemsMap.has(item.id_calendrier_prise)) {
      uniqueItemsMap.set(item.id_calendrier_prise, item);
    }
  });
  const uniqueItems = Array.from(uniqueItemsMap.values());

  const firstItem = uniqueItems[0];
  const scheduledTime = new Date(firstItem.heure_prevue);
  
  const hour = scheduledTime.getHours();
  const greeting = (hour >= 18 || hour < 6) ? "Bonsoir" : "Bonjour";
  const timeStr = scheduledTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  
  // Grouper par nom de médicament pour éviter les répétitions (ex: "doliprane : 1" x 4 -> "doliprane : 4")
  const groupedMeds = new Map<string, { dose: number, unite: string }>();
  uniqueItems.forEach(item => {
    const key = item.med_name;
    const current = groupedMeds.get(key) || { dose: 0, unite: item.nom_unite || "" };
    
    // Essayer de parser la dose en nombre
    const doseNum = parseFloat(String(item.dose).replace(',', '.'));
    if (!isNaN(doseNum)) {
      current.dose += doseNum;
    } else {
      // Si ce n'est pas un nombre, on concatène ou on ignore? 
      // Pour l'instant on garde la première valeur si non numérique
      if (current.dose === 0) (current as any).rawDose = item.dose;
    }
    groupedMeds.set(key, current);
  });

  const medsList = Array.from(groupedMeds.entries()).map(([name, info]) => {
    const doseDisplay = (info as any).rawDose || info.dose;
    return `${name} : ${doseDisplay} ${info.unite}`.trim();
  }).join("\n");
  
  return `${greeting} MR/Mme ${patientName} ; c'est l'heure de prendre vos médicaments de ${timeStr} :\n${medsList}`;
}

/**
 * Worker de rappels
 */
let workerTimeout: NodeJS.Timeout | null = null;

export function startReminderWorker() {
  if (workerTimeout) {
    console.log("ℹ️ Reminder worker already running.");
    return;
  }

  console.log("🚀 Starting reminder worker (5s interval)...");
  
  const runWorker = async () => {
    try {
      await checkAndSendReminders();
    } catch (err) {
      console.error("Error in reminder worker loop:", err);
    }
    workerTimeout = setTimeout(runWorker, REMINDER_CHECK_INTERVAL);
  };

  runWorker();
}

async function checkAndSendReminders() {
  if (isChecking) return;
  
  isChecking = true;
  try {
    const now = new Date();
    const plus5Str = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const minus1HourStr = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

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
        AND cp.heure_prevue <= ?
        AND cp.heure_prevue >= ?
        AND (pnu.est_active = 1 OR pnu.est_active IS NULL)
        AND o.est_active = 1
    `).all(plus5Str, minus1HourStr) as any[];

    if (dueReminders.length === 0) {
      if (now.getSeconds() < 10) { 
         // console.log(`⏱️ Reminder worker checking...`);
      }
      return;
    }

    const groups: Record<string, any[]> = {};
    dueReminders.forEach(r => {
      const contact = r.valeur_contact || r.numero_telephone;
      const key = `${contact}_${r.nom_patient}_${r.heure_prevue}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    for (const [key, items] of Object.entries(groups)) {
      const contact = items[0].valeur_contact || items[0].numero_telephone;
      try {
        await sendCombinedReminders(contact, items);
      } catch (error) {
        console.error(`Failed to send combined reminders to ${contact}:`, error);
      }
    }
  } catch (error) {
    console.error("Critical error in reminder worker:", error);
  } finally {
    isChecking = false;
  }
}

async function sendCombinedReminders(contact: string, items: any[]) {
  const patientName = items[0].nom_patient;
  const channel = items[0].nom_canal || "SMS";
  const userId = items[0].id_utilisateur;
  const message = generateCombinedReminderMessage(patientName, items);

  const ids = items.map(i => i.id_calendrier_prise);
  const placeholders = ids.map(() => '?').join(',');

  // Marquage immédiat comme envoyé (optimiste) pour éviter les doublons par d'autres instances/runs
  db.prepare(`UPDATE CalendrierPrises SET rappel_envoye = 1 WHERE id_calendrier_prise IN (${placeholders})`).run(...ids);

  console.log(`📤 Sending ${channel} to ${contact} (${items.length} items grouped)`);

  const jobId = db.prepare(`
    INSERT INTO NotificationJobs (id_utilisateur, channel, message, contact_value, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, 'processing')
  `).run(userId, channel, message, contact, new Date().toISOString()).lastInsertRowid as number;

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

  // Mettre à jour le job et les logs
  db.prepare(`UPDATE NotificationJobs SET status = ?, processed_at = datetime('now') WHERE id_job = ?`).run(result.success ? 'sent' : 'failed', jobId);

  const providerName = (notificationProvider.constructor.name.includes('Orange') ? 'orange' : 'mock');
  db.prepare(`
    INSERT INTO NotificationLogs (id_job, provider, channel, to_contact, message, status, error_message, provider_message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(jobId, providerName, channel, contact, message, result.success ? "sent" : "failed", result.error, result.messageId);

  if (!result.success) {
    // Revenir à 0 si échec pour permettre un retry
    db.prepare(`UPDATE CalendrierPrises SET rappel_envoye = 0 WHERE id_calendrier_prise IN (${placeholders})`).run(...ids);
    console.log(`❌ Failed: ${result.error}`);
  } else {
    console.log(`✅ Sent to ${patientName}`);
  }
}
