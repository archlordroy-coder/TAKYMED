import { Router } from "express";
import { db } from "../db";

const router = Router();

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

        res.json({
            users: userCount.count,
            prescriptions: prescriptionCount.count,
            medications: medicationCount.count,
            pharmacies: pharmacyCount.count,
            recentActivity: [
                { id: 1, type: 'user', message: "Nouvel utilisateur inscrit", time: "2 min ago" },
                { id: 2, type: 'prescription', message: "Nouvelle ordonnance créée", time: "15 min ago" },
                { id: 3, type: 'pharmacy', message: "Pharmacie 'Santé+' mise à jour", time: "1h ago" }
            ]
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
            SELECT id_medicament as id, nom as name, id_unite_par_defaut as unitId, dose_par_defaut as defaultDose
            FROM Medicaments
            ORDER BY nom ASC
        `).all();
        res.json({ medications });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch medications" });
    }
});

// Add medication
router.post("/medications", (req, res) => {
    const { name, unitId, defaultDose } = req.body;
    try {
        const result = db.prepare("INSERT INTO Medicaments (nom, id_unite_par_defaut, dose_par_defaut) VALUES (?, ?, ?)")
            .run(name, unitId, defaultDose);
        res.status(201).json({ id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: "Failed to create medication" });
    }
});

// Update medication
router.put("/medications/:id", (req, res) => {
    const { id } = req.params;
    const { name, unitId, defaultDose } = req.body;
    try {
        db.prepare("UPDATE Medicaments SET nom = ?, id_unite_par_defaut = ?, dose_par_defaut = ? WHERE id_medicament = ?")
            .run(name, unitId, defaultDose, id);
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
