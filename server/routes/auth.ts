import { Router } from "express";
import { db } from "../db";

const router = Router();

const typeMap: Record<string, string> = {
  standard: "Standard",
  professional: "Professionnel",
  pharmacist: "Pharmacien",
  admin: "Administrateur",
};

const reverseTypeMap: Record<string, "standard" | "professional" | "pharmacist" | "admin"> = {
  Standard: "standard",
  Professionnel: "professional",
  Pharmacien: "pharmacist",
  Administrateur: "admin",
};

// Login route
router.post("/login", (req, res) => {
  const { phone, type, pin } = req.body;

  try {
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    let user: any;
    let frontendType: "standard" | "professional" | "pharmacist" | "admin" = "standard";

    if (type) {
      const dbType = typeMap[type] || "Standard";
      const typeRecord = db
        .prepare("SELECT id_type_compte, nom_type FROM TypesComptes WHERE nom_type = ?")
        .get(dbType) as { id_type_compte: number; nom_type: string } | undefined;

      if (!typeRecord) {
        return res.status(400).json({ error: "Invalid account type" });
      }

      frontendType = reverseTypeMap[typeRecord.nom_type] || "standard";

      user = db
        .prepare(
          `
            SELECT u.*, p.nom_complet, tc.nom_type
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            WHERE u.numero_telephone = ? AND u.id_type_compte = ?
          `,
        )
        .get(normalizedPhone, typeRecord.id_type_compte);
    } else {
      user = db
        .prepare(
          `
            SELECT u.*, p.nom_complet, tc.nom_type
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            WHERE u.numero_telephone = ?
          `,
        )
        .get(normalizedPhone);

      if (user?.nom_type) {
        frontendType = reverseTypeMap[user.nom_type] || "standard";
      }
    }

    if (!user && normalizedPhone !== "admin") {
      const standardType = db
        .prepare("SELECT id_type_compte, nom_type FROM TypesComptes WHERE nom_type = 'Standard'")
        .get() as { id_type_compte: number; nom_type: string } | undefined;

      if (!standardType) {
        return res.status(500).json({ error: "Missing standard account type" });
      }

      const info = db
        .prepare(
          `
            INSERT INTO Utilisateurs (numero_telephone, id_type_compte, est_pharmacien)
            VALUES (?, ?, 0)
          `,
        )
        .run(normalizedPhone, standardType.id_type_compte);

      db.prepare(`INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)`).run(
        info.lastInsertRowid,
        `User ${normalizedPhone.slice(-4)}`,
      );

      user = db
        .prepare(
          `
            SELECT u.*, p.nom_complet, tc.nom_type
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            WHERE u.id_utilisateur = ?
          `,
        )
        .get(info.lastInsertRowid);

      frontendType = "standard";
    }

    if (!user) {
      return res.status(401).json({ error: "Utilisateur non trouvé" });
    }

    if (user.pin_hash && pin !== user.pin_hash) {
      return res.status(401).json({ error: "PIN incorrect" });
    }

    res.json({
      id: user.id_utilisateur,
      email: user.email || `${frontendType}@takymed.com`,
      phone: user.numero_telephone,
      type: frontendType,
      name: user.nom_complet || "Utilisateur",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const authRouter = router;
