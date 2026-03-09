import { Router } from "express";
import { db } from "../db";

const router = Router();

// Login route
router.post("/login", (req, res) => {
    const { phone, type, pin } = req.body;

    try {
        // Map English frontend types to French DB types
        const typeMap: Record<string, string> = {
            standard: "Standard",
            professional: "Professionnel",
            pharmacist: "Pharmacien",
            admin: "Administrateur"
        };
        const dbType = typeMap[type] || "Standard";

        // Find the account type ID
        const typeRecord = db.prepare("SELECT id_type_compte FROM TypesComptes WHERE nom_type = ?").get(dbType) as { id_type_compte: number } | undefined;

        if (!typeRecord) {
            return res.status(400).json({ error: "Invalid account type" });
        }

        // Fetch user by phone and account type
        let user = db.prepare(`
            SELECT u.*, p.nom_complet 
            FROM Utilisateurs u 
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur 
            WHERE u.numero_telephone = ? AND u.id_type_compte = ?
        `).get(phone, typeRecord.id_type_compte) as any;

        // Special case: admin user doesn't auto-register
        if (!user && type !== 'admin') {
            // Auto-register for demo purposes (non-admin)
            const stmt = db.prepare(`
                INSERT INTO Utilisateurs (numero_telephone, id_type_compte, est_pharmacien)
                VALUES (?, ?, ?)
            `);
            const info = stmt.run(
                phone || null,
                typeRecord.id_type_compte,
                type === "pharmacist" ? 1 : 0
            );

            // Auto-create profile
            db.prepare(`INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)`).run(
                info.lastInsertRowid,
                phone ? `User ${phone.slice(-4)}` : "Nouvel Utilisateur"
            );

            user = db.prepare(`
                SELECT u.*, p.nom_complet 
                FROM Utilisateurs u 
                LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur 
                WHERE u.id_utilisateur = ?
            `).get(info.lastInsertRowid);
        }

        if (!user) {
            return res.status(401).json({ error: "Utilisateur non trouvé" });
        }

        // Phase 9: PIN Verification
        if (user.pin_hash && pin !== user.pin_hash) {
            return res.status(401).json({ error: "PIN incorrect" });
        }

        // Return user data
        res.json({
            id: user.id_utilisateur,
            email: user.email || `${type}@takymed.com`,
            phone: user.numero_telephone,
            type: type,
            name: user.nom_complet || "Utilisateur"
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export const authRouter = router;
