import { Router } from "express";
import { db } from "../db";
import { z } from "zod";

const router = Router();

const medicationSchema = z.object({
    name: z.string().trim().min(2).max(255),
    unitId: z.number().int().nullable().optional(),
    defaultDose: z.number().nonnegative().nullable().optional(),
    description: z.string().max(2000).optional().default(""),
    photoUrl: z.string().max(2000000).optional().default(""),
    price: z.string().max(50).optional().default(""),
    typeUtilisation: z.enum(["comprime", "sirop", "gelule", "pommade", "goutte", "spray", "injection"]).optional().default("comprime"),
    precautionAlimentaire: z.enum(["aucune", "eviter_alcool", "boire_beaucoup_eau", "eviter_produits_laitiers", "eviter_pamplemousse"]).optional().default("aucune"),
    posology: z.object({
        categorieAge: z.enum(["bébé", "enfant", "adulte"]),
        doseRecommandee: z.number().nonnegative(),
        unitId: z.number().int().optional(),
    }).optional(),
});

// Middleware to check if user is admin (simplified for demo)
router.use((req, res, next) => {
    // In a real app, we'd check req.user.role === 'admin'
    // For now, we allow access but we could filter by id_utilisateur = 1 or something
    next();
});

// Global system statistics
router.get("/stats", (_req, res) => {
    try {
        const userCount = db.prepare("SELECT COUNT(*) as count FROM Utilisateurs").get() as { count: number };
        const prescriptionCount = db.prepare("SELECT COUNT(*) as count FROM Ordonnances").get() as { count: number };
        const medicationCount = db.prepare("SELECT COUNT(*) as count FROM Medicaments").get() as { count: number };
        const pharmacyCount = db.prepare("SELECT COUNT(*) as count FROM Pharmacies").get() as { count: number };

        const latestUsers = db.prepare(`
            SELECT u.id_utilisateur as id, u.cree_le as createdAt, COALESCE(p.nom_complet, u.numero_telephone, 'Utilisateur') as label
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON p.id_utilisateur = u.id_utilisateur
            ORDER BY u.id_utilisateur DESC
            LIMIT 2
        `).all() as { id: number; createdAt?: string; label: string }[];

        const latestPrescriptions = db.prepare(`
            SELECT id_ordonnance as id, date_ordonnance as createdAt, COALESCE(titre, 'Ordonnance') as label
            FROM Ordonnances
            ORDER BY id_ordonnance DESC
            LIMIT 2
        `).all() as { id: number; createdAt?: string; label: string }[];

        const latestPharmacies = db.prepare(`
            SELECT id_pharmacie as id, nom_pharmacie as label, adresse as createdAt
            FROM Pharmacies
            ORDER BY id_pharmacie DESC
            LIMIT 2
        `).all() as { id: number; createdAt?: string; label: string }[];

        const recentActivity = [
            ...latestUsers.map((u) => ({ id: `u-${u.id}`, type: "user", message: `Nouveau compte: ${u.label}`, time: u.createdAt || "Récent" })),
            ...latestPrescriptions.map((o) => ({ id: `o-${o.id}`, type: "prescription", message: `Ordonnance: ${o.label}`, time: o.createdAt || "Récent" })),
            ...latestPharmacies.map((p) => ({ id: `p-${p.id}`, type: "pharmacy", message: `Pharmacie: ${p.label}`, time: p.createdAt || "Récent" })),
        ].slice(0, 6);

        res.json({
            users: userCount.count,
            prescriptions: prescriptionCount.count,
            medications: medicationCount.count,
            pharmacies: pharmacyCount.count,
            recentActivity
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch admin stats" });
    }
});

// List all users with their account types
router.get("/users", (_req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.id_utilisateur as id, u.email, u.numero_telephone as phone, tc.nom_type as type, p.nom_complet as name
            FROM Utilisateurs u
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            ORDER BY u.id_utilisateur DESC
        `).all();
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Update user type
router.put("/users/:id", (req, res) => {
    const { id } = req.params;
    const { id_type_compte } = req.body;
    try {
        db.prepare("UPDATE Utilisateurs SET id_type_compte = ? WHERE id_utilisateur = ?").run(id_type_compte, id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update user" });
    }
});

// Delete user
router.delete("/users/:id", (req, res) => {
    const { id } = req.params;
    try {
        // Simple delete - in real app would handle cascades or soft delete
        db.prepare("DELETE FROM Utilisateurs WHERE id_utilisateur = ?").run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// Medications management
router.get("/medications", (_req, res) => {
    try {
        const medications = db.prepare(`
            SELECT id_medicament as id, nom as name, id_unite_par_defaut as unitId, dose_par_defaut as defaultDose,
                   description, photo_url as photoUrl, prix as price, type_utilisation as typeUtilisation,
                   precaution_alimentaire as precautionAlimentaire
            FROM Medicaments
            ORDER BY nom ASC
        `).all();
        res.json({ medications });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch medications" });
    }
});

// Get single medication by ID
router.get("/medications/:id", (req, res) => {
    const { id } = req.params;
    try {
        const medication = db.prepare(`
            SELECT id_medicament as id, nom as name, id_unite_par_defaut as unitId, dose_par_defaut as defaultDose,
                   description, photo_url as photoUrl, prix as price, type_utilisation as typeUtilisation,
                   precaution_alimentaire as precautionAlimentaire
            FROM Medicaments
            WHERE id_medicament = ?
        `).get(id);

        if (!medication) {
            return res.status(404).json({ error: "Medication not found" });
        }

        res.json({ medication });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch medication" });
    }
});

// Add medication
router.post("/medications", (req, res) => {
    const parsed = medicationSchema.safeParse({
        ...req.body,
        unitId: req.body?.unitId !== undefined && req.body?.unitId !== null ? Number(req.body.unitId) : null,
        defaultDose: req.body?.defaultDose !== undefined && req.body?.defaultDose !== null ? Number(req.body.defaultDose) : null,
        posology: req.body?.posology
            ? {
                ...req.body.posology,
                doseRecommandee: Number(req.body.posology.doseRecommandee),
                unitId: req.body.posology.unitId !== undefined ? Number(req.body.posology.unitId) : undefined,
            }
            : undefined,
    });

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid medication payload" });
    }

    const { name, unitId, defaultDose, description, photoUrl, price, typeUtilisation, precautionAlimentaire, posology } = parsed.data;

    try {
        const insertTx = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO Medicaments
                (nom, id_unite_par_defaut, dose_par_defaut, description, photo_url, prix, type_utilisation, precaution_alimentaire)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(name, unitId, defaultDose, description, photoUrl, price, typeUtilisation, precautionAlimentaire);

            const medicationId = Number(result.lastInsertRowid);

            if (posology) {
                db.prepare(`
                    INSERT INTO PosologieDefautMedicaments (id_medicament, categorie_age, dose_recommandee, id_unite)
                    VALUES (?, ?, ?, ?)
                `).run(medicationId, posology.categorieAge, posology.doseRecommandee, posology.unitId ?? unitId ?? null);
            }

            return medicationId;
        });

        const id = insertTx();
        res.status(201).json({ id });
    } catch (error) {
        res.status(500).json({ error: "Failed to create medication" });
    }
});

// Update medication
router.put("/medications/:id", (req, res) => {
    const { id } = req.params;
    const parsed = medicationSchema.safeParse({
        ...req.body,
        unitId: req.body?.unitId !== undefined && req.body?.unitId !== null ? Number(req.body.unitId) : null,
        defaultDose: req.body?.defaultDose !== undefined && req.body?.defaultDose !== null ? Number(req.body.defaultDose) : null,
        posology: req.body?.posology
            ? {
                ...req.body.posology,
                doseRecommandee: Number(req.body.posology.doseRecommandee),
                unitId: req.body.posology.unitId !== undefined ? Number(req.body.posology.unitId) : undefined,
            }
            : undefined,
    });

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid medication payload" });
    }

    const { name, unitId, defaultDose, description, photoUrl, price, typeUtilisation, precautionAlimentaire, posology } = parsed.data;
    try {
        const updateTx = db.transaction(() => {
            db.prepare(`
                UPDATE Medicaments
                SET nom = ?, id_unite_par_defaut = ?, dose_par_defaut = ?, description = ?, photo_url = ?, prix = ?,
                    type_utilisation = ?, precaution_alimentaire = ?
                WHERE id_medicament = ?
            `).run(name, unitId, defaultDose, description, photoUrl, price, typeUtilisation, precautionAlimentaire, id);

            if (posology) {
                db.prepare("DELETE FROM PosologieDefautMedicaments WHERE id_medicament = ? AND categorie_age = ?")
                    .run(id, posology.categorieAge);
                db.prepare(`
                    INSERT INTO PosologieDefautMedicaments (id_medicament, categorie_age, dose_recommandee, id_unite)
                    VALUES (?, ?, ?, ?)
                `).run(id, posology.categorieAge, posology.doseRecommandee, posology.unitId ?? unitId ?? null);
            }
        });

        updateTx();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update medication" });
    }
});

// Delete medication
router.delete("/medications/:id", (req, res) => {
    const { id } = req.params;
    try {
        db.prepare("DELETE FROM Medicaments WHERE id_medicament = ?").run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete medication" });
    }
});

// Account Types Settings (join with FraisComptesProfessionnels for pricing)
router.get("/settings", (_req, res) => {
    try {
        const types = db.prepare(`
            SELECT tc.id_type_compte as id, tc.nom_type as name, tc.description,
                   tc.max_ordonnances as maxOrdonnances, tc.max_rappels as maxRappels,
                   COALESCE(f.montant, 0) as price, COALESCE(f.devise, 'FCFA') as currency
            FROM TypesComptes tc
            LEFT JOIN FraisComptesProfessionnels f ON tc.id_type_compte = f.id_type_compte
            ORDER BY tc.id_type_compte ASC
        `).all();
        res.json({ types });
    } catch (error) {
        console.error("Settings fetch error:", error);
        res.status(500).json({ error: "Failed to fetch settings" });
    }
});

router.put("/settings/:id", (req, res) => {
    const { id } = req.params;
    const { price, description, maxOrdonnances, maxRappels } = req.body;
    try {
        // Update description and limits in TypesComptes
        db.prepare("UPDATE TypesComptes SET description = ?, max_ordonnances = ?, max_rappels = ? WHERE id_type_compte = ?")
            .run(description, maxOrdonnances, maxRappels, id);
        // Upsert pricing in FraisComptesProfessionnels
        db.prepare(`
            INSERT INTO FraisComptesProfessionnels (id_type_compte, montant, devise)
            VALUES (?, ?, 'FCFA')
            ON CONFLICT(id_type_compte) DO UPDATE SET montant = excluded.montant
        `).run(id, price);
        res.json({ success: true });
    } catch (error) {
        console.error("Settings update error:", error);
        res.status(500).json({ error: "Failed to update settings" });
    }
});

// List all pharmacies
router.get("/pharmacies", (_req, res) => {
    try {
        const pharmacies = db.prepare(`
            SELECT p.id_pharmacie as id, p.nom_pharmacie as name, p.adresse as address, p.telephone as phone, 
                   COUNT(sp.id_medicament) as stockCount, u.nom_complet as ownerName
            FROM Pharmacies p
            LEFT JOIN StockMedicamentsPharmacie sp ON p.id_pharmacie = sp.id_pharmacie
            LEFT JOIN ProfilsUtilisateurs u ON p.id_pharmacien = u.id_utilisateur
            GROUP BY p.id_pharmacie
            ORDER BY p.id_pharmacie DESC
        `).all();
        res.json({ pharmacies });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch pharmacies" });
    }
});

export const adminRouter = router;
