import { Router } from "express";
import { db } from "../db";
import { notificationProvider } from "../services/notificationProvider";

const router = Router();

const typeMap: Record<string, string> = {
  standard: "Standard",
  professional: "Professionnel",
  pro: "Professionnel",
  pharmacist: "Professionnel",
  pharmacy: "Professionnel",
  admin: "Administrateur",
};

const reverseTypeMap: Record<
  string,
  "standard" | "professional" | "admin"
> = {
  Standard: "standard",
  Professionnel: "professional",
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
            tc.max_pharmacies as maxPharmacies,
            tc.max_ordonnances as maxOrdonnances,
            tc.max_rappels as maxNotifications,
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

// Register route
router.post("/register", async (req, res) => {
  const { phone, type } = req.body;

  try {
    const normalizedPhone = typeof phone === "string" ? phone.replace(/\s+/g, '') : "";
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    const existingUser = db
      .prepare(
        "SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?",
      )
      .get(normalizedPhone);

    if (existingUser) {
      return res.status(409).json({ error: "Ce numéro est déjà utilisé" });
    }

    const dbType = typeMap[type] || "Standard";
    const typeRecord = db
      .prepare(
        "SELECT id_type_compte, nom_type FROM TypesComptes WHERE nom_type = ?",
      )
      .get(dbType) as { id_type_compte: number; nom_type: string } | undefined;

    if (!typeRecord) {
      return res.status(400).json({ error: "Invalid account type" });
    }

    // Generate a random PIN for the new user
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const updatedAt = new Date().toISOString();

    const info = db
      .prepare(
        `
          INSERT INTO Utilisateurs (numero_telephone, pin_hash, pin_expires_at, pin_updated_at, id_type_compte, est_pharmacien)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        normalizedPhone,
        generatedPin,
        expiresAt,
        updatedAt,
        typeRecord.id_type_compte,
        0,
      );

    db.prepare(
      "INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)",
    ).run(info.lastInsertRowid, `User ${normalizedPhone.slice(-4)}`);

    // Send the PIN via SMS
    try {
      await notificationProvider.sendSMS(
        normalizedPhone,
        `Bienvenue sur TAKYMED ! Votre code PIN de connexion est : ${generatedPin}. Gardez-le précieusement.`
      );
    } catch (smsError) {
      console.error("Failed to send registration SMS:", smsError);
      // We don't block registration if SMS fails, but we log it
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("❌ Register error for phone:", phone, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get PIN info endpoint
router.get("/pin-info", async (req, res) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  try {
    const user = db
      .prepare("SELECT pin_expires_at FROM Utilisateurs WHERE id_utilisateur = ?")
      .get(userId as string) as { pin_expires_at: string | null } | undefined;

    if (!user) {
      return res.status(401).json({ error: "Session invalide ou utilisateur non trouvé. Veuillez vous reconnecter." });
    }

    res.json({
      expiresAt: user.pin_expires_at
    });
  } catch (error) {
    console.error("PIN info error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des informations PIN" });
  }
});

// Regenerate PIN endpoint
router.post("/regenerate-pin", async (req, res) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  try {
    // Get user info
    const user = db
      .prepare("SELECT numero_telephone, id_utilisateur FROM Utilisateurs WHERE id_utilisateur = ?")
      .get(userId as string) as { numero_telephone: string; id_utilisateur: number } | undefined;

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Generate new PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const updatedAt = new Date().toISOString();

    // Update PIN in database
    db.prepare(`
      UPDATE Utilisateurs
      SET pin_hash = ?, pin_expires_at = ?, pin_updated_at = ?
      WHERE id_utilisateur = ?
    `).run(newPin, expiresAt, updatedAt, userId);

    // Send SMS with new PIN
    try {
      await notificationProvider.sendSMS(
        user.numero_telephone,
        `🔐 Nouveau PIN TAKYMED : ${newPin}\nValable 30 jours. Conservez-le précieusement.`
      );
    } catch (smsError) {
      console.error("Failed to send PIN regeneration SMS:", smsError);
      // Don't block regeneration if SMS fails
    }

    res.json({
      success: true,
      expiresAt: expiresAt,
      message: "Nouveau PIN généré et envoyé par SMS"
    });
  } catch (error) {
    console.error("PIN regeneration error:", error);
    res.status(500).json({ error: "Erreur lors de la régénération du PIN" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { phone, type, pin } = req.body;

  try {
    const normalizedPhone = typeof phone === "string" ? phone.replace(/\s+/g, '') : "";
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Le numéro de téléphone est requis" });
    }

    if (!pin) {
      return res.status(400).json({ error: "Le PIN est requis" });
    }

    let user: any;
    let frontendType: "standard" | "professional" | "pharmacist" | "admin" = "standard";

    // Find user by phone first to be flexible with account type changes
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

    // Special case for admin login (development/fallback)
    if (normalizedPhone === "admin") {
      const adminUser = db
        .prepare(
          `
            SELECT u.*, p.nom_complet, tc.nom_type
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            WHERE u.numero_telephone = 'admin'
          `,
        )
        .get() as any;

      if (adminUser && pin === adminUser.pin_hash) {
        return res.json({
          id: adminUser.id_utilisateur,
          email: adminUser.email || "admin@takymed.com",
          phone: adminUser.numero_telephone,
          type: "admin",
          name: adminUser.nom_complet || "Admin",
        });
      }
      
      return res.status(401).json({ error: "PIN incorrect" });
    }

    if (!user) {
      // Check if user exists but with different type
      if (normalizedPhone) {
        const anyUser = db.prepare("SELECT tc.nom_type FROM Utilisateurs u JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte WHERE u.numero_telephone = ?").get(normalizedPhone) as { nom_type: string } | undefined;
        if (anyUser) {
          return res.status(401).json({ error: `Ce numéro est associé à un compte ${anyUser.nom_type}. Veuillez vous connecter avec le bon type.` });
        }
      }
      return res.status(401).json({ error: "Aucun compte trouvé avec ce numéro. Veuillez vous inscrire d'abord." });
    }

    // Check if PIN is expired - auto-regenerate and send SMS
    if (user.pin_expires_at) {
      const expirationDate = new Date(user.pin_expires_at);
      if (expirationDate < new Date()) {
        // Generate new PIN
        const newPin = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const newUpdatedAt = new Date().toISOString();

        // Update in database
        db.prepare(`
          UPDATE Utilisateurs
          SET pin_hash = ?, pin_expires_at = ?, pin_updated_at = ?
          WHERE id_utilisateur = ?
        `).run(newPin, newExpiresAt, newUpdatedAt, user.id_utilisateur);

        // Send SMS with new PIN
        try {
          await notificationProvider.sendSMS(
            user.numero_telephone,
            `🔐 Votre PIN TAKYMED a expiré. Nouveau PIN : ${newPin}\nValable 30 jours. Conservez-le précieusement.`
          );
        } catch (smsError) {
          console.error("Failed to send auto-regenerated PIN SMS:", smsError);
        }

        return res.status(401).json({ 
          error: "Votre PIN a expiré. Un nouveau PIN a été envoyé par SMS.",
          pinRegenerated: true 
        });
      }
    }

    // Validate PIN
    if (!user.pin_hash || pin !== user.pin_hash) {
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
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Request account upgrade
router.post("/upgrade-request", (req, res) => {
  const { requestedType } = req.body;
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  if (!requestedType || !["Pro", "Professionnel"].includes(requestedType)) {
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
