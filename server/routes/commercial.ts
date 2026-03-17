import { Router } from "express";
import { db } from "../db";
import { notificationProvider } from "../services/notificationProvider";

const router = Router();

// Endpoint for Commercial to register a new client with a mandatory prescription
router.post("/register-client", async (req, res) => {
    const { commercialId, clientPhone, clientName, prescription, startDate } = req.body;

    if (!commercialId || !clientPhone || !clientName || !prescription) {
        return res.status(400).json({ error: "Tous les champs sont requis (Commercial ID, Phone, Name, Prescription)" });
    }

    try {
        console.log(`[Commercial] Register attempt by User ID: ${commercialId} for ${clientPhone}`);
        const commercial = db.prepare("SELECT id_type_compte FROM Utilisateurs WHERE id_utilisateur = ?").get(commercialId) as { id_type_compte: number } | undefined;
        
        if (!commercial) {
            console.warn(`[Commercial] User ${commercialId} not found in DB`);
            return res.status(403).json({ error: "Accès refusé. Utilisateur non trouvé." });
        }
        
        if (commercial.id_type_compte !== 3) { // 3 is Commercial
            console.warn(`[Commercial] User ${commercialId} has type ${commercial.id_type_compte}, expected 3`);
            return res.status(403).json({ error: "Acces refusé. Seul un commercial peut inscrire des clients." });
        }

        const normalizedPhone = clientPhone.replace(/\s+/g, '');
        const existingUser = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?").get(normalizedPhone);

        if (existingUser) {
            return res.status(409).json({ error: "Ce numéro de téléphone est déjà associé à un compte existant." });
        }

        const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const updatedAt = new Date().toISOString();

        const insertTransaction = db.transaction(() => {
            // 1. Create User (invalid by default)
            const userStmt = db.prepare(`
                INSERT INTO Utilisateurs (numero_telephone, pin_hash, pin_expires_at, pin_updated_at, id_type_compte, id_createur, est_valide)
                VALUES (?, ?, ?, ?, 1, ?, 0)
            `);
            const userInfo = userStmt.run(normalizedPhone, generatedPin, expiresAt, updatedAt, commercialId);
            const idUtilisateur = userInfo.lastInsertRowid;

            db.prepare("INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)")
                .run(idUtilisateur, clientName);

            // 2. Create Ordonnance
            const ordStmt = db.prepare(`
                INSERT INTO Ordonnances (id_utilisateur, titre, nom_patient, poids_patient, categorie_age, date_ordonnance, date_debut) 
                VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?)
            `);
            const ordInfo = ordStmt.run(
                idUtilisateur, 
                prescription.title || "Ordonnance initiale", 
                clientName, 
                prescription.weight || 0, 
                prescription.categorieAge || 'adulte',
                startDate || null
            );
            const idOrdonnance = ordInfo.lastInsertRowid;

            // 3. Iterate each Medication
            for (const m of prescription.medications) {
                let medRecord = db.prepare("SELECT id_medicament FROM Medicaments WHERE LOWER(nom) = LOWER(?)").get(m.name) as { id_medicament: number } | undefined;

                let idMedicament;
                if (!medRecord) {
                    const mStmt = db.prepare("INSERT INTO Medicaments (nom) VALUES (?)");
                    const mInfo = mStmt.run(m.name);
                    idMedicament = mInfo.lastInsertRowid;
                } else {
                    idMedicament = medRecord.id_medicament;
                }

                // Find or insert unit ID
                let unitId = 5; // Default to 'unité'
                if (m.unit) {
                    const uRecord = db.prepare("SELECT id_unite FROM Unites WHERE LOWER(nom_unite) = LOWER(?)").get(m.unit) as { id_unite: number } | undefined;
                    if (uRecord) {
                        unitId = uRecord.id_unite;
                    } else {
                        try {
                            const uInfo = db.prepare("INSERT INTO Unites (nom_unite) VALUES (?)").run(m.unit);
                            unitId = uInfo.lastInsertRowid as number;
                        } catch (e) {
                            const uRecordRetry = db.prepare("SELECT id_unite FROM Unites WHERE LOWER(nom_unite) = LOWER(?)").get(m.unit) as { id_unite: number } | undefined;
                            if (uRecordRetry) unitId = uRecordRetry.id_unite;
                        }
                    }
                }

                const allowedFrequencies = ['matin', 'midi', 'soir'];
                const dbFrequence = allowedFrequencies.includes(m.frequencyType) ? m.frequencyType : 'personnalise';

                const eoStmt = db.prepare(`
                    INSERT INTO ElementsOrdonnance (id_ordonnance, id_medicament, type_frequence, intervalle_heures, duree_jours, dose_personnalisee, id_unite_personnalisee)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                const eoInfo = eoStmt.run(
                    idOrdonnance,
                    idMedicament,
                    dbFrequence,
                    m.intervalHours || null,
                    m.durationDays,
                    m.doseValue,
                    unitId
                );
                const idElement = eoInfo.lastInsertRowid;

                // 4. Generate CalendrierPrises Schedule
                if (m.frequencyType !== 'prn') {
                    const pStmt = db.prepare(`
                        INSERT INTO CalendrierPrises (id_element_ordonnance, heure_prevue, dose, id_unite, statut_prise)
                        VALUES (?, ?, ?, ?, 0)
                    `);

                    let baseDate: Date;
                    if (startDate && typeof startDate === 'string') {
                        const [y, mm, dd] = startDate.split('-').map(Number);
                        baseDate = new Date(y, mm - 1, dd, 12, 0, 0);
                    } else {
                        baseDate = new Date();
                        baseDate.setHours(12, 0, 0, 0);
                    }

                    for (let dayOffset = 0; dayOffset < (m.durationDays || 1); dayOffset++) {
                        const currentDate = new Date(baseDate);
                        currentDate.setDate(baseDate.getDate() + dayOffset);

                        if (m.frequencyType === 'interval' && m.intervalHours) {
                            let currHour = 8;
                            while (currHour < 24) {
                                const d = new Date(currentDate);
                                d.setHours(currHour, 0, 0, 0);
                                pStmt.run(idElement, d.toISOString(), m.doseValue, unitId);
                                currHour += m.intervalHours;
                            }
                        } else if (m.times && m.times.length > 0) {
                            for (const timeStr of m.times) {
                                const [h, min] = timeStr.split(':').map(Number);
                                const d = new Date(currentDate);
                                d.setHours(h, min, 0, 0);
                                pStmt.run(idElement, d.toISOString(), m.doseValue, unitId);
                            }
                        }
                    }
                }
            }
            return idUtilisateur;
        });

        const newUserId = insertTransaction();

        // Send PIN to Client
        await notificationProvider.sendSMS(
            normalizedPhone,
            `Bienvenue sur TAKYMED ! Pour valider votre inscription faite par votre agent, donnez-lui ce code PIN : ${generatedPin}`
        ).catch(err => console.error("SMS Warning:", err));

        res.status(201).json({ success: true, clientId: newUserId });
    } catch (error) {
        console.error("Commercial register-client error:", error);
        res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : "Erreur inconnue" });
    }
});

// Endpoint for adding a prescription to an existing client
router.post("/add-prescription", async (req, res) => {
    const { commercialId, clientId, prescription } = req.body;

    if (!commercialId || !clientId || !prescription) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    try {
        // Verify commercial ownership
        const client = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE id_utilisateur = ? AND id_createur = ?").get(clientId, commercialId);
        if (!client) {
            return res.status(403).json({ error: "Accès refusé ou client non trouvé." });
        }

        const transaction = db.transaction(() => {
            const ordInfo = db.prepare(`
                INSERT INTO Ordonnances (id_utilisateur, titre, nom_patient, poids_patient, categorie_age, date_ordonnance)
                VALUES (?, ?, (SELECT nom_complet FROM ProfilsUtilisateurs WHERE id_utilisateur = ?), ?, ?, CURRENT_DATE)
            `).run(clientId, prescription.title || "Nouvelle Ordonnance", clientId, prescription.weight || 0, prescription.categorieAge || 'adulte');
            
            const idOrdonnance = ordInfo.lastInsertRowid;

            for (const m of prescription.medications) {
                 let medRecord = db.prepare("SELECT id_medicament FROM Medicaments WHERE LOWER(nom) = LOWER(?)").get(m.name) as { id_medicament: number } | undefined;
                 let idMedicament = medRecord ? medRecord.id_medicament : db.prepare("INSERT INTO Medicaments (nom) VALUES (?)").run(m.name).lastInsertRowid;

                 const eoInfo = db.prepare(`
                    INSERT INTO ElementsOrdonnance (id_ordonnance, id_medicament, type_frequence, duree_jours, dose_personnalisee, id_unite_personnalisee)
                    VALUES (?, ?, ?, ?, ?, ?)
                 `).run(idOrdonnance, idMedicament, m.frequencyType || 'matin', m.durationDays || 7, m.doseValue || 1, 5);
                 
                 const idElement = eoInfo.lastInsertRowid;
                 
                 db.prepare(`
                    INSERT INTO CalendrierPrises (id_element_ordonnance, heure_prevue, dose, id_unite, statut_prise)
                    VALUES (?, datetime('now', '+1 day'), ?, 5, 0)
                 `).run(idElement, m.doseValue || 1);
            }
        });

        transaction();
        res.json({ success: true, message: "Ordonnance ajoutée." });
    } catch (error) {
        console.error("Commercial add-prescription error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint for Commercial to validate a client using the PIN the client received
router.post("/validate-client", async (req, res) => {
    const { commercialId, clientPhone, pin } = req.body;

    try {
        const user = db.prepare(`
            SELECT id_utilisateur, pin_hash, est_valide 
            FROM Utilisateurs 
            WHERE numero_telephone = ? AND id_createur = ?
        `).get(clientPhone, commercialId) as { id_utilisateur: number; pin_hash: string; est_valide: number } | undefined;

        if (!user) {
            return res.status(404).json({ error: "Client non trouvé ou non créé par vous." });
        }

        if (user.est_valide === 1) {
            return res.status(400).json({ error: "Ce client est déjà validé." });
        }

        if (user.pin_hash !== pin) {
            return res.status(401).json({ error: "Code PIN incorrect." });
        }

        db.prepare("UPDATE Utilisateurs SET est_valide = 1 WHERE id_utilisateur = ?").run(user.id_utilisateur);

        res.json({ success: true, message: "Compte client validé avec succès." });
    } catch (error) {
        console.error("Commercial validate-client error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// List clients for a commercial user with prescription and reminder counts
router.get("/clients", (req, res) => {
    const commercialId = req.query.commercialId;
    if (!commercialId) return res.status(400).json({ error: "Commercial ID requis" });

    try {
        const clients = db.prepare(`
            SELECT u.id_utilisateur as id, u.numero_telephone as phone, p.nom_complet as name, 
                   u.est_valide as isValid, u.cree_le as createdAt,
                   (SELECT COUNT(*) FROM Ordonnances WHERE id_utilisateur = u.id_utilisateur) as prescriptionCount,
                   (SELECT COUNT(cp.id_calendrier_prise) FROM CalendrierPrises cp 
                    JOIN ElementsOrdonnance eo ON cp.id_element_ordonnance = eo.id_element_ordonnance
                    JOIN Ordonnances o ON eo.id_ordonnance = o.id_ordonnance
                    WHERE o.id_utilisateur = u.id_utilisateur) as reminderCount
            FROM Utilisateurs u
            JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            WHERE u.id_createur = ?
            ORDER BY u.cree_le DESC
        `).all(commercialId);

        res.json({ clients });
    } catch (error) {
        console.error("Commercial get-clients error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to update client name
router.patch("/clients/:id", (req, res) => {
    const { id } = req.params;
    const { commercialId, name } = req.body;

    if (!commercialId || !name) {
        return res.status(400).json({ error: "Commercial ID et nom requis" });
    }

    try {
        const result = db.prepare(`
            UPDATE ProfilsUtilisateurs 
            SET nom_complet = ? 
            WHERE id_utilisateur = ? 
            AND id_utilisateur IN (SELECT id_utilisateur FROM Utilisateurs WHERE id_createur = ?)
        `).run(name, id, commercialId);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Client non trouvé ou non autorisé." });
        }
        res.json({ success: true, message: "Nom du client mis à jour." });
    } catch (error) {
        console.error("Commercial update-client error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to delete a client (used for cancellation before validation)
router.delete("/clients/:id", (req, res) => {
    const { id } = req.params;
    const finalCommercialId = (req.body && req.body.commercialId) || req.query.commercialId;

    if (!finalCommercialId) {
        return res.status(400).json({ error: "Commercial ID requis" });
    }

    try {
        // We allow deleting any client created by this commercial
        const result = db.prepare("DELETE FROM Utilisateurs WHERE id_utilisateur = ? AND id_createur = ?").run(id, finalCommercialId);
        if (result.changes === 0) {
            return res.status(404).json({ error: "Client non trouvé ou non autorisé." });
        }
        res.json({ success: true, message: "Client supprimé." });
    } catch (error) {
        console.error("Commercial delete-client error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export const commercialRouter = router;
