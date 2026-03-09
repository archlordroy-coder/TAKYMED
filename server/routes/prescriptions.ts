import { Router } from "express";
import { db } from "../db";

const router = Router();

// Get user prescriptions and upcoming doses
router.get("/", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
        const doses = db.prepare(`
      SELECT 
        cp.id_calendrier_prise as id,
        m.id_medicament as medicationId,
        m.nom as medicationName,
        eo.dose_personnalisee as dose,
        cp.heure_prevue as time,
        cp.rappel_envoye as statusReminderSent,
        cp.statut_prise as statusTaken
      FROM CalendrierPrises cp
      JOIN ElementsOrdonnance eo ON cp.id_element_ordonnance = eo.id_element_ordonnance
      JOIN Medicaments m ON eo.id_medicament = m.id_medicament
      JOIN Ordonnances o ON eo.id_ordonnance = o.id_ordonnance
      WHERE o.id_utilisateur = ? AND o.est_active = 1
      ORDER BY cp.heure_prevue ASC
      LIMIT 100
    `).all(userId);

        const mappedDoses = doses.map((d: any) => ({
            id: d.id,
            medicationId: d.medicationId,
            medicationName: d.medicationName,
            dose: d.dose,
            unit: "unité",
            time: new Date(d.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            statusReminderSent: !!d.statusReminderSent,
            statusTaken: !!d.statusTaken
        }));

        res.json({
            doses: mappedDoses,
            stats: {
                observanceRate: mappedDoses.length > 0
                    ? Math.round((mappedDoses.filter(d => d.statusTaken).length / mappedDoses.length) * 100)
                    : 100,
                activeReminders: mappedDoses.filter(d => !d.statusTaken).length,
                plannedReminders: mappedDoses.length,
                nearbyPharmacies: 12,
                nextDose: mappedDoses.find(d => !d.statusTaken) || null
            }
        });
    } catch (error) {
        console.error("Failed to list prescriptions:", error);
        res.status(500).json({ error: "Server error fetching prescriptions" });
    }
});

// Create a new prescription
router.post("/", (req, res) => {
    const { userId, title, weight, categorieAge, medications, notifConfig } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    try {
        const insertTransaction = db.transaction(() => {
            // 1. Create Ordonnance
            const ordStmt = db.prepare(`
                INSERT INTO Ordonnances (id_utilisateur, titre, poids_patient, categorie_age, date_ordonnance) 
                VALUES (?, ?, ?, ?, CURRENT_DATE)
            `);
            const ordInfo = ordStmt.run(userId, title, weight || 0, categorieAge || 'adulte');
            const idOrdonnance = ordInfo.lastInsertRowid;

            // 2. Save Notification Preferences
            if (notifConfig && notifConfig.phone) {
                let canalId = 1; // SMS default
                if (notifConfig.type === 'whatsapp') canalId = 2;
                if (notifConfig.type === 'call') canalId = 3;
                if (notifConfig.type === 'push') canalId = 4;

                db.prepare(`
                    INSERT OR REPLACE INTO PreferencesNotificationUtilisateurs (id_utilisateur, id_canal, valeur_contact, est_active)
                    VALUES (?, ?, ?, 1)
                `).run(userId, canalId, notifConfig.phone);
            }

            // 3. Iterate each Medication
            for (const m of medications) {
                let medRecord = db.prepare("SELECT id_medicament FROM Medicaments WHERE LOWER(nom) = LOWER(?)").get(m.name) as { id_medicament: number } | undefined;

                let idMedicament;
                if (!medRecord) {
                    const mStmt = db.prepare("INSERT INTO Medicaments (nom) VALUES (?)");
                    const mInfo = mStmt.run(m.name);
                    idMedicament = mInfo.lastInsertRowid;
                } else {
                    idMedicament = medRecord.id_medicament;
                }

                // Map the frequency type to match the CHECK constraint in the DB ('matin','midi','soir','personnalise')
                const allowedFrequencies = ['matin', 'midi', 'soir'];
                const dbFrequence = allowedFrequencies.includes(m.frequencyType) ? m.frequencyType : 'personnalise';

                // Insert ElementsOrdonnance
                const eoStmt = db.prepare(`
                    INSERT INTO ElementsOrdonnance (id_ordonnance, id_medicament, type_frequence, intervalle_heures, duree_jours, dose_personnalisee)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);

                const eoInfo = eoStmt.run(
                    idOrdonnance,
                    idMedicament,
                    dbFrequence,
                    m.intervalHours || null,
                    m.durationDays,
                    m.doseValue
                );
                const idElement = eoInfo.lastInsertRowid;

                // 4. Generate CalendrierPrises Schedule
                if (m.frequencyType !== 'prn') {
                    const pStmt = db.prepare(`
                        INSERT INTO CalendrierPrises (id_element_ordonnance, heure_prevue, dose, statut_prise)
                        VALUES (?, ?, ?, 0)
                    `);

                    const startDate = new Date();
                    for (let day = 0; day < m.durationDays; day++) {
                        const currentDate = new Date(startDate);
                        currentDate.setDate(startDate.getDate() + day);

                        if (m.frequencyType === 'interval' && m.intervalHours) {
                            let currHour = 8; // Start at 8 AM
                            while (currHour < 24) {
                                const d = new Date(currentDate);
                                d.setHours(currHour, 0, 0, 0);
                                pStmt.run(idElement, d.toISOString(), m.doseValue);
                                currHour += m.intervalHours;
                            }
                        } else if (m.times && m.times.length > 0) {
                            for (const timeStr of m.times) {
                                const [h, min] = timeStr.split(':').map(Number);
                                const d = new Date(currentDate);
                                d.setHours(h, min, 0, 0);
                                pStmt.run(idElement, d.toISOString(), m.doseValue);
                            }
                        }
                    }
                }
            }
            return idOrdonnance;
        });

        const newId = insertTransaction();
        res.status(201).json({ success: true, prescriptionId: newId });

    } catch (error) {
        console.error("Failed to save prescription:", error);
        res.status(500).json({ error: "Server error saving prescription", details: error instanceof Error ? error.message : "Unknown error" });
    }
});

export const prescriptionRouter = router;
