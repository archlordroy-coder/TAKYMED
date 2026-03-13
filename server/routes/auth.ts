import { Router } from "express";
import { db } from "../db";

const router = Router();

const typeMap: Record<string, string> = {
  standard: "Standard",
  professional: "Professionnel",
  pharmacist: "Pharmacien",
  admin: "Administrateur",
};

const reverseTypeMap: Record<
  string,
  "standard" | "professional" | "pharmacist" | "admin"
> = {
  Standard: "standard",
  Professionnel: "professional",
  Pharmacien: "pharmacist",
  Administrateur: "admin",
};

router.get("/account-types", (_req, res) => {
  try {
    const types = db
      .prepare(
        `
          SELECT
            tc.id_type_compte as id,
            tc.nom_type as name,
            tc.description as description,
            tc.necessite_paiement as requiresPayment,
            COALESCE(f.montant, 0) as price,
            COALESCE(f.devise, 'FCFA') as currency
          FROM TypesComptes tc
          LEFT JOIN FraisComptesProfessionnels f ON tc.id_type_compte = f.id_type_compte
          WHERE tc.nom_type <> 'Administrateur'
          ORDER BY tc.id_type_compte ASC
        `,
      )
      .all();

    res.json({ types });
  } catch (error) {
    console.error("Account types error:", error);
    res.status(500).json({ error: "Failed to fetch account types" });
  }
});

router.post("/register", (req, res) => {
  const { phone, pin } = req.body;

  try {
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    const normalizedPin = typeof pin === "string" ? pin.trim() : "";
    // Force Standard account type - upgrades are handled by admin
    const dbType = "Standard";

    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    if (!normalizedPin) {
      return res.status(400).json({ error: "PIN is required" });
    }

    const existingUser = db
      .prepare(
        "SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?",
      )
      .get(normalizedPhone);

    if (existingUser) {
      return res.status(409).json({ error: "Ce numéro est déjà utilisé" });
    }

    const typeRecord = db
      .prepare(
        "SELECT id_type_compte, nom_type FROM TypesComptes WHERE nom_type = ?",
      )
      .get(dbType) as { id_type_compte: number; nom_type: string } | undefined;

    if (!typeRecord) {
      return res.status(400).json({ error: "Invalid account type" });
    }

    const info = db
      .prepare(
        `
          INSERT INTO Utilisateurs (numero_telephone, pin_hash, id_type_compte, est_pharmacien)
          VALUES (?, ?, ?, ?)
        `,
      )
      .run(
        normalizedPhone,
        normalizedPin,
        typeRecord.id_type_compte,
        typeRecord.nom_type === "Pharmacien" ? 1 : 0,
      );

    db.prepare(
      "INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)",
    ).run(info.lastInsertRowid, `User ${normalizedPhone.slice(-4)}`);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login route
router.post("/login", (req, res) => {
  const { phone, type, pin } = req.body;

  try {
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    let user: any;
    let frontendType: "standard" | "professional" | "pharmacist" | "admin" =
      "standard";
    let typeRecord: { id_type_compte: number; nom_type: string } | undefined;

    if (type) {
      const dbType = typeMap[type] || "Standard";
      typeRecord = db
        .prepare(
          "SELECT id_type_compte, nom_type FROM TypesComptes WHERE nom_type = ?",
        )
        .get(dbType) as
        | { id_type_compte: number; nom_type: string }
        | undefined;

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
      // Get the standard type as fallback
      const standardType = db
        .prepare(
          "SELECT id_type_compte, nom_type FROM TypesComptes WHERE nom_type = 'Standard'",
        )
        .get() as { id_type_compte: number; nom_type: string } | undefined;

      const accountType = typeRecord || standardType;
      if (!accountType) {
        return res.status(500).json({ error: "Missing account type" });
      }

      const info = db
        .prepare(
          `
            INSERT INTO Utilisateurs (numero_telephone, id_type_compte, est_pharmacien)
            VALUES (?, ?, ?)
          `,
        )
        .run(normalizedPhone, accountType.id_type_compte, accountType.nom_type === "Pharmacien" ? 1 : 0);

      db.prepare(
        `INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)`,
      ).run(info.lastInsertRowid, `User ${normalizedPhone.slice(-4)}`);

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

      frontendType = reverseTypeMap[user.nom_type] || "standard";
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

// Request account upgrade
router.post("/upgrade-request", (req, res) => {
  const { requestedType } = req.body;
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  if (!requestedType || !["Professionnel", "Pharmacien"].includes(requestedType)) {
    return res.status(400).json({ error: "Type de compte invalide" });
  }

  try {
    // Check if user already has a pending request
    const existingRequest = db
      .prepare(
        "SELECT * FROM UpgradeRequests WHERE id_utilisateur = ? AND status = 'pending'"
      )
      .get(userId as string);

    if (existingRequest) {
      return res.status(400).json({ error: "Vous avez déjà une demande en attente" });
    }

    // Create upgrade request
    db.prepare(
      "INSERT INTO UpgradeRequests (id_utilisateur, requested_type) VALUES (?, ?)"
    ).run(userId, requestedType);

    res.json({ success: true, message: "Demande envoyée avec succès" });
  } catch (error) {
    console.error("Upgrade request error:", error);
    res.status(500).json({ error: "Erreur lors de la demande" });
  }
});

export const authRouter = router;
