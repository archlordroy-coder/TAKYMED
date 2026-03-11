import { Router } from "express";
import { db } from "../db";

const router = Router();

// Get all medications from the database with optional search and date filtering
router.get("/", (req, res) => {
    try {
        const isNewOnly = req.query.new === 'true';
        const searchQuery = req.query.q as string;

        let sql = `
            SELECT id_medicament as id, nom as name, description, photo_url as photoUrl, 
                   prix as price, date_ajout as dateAdded, type_utilisation as type, 
                   precaution_alimentaire as precautions
            FROM Medicaments
        `;
        const params: any[] = [];
        const whereClauses: string[] = [];

        if (isNewOnly) {
            whereClauses.push(`strftime('%m', date_ajout) = strftime('%m', 'now') AND strftime('%Y', date_ajout) = strftime('%Y', 'now')`);
        }

        if (searchQuery) {
            whereClauses.push(`(nom LIKE ? OR description LIKE ?)`);
            params.push(`%${searchQuery}%`, `%${searchQuery}%`);
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE ` + whereClauses.join(" AND ");
        }

        const medications = db.prepare(sql + " ORDER BY nom ASC").all(...params);
        res.json({ medications });
    } catch (error) {
        console.error("Failed to fetch medications:", error);
        res.status(500).json({ error: "Server error fetching medications" });
    }
});

// Register a new medication (Pharmacist only)
router.post("/", (req, res) => {
    const { name, description, photoUrl, price, typeUtilisation } = req.body;
    if (!name) return res.status(400).json({ error: "Medication name is required" });

    try {
        const info = db.prepare(`
            INSERT INTO Medicaments (nom, description, photo_url, prix, type_utilisation, date_ajout)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(name, description || '', photoUrl || '', price || '', typeUtilisation || 'comprime');

        res.status(201).json({ success: true, medicationId: info.lastInsertRowid });
    } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: "Ce médicament existe déjà dans la base de données." });
        }
        console.error("Failed to register medication:", error);
        res.status(500).json({ error: "Server error registering medication" });
    }
});

// Get all medication interactions
router.get("/interactions", (req, res) => {
    try {
        const interactions = db.prepare(`
            SELECT 
                i.id_interaction as id,
                m1.nom as med1Name,
                m2.nom as med2Name,
                i.niveau_risque as riskLevel,
                i.description
            FROM InteractionsMedicaments i
            JOIN Medicaments m1 ON i.medicament_source = m1.id_medicament
            JOIN Medicaments m2 ON i.medicament_interdit = m2.id_medicament
        `).all();
        res.json({ interactions });
    } catch (error) {
        console.error("Failed to fetch interactions:", error);
        res.status(500).json({ error: "Server error fetching interactions" });
    }
});

// Add a new medication interaction
router.post("/interactions", (req, res) => {
    const { medicamentSourceId, medicamentInterditId, riskLevel, description } = req.body;
    if (!medicamentSourceId || !medicamentInterditId) {
        return res.status(400).json({ error: "Source and Interdit medication IDs are required" });
    }

    try {
        const info = db.prepare(`
            INSERT INTO InteractionsMedicaments (medicament_source, medicament_interdit, niveau_risque, description)
            VALUES (?, ?, ?, ?)
        `).run(medicamentSourceId, medicamentInterditId, riskLevel || 'modere', description || '');

        res.status(201).json({ success: true, interactionId: info.lastInsertRowid });
    } catch (error) {
        console.error("Failed to add interaction:", error);
        res.status(500).json({ error: "Server error adding interaction" });
    }
});

export const medicationRouter = router;
