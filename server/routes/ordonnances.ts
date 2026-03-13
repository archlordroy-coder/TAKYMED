import { Router } from "express";
import { db } from "../db";

const router = Router();

// Get all ordonnances for a user with stats
router.get("/", (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
    }

    try {
        const ordonnances = db.prepare(`
            SELECT 
                o.id_ordonnance as id,
                o.titre,
                o.nom_patient,
                o.poids_patient,
                o.categorie_age,
                o.date_ordonnance,
                o.est_active,
                COUNT(DISTINCT eo.id_element_ordonnance) as nombre_medicaments,
                COUNT(cp.id_calendrier_prise) as prises_totales,
                SUM(CASE WHEN cp.statut_prise = 1 THEN 1 ELSE 0 END) as prises_effectuees
            FROM Ordonnances o
            LEFT JOIN ElementsOrdonnance eo ON o.id_ordonnance = eo.id_ordonnance
            LEFT JOIN CalendrierPrises cp ON eo.id_element_ordonnance = cp.id_element_ordonnance
            WHERE o.id_utilisateur = ?
            GROUP BY o.id_ordonnance
            ORDER BY o.date_ordonnance DESC
        `).all(userId);

        res.json({ ordonnances });
    } catch (error) {
        console.error("Failed to fetch ordonnances:", error);
        res.status(500).json({ error: "Failed to fetch ordonnances" });
    }
});

// Get single ordonnance details with medicaments and rappels
router.get("/:id", (req, res) => {
    const { id } = req.params;

    try {
        const ordonnance = db.prepare(`
            SELECT 
                o.id_ordonnance as id,
                o.titre,
                o.nom_patient,
                o.poids_patient,
                o.categorie_age,
                o.date_ordonnance,
                o.est_active
            FROM Ordonnances o
            WHERE o.id_ordonnance = ?
        `).get(id);

        if (!ordonnance) {
            return res.status(404).json({ error: "Ordonnance not found" });
        }

        const medicaments = db.prepare(`
            SELECT 
                eo.id_element_ordonnance as id,
                m.nom as medicament,
                eo.dose_personnalisee as dose,
                eo.type_frequence,
                eo.intervalle_heures,
                eo.duree_jours
            FROM ElementsOrdonnance eo
            JOIN Medicaments m ON eo.id_medicament = m.id_medicament
            WHERE eo.id_ordonnance = ?
        `).all(id);

        // Get upcoming rappels (prises non effectuées)
        const rappels = db.prepare(`
            SELECT 
                cp.id_calendrier_prise as id,
                m.nom as medicament,
                eo.dose_personnalisee as dose,
                cp.heure_prevue,
                cp.statut_prise
            FROM CalendrierPrises cp
            JOIN ElementsOrdonnance eo ON cp.id_element_ordonnance = eo.id_element_ordonnance
            JOIN Medicaments m ON eo.id_medicament = m.id_medicament
            WHERE eo.id_ordonnance = ?
            ORDER BY cp.heure_prevue ASC
            LIMIT 20
        `).all(id);

        res.json({ ordonnance, medicaments, rappels });
    } catch (error) {
        console.error("Failed to fetch ordonnance:", error);
        res.status(500).json({ error: "Failed to fetch ordonnance" });
    }
});

// Update ordonnance
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { titre, nom_patient, poids_patient, categorie_age } = req.body;

    console.log("Updating ordonnance:", id, { titre, nom_patient, poids_patient, categorie_age });

    try {
        const result = db.prepare(`
            UPDATE Ordonnances 
            SET titre = ?, nom_patient = ?, poids_patient = ?, categorie_age = ?
            WHERE id_ordonnance = ?
        `).run(titre || null, nom_patient || null, poids_patient || null, categorie_age || 'adulte', id);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Ordonnance not found" });
        }

        res.json({ success: true, message: "Ordonnance mise à jour" });
    } catch (error) {
        console.error("Failed to update ordonnance:", error);
        res.status(500).json({ error: "Failed to update ordonnance" });
    }
});

// Cancel an ordonnance
router.patch("/:id/cancel", (req, res) => {
    const { id } = req.params;

    try {
        const result = db.prepare(`
            UPDATE Ordonnances 
            SET est_active = 0 
            WHERE id_ordonnance = ?
        `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Ordonnance not found" });
        }

        res.json({ success: true, message: "Ordonnance annulée" });
    } catch (error) {
        console.error("Failed to cancel ordonnance:", error);
        res.status(500).json({ error: "Failed to cancel ordonnance" });
    }
});

export const ordonnanceRouter = router;
