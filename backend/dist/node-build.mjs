import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import * as express from "express";
import express__default, { Router } from "express";
import cors from "cors";
import Database from "better-sqlite3";
import fs from "fs";
import { z } from "zod";
import bcrypt from "bcrypt";
import CountryList from "country-list-with-dial-code-and-flag";
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import gTTS from "gtts";
import https from "https";
import http from "http";
const __filename$4 = fileURLToPath(import.meta.url);
const __dirname$2 = path.dirname(__filename$4);
const projectRoot = __dirname$2.includes("dist") ? path.join(__dirname$2, "../../") : path.join(__dirname$2, "../");
const dbPath = process.env.DB_PATH || path.join(projectRoot, "bd.sqlite");
const sqlScriptPath = path.join(projectRoot, "bd.sql");
const db = new Database(dbPath, {
  verbose: process.env.DEBUG_SQL === "true" ? console.log : void 0
});
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
function initializeDatabase() {
  try {
    console.log("Applying database schema from bd.sql...");
    const sqlScript = fs.readFileSync(sqlScriptPath, "utf-8");
    db.exec(sqlScript);
    console.log("Database schema applied successfully.");
    console.log("Database tables already exist. Skipping initialization.");
    const medicamentColumns = db.prepare("PRAGMA table_info(Medicaments)").all();
    const hasDateAjout = medicamentColumns.some((c) => c.name === "date_ajout");
    const hasPrix = medicamentColumns.some((c) => c.name === "prix");
    if (!hasDateAjout) {
      console.log("Adding date_ajout column to Medicaments...");
      db.exec("ALTER TABLE Medicaments ADD COLUMN date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP");
    }
    if (!hasPrix) {
      console.log("Adding prix column to Medicaments...");
      db.exec("ALTER TABLE Medicaments ADD COLUMN prix VARCHAR(50)");
    }
    db.exec(`
                CREATE TABLE IF NOT EXISTS InteractionsMedicaments (
                    id_interaction INTEGER PRIMARY KEY AUTOINCREMENT,
                    medicament_source INT NOT NULL,
                    medicament_interdit INT NOT NULL,
                    niveau_risque VARCHAR(20) DEFAULT 'modere',
                    description TEXT,
                    FOREIGN KEY (medicament_source) REFERENCES Medicaments(id_medicament) ON DELETE CASCADE,
                    FOREIGN KEY (medicament_interdit) REFERENCES Medicaments(id_medicament) ON DELETE CASCADE
                )
            `);
    const pharmacyColumns = db.prepare("PRAGMA table_info(Pharmacies)").all();
    const hasLat = pharmacyColumns.some((c) => c.name === "latitude");
    const hasLng = pharmacyColumns.some((c) => c.name === "longitude");
    if (!hasLat) {
      console.log("Adding latitude column to Pharmacies...");
      db.exec("ALTER TABLE Pharmacies ADD COLUMN latitude REAL");
    }
    if (!hasLng) {
      console.log("Adding longitude column to Pharmacies...");
      db.exec("ALTER TABLE Pharmacies ADD COLUMN longitude REAL");
    }
    const ordonnanceColumns = db.prepare("PRAGMA table_info(Ordonnances)").all();
    const hasCategorieAge = ordonnanceColumns.some((c) => c.name === "categorie_age");
    if (!hasCategorieAge) {
      console.log("Adding categorie_age column to Ordonnances...");
      db.exec("ALTER TABLE Ordonnances ADD COLUMN categorie_age TEXT DEFAULT 'adulte'");
    }
    const typeComptesColumns = db.prepare("PRAGMA table_info(TypesComptes)").all();
    const hasMaxOrdonnances = typeComptesColumns.some((c) => c.name === "max_ordonnances");
    const hasMaxRappels = typeComptesColumns.some((c) => c.name === "max_rappels");
    if (!hasMaxOrdonnances) {
      console.log("Adding max_ordonnances column to TypesComptes...");
      db.exec("ALTER TABLE TypesComptes ADD COLUMN max_ordonnances INT DEFAULT -1");
    }
    if (!hasMaxRappels) {
      console.log("Adding max_rappels column to TypesComptes...");
      db.exec("ALTER TABLE TypesComptes ADD COLUMN max_rappels INT DEFAULT -1");
    }
    db.exec(`
                CREATE TABLE IF NOT EXISTS CategoriesAge (
                    id_categorie INTEGER PRIMARY KEY AUTOINCREMENT,
                    nom_categorie TEXT NOT NULL UNIQUE,
                    description TEXT,
                    considere_poids BOOLEAN DEFAULT 0
                )
            `);
    const catColumns = db.prepare("PRAGMA table_info(CategoriesAge)").all();
    const hasConsiderePoids = catColumns.some((c) => c.name === "considere_poids");
    if (!hasConsiderePoids) {
      console.log("Adding considere_poids column to CategoriesAge...");
      db.exec("ALTER TABLE CategoriesAge ADD COLUMN considere_poids BOOLEAN DEFAULT 0");
    }
    const userColumns = db.prepare("PRAGMA table_info(Utilisateurs)").all();
    const hasPinExpiresAt = userColumns.some((c) => c.name === "pin_expires_at");
    const hasPinUpdatedAt = userColumns.some((c) => c.name === "pin_updated_at");
    if (!hasPinExpiresAt) {
      console.log("Adding pin_expires_at column to Utilisateurs...");
      db.exec("ALTER TABLE Utilisateurs ADD COLUMN pin_expires_at DATETIME");
    }
    if (!hasPinUpdatedAt) {
      console.log("Adding pin_updated_at column to Utilisateurs...");
      db.exec("ALTER TABLE Utilisateurs ADD COLUMN pin_updated_at DATETIME");
    }
    const hasIdCreateur = userColumns.some((c) => c.name === "id_createur");
    const hasEstValide = userColumns.some((c) => c.name === "est_valide");
    if (!hasIdCreateur) {
      console.log("Adding id_createur column to Utilisateurs...");
      db.exec("ALTER TABLE Utilisateurs ADD COLUMN id_createur INTEGER");
    }
    if (!hasEstValide) {
      console.log("Adding est_valide column to Utilisateurs...");
      db.exec("ALTER TABLE Utilisateurs ADD COLUMN est_valide BOOLEAN DEFAULT TRUE");
    }
    const catAgeCount = db.prepare("SELECT COUNT(*) as count FROM CategoriesAge").get();
    if (catAgeCount.count === 0) {
      console.log("Adding default age categories...");
      db.prepare("INSERT INTO CategoriesAge (nom_categorie, description, considere_poids) VALUES (?, ?, ?)").run("bébé", "0 à 2 ans", 1);
      db.prepare("INSERT INTO CategoriesAge (nom_categorie, description, considere_poids) VALUES (?, ?, ?)").run("enfant", "2 à 12 ans", 1);
      db.prepare("INSERT INTO CategoriesAge (nom_categorie, description, considere_poids) VALUES (?, ?, ?)").run("adulte", "Plus de 12 ans", 0);
    }
    db.exec(`
                CREATE TABLE IF NOT EXISTS PosologieDefautMedicaments (
                    id_posologie INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_medicament INT NOT NULL,
                    categorie_age TEXT,
                    dose_recommandee DECIMAL(10,2),
                    id_unite INT,
                    FOREIGN KEY (id_medicament) REFERENCES Medicaments(id_medicament) ON DELETE CASCADE,
                    FOREIGN KEY (id_unite) REFERENCES Unites(id_unite)
                )
            `);
    const posologyTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='PosologieDefautMedicaments'").get();
    const hasCategorieAgeCheck = posologyTable?.sql?.includes("CHECK(categorie_age IN") || false;
    if (hasCategorieAgeCheck) {
      console.log("Migrating PosologieDefautMedicaments to remove fixed categorie_age CHECK constraint...");
      db.exec(`
                    BEGIN;
                    CREATE TABLE IF NOT EXISTS PosologieDefautMedicaments_new (
                        id_posologie INTEGER PRIMARY KEY AUTOINCREMENT,
                        id_medicament INT NOT NULL,
                        categorie_age TEXT,
                        dose_recommandee DECIMAL(10,2),
                        id_unite INT,
                        FOREIGN KEY (id_medicament) REFERENCES Medicaments(id_medicament) ON DELETE CASCADE,
                        FOREIGN KEY (id_unite) REFERENCES Unites(id_unite)
                    );
                    INSERT INTO PosologieDefautMedicaments_new (id_posologie, id_medicament, categorie_age, dose_recommandee, id_unite)
                    SELECT id_posologie, id_medicament, categorie_age, dose_recommandee, id_unite
                    FROM PosologieDefautMedicaments;
                    DROP TABLE PosologieDefautMedicaments;
                    ALTER TABLE PosologieDefautMedicaments_new RENAME TO PosologieDefautMedicaments;
                    COMMIT;
                `);
    }
    const ordonnanceSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='Ordonnances'").get();
    const hasOrdonnanceCategorieAgeCheck = ordonnanceSchema?.sql?.includes("CHECK(categorie_age IN") || false;
    const hasAgePatient = ordonnanceSchema?.sql?.includes("age_patient") || false;
    if (hasOrdonnanceCategorieAgeCheck || hasAgePatient) {
      console.log("Migrating Ordonnances to remove fixed categorie_age CHECK constraint and cleanup columns...");
      db.exec(`
                    BEGIN;
                    CREATE TABLE IF NOT EXISTS Ordonnances_new (
                        id_ordonnance INTEGER PRIMARY KEY AUTOINCREMENT,
                        id_utilisateur INT NOT NULL,
                        titre VARCHAR(255),
                        nom_patient VARCHAR(255),
                        categorie_age TEXT DEFAULT 'adulte',
                        poids_patient DECIMAL(5,2),
                        date_ordonnance DATE DEFAULT CURRENT_DATE,
                        date_debut DATE,
                        est_active BOOLEAN DEFAULT TRUE,
                        cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE
                    );
                    INSERT INTO Ordonnances_new (id_ordonnance, id_utilisateur, titre, nom_patient, categorie_age, poids_patient, date_ordonnance, est_active, cree_le)
                    SELECT id_ordonnance, id_utilisateur, titre, nom_patient, categorie_age, poids_patient, date_ordonnance, est_active, cree_le
                    FROM Ordonnances;
                    DROP TABLE Ordonnances;
                    ALTER TABLE Ordonnances_new RENAME TO Ordonnances;
                    COMMIT;
                `);
    }
    const ordonnanceCols = db.prepare("PRAGMA table_info(Ordonnances)").all();
    if (!ordonnanceCols.some((c) => c.name === "date_debut")) {
      console.log("Adding date_debut column to Ordonnances...");
      db.exec("ALTER TABLE Ordonnances ADD COLUMN date_debut DATE");
      db.exec("UPDATE Ordonnances SET date_debut = date_ordonnance WHERE date_debut IS NULL");
    }
    const tcCols = db.prepare("PRAGMA table_info(TypesComptes)").all();
    const hasOldOrdonnances = tcCols.some((c) => c.name === "max_ordonnances_actives");
    const hasNewOrdonnances = tcCols.some((c) => c.name === "max_ordonnances");
    const hasOldRappels = tcCols.some((c) => c.name === "limite_notifications");
    const hasNewRappels = tcCols.some((c) => c.name === "max_rappels");
    if (hasOldOrdonnances && !hasNewOrdonnances) {
      console.log("Renaming max_ordonnances_actives to max_ordonnances...");
      db.exec("ALTER TABLE TypesComptes RENAME COLUMN max_ordonnances_actives TO max_ordonnances");
    } else if (hasOldOrdonnances && hasNewOrdonnances) {
      console.log("Cleaning up redundant max_ordonnances_actives...");
      try {
        db.exec("ALTER TABLE TypesComptes DROP COLUMN max_ordonnances_actives");
      } catch (e) {
      }
    } else if (!hasNewOrdonnances) {
      console.log("Adding max_ordonnances column to TypesComptes...");
      db.exec("ALTER TABLE TypesComptes ADD COLUMN max_ordonnances INT DEFAULT -1");
    }
    if (hasOldRappels && !hasNewRappels) {
      console.log("Renaming limite_notifications to max_rappels...");
      db.exec("ALTER TABLE TypesComptes RENAME COLUMN limite_notifications TO max_rappels");
    } else if (hasOldRappels && hasNewRappels) {
      console.log("Cleaning up redundant limite_notifications...");
      try {
        db.exec("ALTER TABLE TypesComptes DROP COLUMN limite_notifications");
      } catch (e) {
      }
    } else if (!hasNewRappels) {
      console.log("Adding max_rappels column to TypesComptes...");
      db.exec("ALTER TABLE TypesComptes ADD COLUMN max_rappels INT DEFAULT -1");
    }
    const typesToEnsure = [
      { id: 1, name: "Standard", desc: "Compte Standard gratuit", ordo: 1, rappels: 3, pay: 0, pharmacies: null },
      { id: 2, name: "Professionnel", desc: "Compte Pro / Pharmacien (Gestion de pharmacies et ordonnances)", ordo: -1, rappels: -1, pay: 1, pharmacies: 10 },
      { id: 3, name: "Commercial", desc: "Peut créer et valider des clients avec ordonnance", ordo: -1, rappels: -1, pay: 0, pharmacies: null },
      { id: 4, name: "Administrateur", desc: "Accès complet au système", ordo: -1, rappels: -1, pay: 0, pharmacies: null }
    ];
    for (const t of typesToEnsure) {
      db.prepare("UPDATE TypesComptes SET nom_type = nom_type || '_old' WHERE nom_type = ? AND id_type_compte <> ?").run(t.name, t.id);
      db.prepare(`
                INSERT INTO TypesComptes (id_type_compte, nom_type, description, max_ordonnances, max_rappels, necessite_paiement, max_pharmacies)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id_type_compte) DO UPDATE SET
                    nom_type = excluded.nom_type,
                    description = excluded.description,
                    max_ordonnances = excluded.max_ordonnances,
                    max_rappels = excluded.max_rappels,
                    necessite_paiement = excluded.necessite_paiement,
                    max_pharmacies = excluded.max_pharmacies
            `).run(t.id, t.name, t.desc, t.ordo, t.rappels, t.pay, t.pharmacies);
    }
    const getAdminTypeId = () => db.prepare("SELECT id_type_compte FROM TypesComptes WHERE nom_type = 'Administrateur'").get();
    const adminPhone = process.env.ADMIN_PHONE || "admin";
    const adminPin = process.env.ADMIN_PIN || "admin";
    const adminUser = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?").get(adminPhone);
    if (!adminUser) {
      console.log("Creating default admin user (admin/admin)...");
      const adminTypeId = getAdminTypeId().id_type_compte;
      const info = db.prepare("INSERT INTO Utilisateurs (numero_telephone, pin_hash, id_type_compte, est_pharmacien) VALUES (?, ?, ?, 1)").run(adminPhone, adminPin, adminTypeId);
      db.prepare("INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)").run(info.lastInsertRowid, "Administrateur Système");
    }
    const commercialUser = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?").get("commercial");
    if (!commercialUser) {
      console.log("Creating test commercial user (commercial/1234)...");
      const info = db.prepare("INSERT INTO Utilisateurs (numero_telephone, pin_hash, id_type_compte, est_pharmacien) VALUES (?, ?, ?, 0)").run("commercial", "1234", 3);
      db.prepare("INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)").run(info.lastInsertRowid, "Agent Commercial Test");
    }
    db.exec(`
                CREATE TABLE IF NOT EXISTS UpgradeRequests (
                    id_request INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_utilisateur INTEGER NOT NULL,
                    requested_type TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    motive TEXT,
                    admin_notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    processed_by INTEGER,
                    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE,
                    FOREIGN KEY (processed_by) REFERENCES Utilisateurs(id_utilisateur)
                )
            `);
    const upgradeReqCols = db.prepare("PRAGMA table_info(UpgradeRequests)").all();
    if (!upgradeReqCols.some((c) => c.name === "motive")) {
      console.log("Adding motive column to UpgradeRequests...");
      db.exec("ALTER TABLE UpgradeRequests ADD COLUMN motive TEXT");
    }
    const upgradeReqSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='UpgradeRequests'").get();
    if (upgradeReqSchema?.sql?.includes("CHECK(requested_type IN")) {
      console.log("Migrating UpgradeRequests to relax requested_type constraints...");
      db.exec(`
                BEGIN;
                CREATE TABLE UpgradeRequests_new (
                    id_request INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_utilisateur INTEGER NOT NULL,
                    requested_type TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    motive TEXT,
                    admin_notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    processed_by INTEGER,
                    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE,
                    FOREIGN KEY (processed_by) REFERENCES Utilisateurs(id_utilisateur)
                );
                INSERT INTO UpgradeRequests_new (id_request, id_utilisateur, requested_type, status, motive, admin_notes, created_at, processed_at, processed_by)
                SELECT id_request, id_utilisateur, requested_type, status, motive, admin_notes, created_at, processed_at, processed_by
                FROM UpgradeRequests;
                DROP TABLE UpgradeRequests;
                ALTER TABLE UpgradeRequests_new RENAME TO UpgradeRequests;
                COMMIT;
            `);
    }
    db.exec(`
                CREATE TABLE IF NOT EXISTS FraisComptesProfessionnels (
                    id_frais INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_type_compte INTEGER UNIQUE NOT NULL,
                    montant DECIMAL(10,2) NOT NULL,
                    devise VARCHAR(10) DEFAULT 'FCFA',
                    FOREIGN KEY (id_type_compte) REFERENCES TypesComptes(id_type_compte) ON DELETE CASCADE
                )
            `);
    db.exec(`
                CREATE TABLE IF NOT EXISTS Paiements (
                    id_paiement INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_utilisateur INTEGER NOT NULL,
                    montant DECIMAL(10,2) NOT NULL,
                    devise VARCHAR(10) DEFAULT 'FCFA',
                    statut VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(statut IN ('pending', 'complete', 'failed', 'refunded')),
                    date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
                    reference VARCHAR(100),
                    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE
                )
            `);
    const cpColumns = db.prepare("PRAGMA table_info(CalendrierPrises)").all();
    if (!cpColumns.some((c) => c.name === "tentatives_rappel")) {
      console.log("Adding tentatives_rappel column to CalendrierPrises...");
      db.exec("ALTER TABLE CalendrierPrises ADD COLUMN tentatives_rappel INTEGER DEFAULT 0");
    }
    if (!cpColumns.some((c) => c.name === "dernier_essai")) {
      console.log("Adding dernier_essai column to CalendrierPrises...");
      db.exec("ALTER TABLE CalendrierPrises ADD COLUMN dernier_essai DATETIME");
    }
    const njSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='NotificationJobs'").get();
    if (njSchema?.sql && !njSchema.sql.includes("ON DELETE CASCADE")) {
      console.log("Migrating NotificationJobs to add ON DELETE CASCADE...");
      db.exec("PRAGMA foreign_keys = OFF");
      db.exec(`
                BEGIN;
                CREATE TABLE NotificationJobs_new (
                    id_job INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_utilisateur INT,
                    id_calendrier_prise INT,
                    channel VARCHAR(20) NOT NULL,
                    message TEXT NOT NULL,
                    contact_value VARCHAR(255) NOT NULL,
                    scheduled_at DATETIME NOT NULL,
                    status TEXT DEFAULT 'pending',
                    retry_count INT DEFAULT 0,
                    max_retries INT DEFAULT 3,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE,
                    FOREIGN KEY (id_calendrier_prise) REFERENCES CalendrierPrises(id_calendrier_prise) ON DELETE CASCADE
                );
                INSERT INTO NotificationJobs_new SELECT * FROM NotificationJobs;
                DROP TABLE NotificationJobs;
                ALTER TABLE NotificationJobs_new RENAME TO NotificationJobs;
                COMMIT;
            `);
      db.exec("PRAGMA foreign_keys = ON");
    }
    const nlSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='NotificationLogs'").get();
    if (nlSchema?.sql && !nlSchema.sql.includes("ON DELETE CASCADE")) {
      console.log("Migrating NotificationLogs to add ON DELETE CASCADE...");
      db.exec("PRAGMA foreign_keys = OFF");
      db.exec(`
                BEGIN;
                CREATE TABLE NotificationLogs_new (
                    id_log INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_job INT,
                    provider VARCHAR(50),
                    channel VARCHAR(20),
                    to_contact VARCHAR(255),
                    message TEXT,
                    status TEXT,
                    error_message TEXT,
                    provider_message_id VARCHAR(255),
                    cost DECIMAL(5, 3),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_job) REFERENCES NotificationJobs(id_job) ON DELETE CASCADE
                );
                INSERT INTO NotificationLogs_new SELECT * FROM NotificationLogs;
                DROP TABLE NotificationLogs;
                ALTER TABLE NotificationLogs_new RENAME TO NotificationLogs;
                COMMIT;
            `);
      db.exec("PRAGMA foreign_keys = ON");
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}
class OrangeSMSProvider {
  clientId = process.env.ORANGE_CLIENT_ID;
  clientSecret = process.env.ORANGE_CLIENT_SECRET;
  accessToken = null;
  tokenExpiry = 0;
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch("https://api.orange.com/oauth/v3/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });
    if (!response.ok) {
      throw new Error(`Orange Auth failed: ${response.statusText}`);
    }
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (parseInt(data.expires_in) - 60) * 1e3;
    return this.accessToken;
  }
  formatPhone(phone) {
    let cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.length === 9 && !cleaned.startsWith("+")) {
      cleaned = "+237" + cleaned;
    } else if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
    if (cleaned.startsWith("++")) {
      cleaned = cleaned.substring(1);
    }
    return `tel:${cleaned}`;
  }
  async sendSMS(to, message) {
    try {
      console.log(`[Orange SMS] Début envoi vers ${to}`);
      const token = await this.getAccessToken();
      console.log(`[Orange SMS] Token obtenu: ${token.substring(0, 20)}...`);
      const senderAddress = process.env.ORANGE_SENDER_ADDRESS || "tel:+2250000";
      const senderName = process.env.ORANGE_SENDER_NAME || "TAKYMED";
      const formattedTo = this.formatPhone(to);
      console.log(`[Orange SMS] Destinataire formaté: ${formattedTo}`);
      console.log(`[Orange SMS] Expéditeur: ${senderAddress}, Nom: ${senderName}`);
      const body = {
        outboundSMSMessageRequest: {
          address: formattedTo,
          senderAddress,
          outboundSMSTextMessage: { message }
        }
      };
      if (senderName) {
        body.outboundSMSMessageRequest.senderName = senderName;
      }
      console.log(`[Orange SMS] Corps de la requête:`, JSON.stringify(body, null, 2));
      const url = `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`;
      console.log(`[Orange SMS] URL: ${url}`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      console.log(`[Orange SMS] Status: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Orange SMS] Erreur API:`, JSON.stringify(errorData, null, 2));
        const apiError = errorData.requestError?.serviceException?.text || errorData.requestError?.policyException?.text || JSON.stringify(errorData);
        return { success: false, error: apiError };
      }
      const data = await response.json();
      console.log(`[Orange SMS] Succès:`, JSON.stringify(data, null, 2));
      return {
        success: true,
        messageId: data.outboundSMSMessageRequest.resourceReference?.resourceURL?.split("/").pop()
      };
    } catch (error) {
      console.error("[Orange SMS] Exception:", error);
      return { success: false, error: error.message };
    }
  }
  async sendWhatsApp(to, message) {
    try {
      const { sendWhatsAppMessage: sendWhatsAppMessage2 } = await Promise.resolve().then(() => whatsappProvider);
      return await sendWhatsAppMessage2(to, message);
    } catch (error) {
      console.error("[Orange WA Fallback] Failed to use Baileys, falling back to SMS:", error);
      return this.sendSMS(to, message);
    }
  }
  async sendVoiceCall(to, message) {
    try {
      const { sendWhatsAppVoice: sendWhatsAppVoice2 } = await Promise.resolve().then(() => whatsappProvider);
      return await sendWhatsAppVoice2(to, message);
    } catch (error) {
      console.error("[Orange Voice] Failed to use WhatsApp Voice:", error);
      return { success: false, error: error.message };
    }
  }
  async checkStatus(messageId, channel) {
    if (channel !== "Voice") return { status: "sent" };
    return { status: "no-answer" };
  }
}
class MockNotificationProvider {
  async sendSMS(to, message) {
    console.log(`📱 Mock SMS to ${to}: ${message}`);
    const success = Math.random() > 0.1;
    return {
      success,
      messageId: success ? `mock-sms-${Date.now()}` : void 0,
      error: success ? void 0 : "Mock SMS failure"
    };
  }
  async sendWhatsApp(to, message) {
    console.log(`💬 Mock WhatsApp to ${to}: ${message}`);
    const success = Math.random() > 0.15;
    return {
      success,
      messageId: success ? `mock-wa-${Date.now()}` : void 0,
      error: success ? void 0 : "Mock WhatsApp failure"
    };
  }
  async sendVoiceCall(to, message) {
    console.log(`📞 Mock Voice call to ${to}: ${message}`);
    return {
      success: true,
      messageId: `mock-voice-${Date.now()}`
    };
  }
  async checkStatus(messageId, channel) {
    if (channel !== "Voice") return { status: "sent" };
    const idNum = parseInt(messageId.split("-").pop() || "0");
    const isAnswered = idNum % 2 === 0;
    return { status: isAnswered ? "answered" : "no-answer" };
  }
}
const notificationProvider = process.env.ORANGE_CLIENT_ID && process.env.ORANGE_CLIENT_SECRET ? new OrangeSMSProvider() : new MockNotificationProvider();
console.log(`📱 Notification Provider initialized: ${notificationProvider.constructor.name}`);
console.log(`📱 ORANGE_CLIENT_ID: ${process.env.ORANGE_CLIENT_ID ? "✅ Set" : "❌ Not set"}`);
console.log(`📱 ORANGE_CLIENT_SECRET: ${process.env.ORANGE_CLIENT_SECRET ? "✅ Set" : "❌ Not set"}`);
console.log(`📱 ORANGE_SENDER_ADDRESS: ${process.env.ORANGE_SENDER_ADDRESS || "Not set"}`);
console.log(`📱 ORANGE_SENDER_NAME: ${process.env.ORANGE_SENDER_NAME || "Not set"}`);
console.log(`📱 Tous les SMS utilisent maintenant l'API Orange réelle !`);
const router$b = Router();
router$b.post("/test-send", async (req, res) => {
  try {
    const { channel, to, message } = z.object({
      channel: z.enum(["SMS", "WhatsApp", "Voice"]),
      to: z.string().min(1),
      message: z.string().min(1)
    }).parse(req.body);
    let result;
    switch (channel) {
      case "SMS":
        result = await notificationProvider.sendSMS(to, message);
        break;
      case "WhatsApp":
        result = await notificationProvider.sendWhatsApp(to, message);
        break;
      case "Voice":
        result = await notificationProvider.sendVoiceCall(to, message);
        break;
    }
    const providerName = notificationProvider instanceof OrangeSMSProvider ? "orange" : "mock";
    db.prepare(`
      INSERT INTO NotificationLogs (provider, channel, to_contact, message, status, error_message, provider_message_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      providerName,
      // Use the determined provider name
      channel,
      to,
      message,
      result.success ? "sent" : "failed",
      result.error,
      result.messageId
    );
    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(400).json({ error: "Données invalides" });
  }
});
const notificationRouter = router$b;
const router$a = Router();
const typeMap = {
  standard: "Standard",
  professional: "Professionnel",
  pro: "Professionnel",
  pharmacist: "Professionnel",
  pharmacy: "Professionnel",
  admin: "Administrateur",
  commercial: "Commercial"
};
const reverseTypeMap = {
  Standard: "standard",
  Professionnel: "professional",
  Administrateur: "admin",
  Commercial: "commercial"
};
router$a.get("/account-types", (_req, res) => {
  try {
    const types = db.prepare(
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
        `
    ).all();
    res.json({ types });
  } catch (error) {
    console.error("Account types error:", error);
    res.status(500).json({ error: "Failed to fetch account types" });
  }
});
router$a.post("/register", async (req, res) => {
  const { phone, type } = req.body;
  try {
    const normalizedPhone = typeof phone === "string" ? phone.replace(/\s+/g, "") : "";
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone is required" });
    }
    const existingUser = db.prepare(
      "SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?"
    ).get(normalizedPhone);
    if (existingUser) {
      return res.status(409).json({ error: "Ce numéro est déjà utilisé" });
    }
    const dbType = typeMap[type] || "Standard";
    const typeRecord = db.prepare(
      "SELECT id_type_compte, nom_type FROM TypesComptes WHERE nom_type = ?"
    ).get(dbType);
    if (!typeRecord) {
      return res.status(400).json({ error: "Invalid account type" });
    }
    const generatedPin = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const info = db.prepare(
      `
          INSERT INTO Utilisateurs (numero_telephone, pin_hash, pin_expires_at, pin_updated_at, id_type_compte, est_pharmacien)
          VALUES (?, ?, ?, ?, ?, ?)
        `
    ).run(
      normalizedPhone,
      generatedPin,
      expiresAt,
      updatedAt,
      typeRecord.id_type_compte,
      0
    );
    db.prepare(
      "INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)"
    ).run(info.lastInsertRowid, `User ${normalizedPhone.slice(-4)}`);
    try {
      await notificationProvider.sendSMS(
        normalizedPhone,
        `Bienvenue sur TAKYMED ! Votre code PIN de connexion est : ${generatedPin}. Gardez-le précieusement.`
      );
    } catch (smsError) {
      console.error("Failed to send registration SMS:", smsError);
    }
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("❌ Register error for phone:", phone, error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router$a.get("/pin-info", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  try {
    const user = db.prepare("SELECT pin_expires_at FROM Utilisateurs WHERE id_utilisateur = ?").get(userId);
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
router$a.post("/regenerate-pin", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  try {
    const user = db.prepare("SELECT numero_telephone, id_utilisateur FROM Utilisateurs WHERE id_utilisateur = ?").get(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    const newPin = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare(`
      UPDATE Utilisateurs
      SET pin_hash = ?, pin_expires_at = ?, pin_updated_at = ?
      WHERE id_utilisateur = ?
    `).run(newPin, expiresAt, updatedAt, userId);
    try {
      await notificationProvider.sendSMS(
        user.numero_telephone,
        `🔐 Nouveau PIN TAKYMED : ${newPin}
Valable 30 jours. Conservez-le précieusement.`
      );
    } catch (smsError) {
      console.error("Failed to send PIN regeneration SMS:", smsError);
    }
    res.json({
      success: true,
      expiresAt,
      message: "Nouveau PIN généré et envoyé par SMS"
    });
  } catch (error) {
    console.error("PIN regeneration error:", error);
    res.status(500).json({ error: "Erreur lors de la régénération du PIN" });
  }
});
router$a.post("/login", async (req, res) => {
  const { phone, type, pin } = req.body;
  try {
    const normalizedPhone = typeof phone === "string" ? phone.replace(/\s+/g, "") : "";
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Le numéro de téléphone est requis" });
    }
    if (!pin) {
      return res.status(400).json({ error: "Le PIN est requis" });
    }
    let user;
    let frontendType = "standard";
    user = db.prepare(
      `
          SELECT u.*, p.nom_complet, tc.nom_type
          FROM Utilisateurs u
          LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
          JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
          WHERE u.numero_telephone = ?
        `
    ).get(normalizedPhone);
    if (user?.nom_type) {
      frontendType = reverseTypeMap[user.nom_type] || "standard";
    }
    if (normalizedPhone === "admin") {
      const adminUser = db.prepare(
        `
            SELECT u.*, p.nom_complet, tc.nom_type
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            WHERE u.numero_telephone = 'admin'
          `
      ).get();
      if (adminUser && pin === adminUser.pin_hash) {
        return res.json({
          id: adminUser.id_utilisateur,
          email: adminUser.email || "admin@takymed.com",
          phone: adminUser.numero_telephone,
          type: "admin",
          name: adminUser.nom_complet || "Admin"
        });
      }
      return res.status(401).json({ error: "PIN incorrect" });
    }
    if (!user) {
      if (normalizedPhone) {
        const anyUser = db.prepare("SELECT tc.nom_type FROM Utilisateurs u JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte WHERE u.numero_telephone = ?").get(normalizedPhone);
        if (anyUser) {
          return res.status(401).json({ error: `Ce numéro est associé à un compte ${anyUser.nom_type}. Veuillez vous connecter avec le bon type.` });
        }
      }
      return res.status(401).json({ error: "Aucun compte trouvé avec ce numéro. Veuillez vous inscrire d'abord." });
    }
    if (user.pin_expires_at) {
      const expirationDate = new Date(user.pin_expires_at);
      if (expirationDate < /* @__PURE__ */ new Date()) {
        const newPin = Math.floor(1e5 + Math.random() * 9e5).toString();
        const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
        const newUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
        db.prepare(`
          UPDATE Utilisateurs
          SET pin_hash = ?, pin_expires_at = ?, pin_updated_at = ?
          WHERE id_utilisateur = ?
        `).run(newPin, newExpiresAt, newUpdatedAt, user.id_utilisateur);
        try {
          await notificationProvider.sendSMS(
            user.numero_telephone,
            `🔐 Votre PIN TAKYMED a expiré. Nouveau PIN : ${newPin}
Valable 30 jours. Conservez-le précieusement.`
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
    if (!user.pin_hash || pin !== user.pin_hash) {
      return res.status(401).json({ error: "PIN incorrect" });
    }
    if (user.est_valide === 0) {
      return res.status(403).json({ error: "Votre compte n'est pas encore validé. Veuillez contacter votre agent commercial." });
    }
    res.json({
      id: user.id_utilisateur,
      email: user.email || `${frontendType}@takymed.com`,
      phone: user.numero_telephone,
      type: frontendType,
      name: user.nom_complet || "Utilisateur"
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});
router$a.post("/upgrade-request", (req, res) => {
  const { requestedType } = req.body;
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  if (!requestedType || !["Pro", "Professionnel", "Commercial"].includes(requestedType)) {
    return res.status(400).json({ error: "Type de compte invalide" });
  }
  try {
    const existingRequest = db.prepare(
      "SELECT * FROM UpgradeRequests WHERE id_utilisateur = ? AND status = 'pending'"
    ).get(userId);
    if (existingRequest) {
      return res.status(400).json({ error: "Vous avez déjà une demande en attente" });
    }
    db.prepare(
      "INSERT INTO UpgradeRequests (id_utilisateur, requested_type, motive) VALUES (?, ?, ?)"
    ).run(userId, requestedType, req.body.motive || null);
    res.json({ success: true, message: "Demande envoyée avec succès" });
  } catch (error) {
    console.error("Upgrade request error:", error);
    res.status(500).json({ error: "Erreur lors de la demande" });
  }
});
router$a.patch("/profile", (req, res) => {
  const { name, phone } = req.body;
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  try {
    const transaction = db.transaction(() => {
      if (name !== void 0) {
        const result = db.prepare(
          "UPDATE ProfilsUtilisateurs SET nom_complet = ? WHERE id_utilisateur = ?"
        ).run(name, userId);
        if (result.changes === 0) {
          db.prepare(
            "INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)"
          ).run(userId, name);
        }
      }
      if (phone) {
        const normalizedPhone = phone.replace(/\s+/g, "");
        const existingUser = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ? AND id_utilisateur <> ?").get(normalizedPhone, userId);
        if (existingUser) {
          throw new Error("PHONE_TAKEN");
        }
        db.prepare("UPDATE Utilisateurs SET numero_telephone = ? WHERE id_utilisateur = ?").run(normalizedPhone, userId);
      }
    });
    transaction();
    res.json({ success: true, message: "Profil mis à jour" });
  } catch (error) {
    if (error.message === "PHONE_TAKEN") {
      return res.status(409).json({ error: "Ce numéro de téléphone est déjà utilisé par un autre compte" });
    }
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil" });
  }
});
const authRouter = router$a;
function refreshOrdonnanceActiveState(userId) {
  db.prepare(
    `
      UPDATE Ordonnances
      SET est_active = 0
      WHERE id_utilisateur = ?
        AND est_active = 1
        AND NOT EXISTS (
          SELECT 1
          FROM ElementsOrdonnance eo
          JOIN CalendrierPrises cp ON cp.id_element_ordonnance = eo.id_element_ordonnance
          WHERE eo.id_ordonnance = Ordonnances.id_ordonnance
            AND cp.statut_prise = 0
        )
    `
  ).run(userId);
  db.prepare(
    `
      UPDATE Ordonnances
      SET est_active = 0
      WHERE id_utilisateur = ?
        AND est_active = 1
        AND EXISTS (
          SELECT 1
          FROM ElementsOrdonnance eo
          JOIN CalendrierPrises cp ON cp.id_element_ordonnance = eo.id_element_ordonnance
          WHERE eo.id_ordonnance = Ordonnances.id_ordonnance
          GROUP BY eo.id_ordonnance
          HAVING MAX(datetime(cp.heure_prevue)) < datetime('now')
        )
    `
  ).run(userId);
}
function isUnlimited(limit) {
  return limit === null || limit === void 0 || Number(limit) < 0;
}
function getUserAccountLimits(userId) {
  const row = db.prepare(
    `
      SELECT tc.max_ordonnances as maxOrdonnances, tc.max_rappels as maxRappels
      FROM Utilisateurs u
      JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
      WHERE u.id_utilisateur = ?
    `
  ).get(userId);
  return row || null;
}
function countActiveOrdonnances(userId) {
  const row = db.prepare(
    `
      SELECT COUNT(*) as count
      FROM Ordonnances
      WHERE id_utilisateur = ? AND est_active = 1
    `
  ).get(userId);
  return row?.count || 0;
}
function countPendingRappels(userId, excludeElementId) {
  let query = `
    SELECT COUNT(*) as count
    FROM CalendrierPrises cp
    JOIN ElementsOrdonnance eo ON cp.id_element_ordonnance = eo.id_element_ordonnance
    JOIN Ordonnances o ON eo.id_ordonnance = o.id_ordonnance
    WHERE o.id_utilisateur = ?
      AND o.est_active = 1
      AND cp.statut_prise = 0
  `;
  const params = [userId];
  if (excludeElementId !== void 0) {
    query += ` AND cp.id_element_ordonnance <> ?`;
    params.push(excludeElementId);
  }
  const row = db.prepare(query).get(...params);
  return row?.count || 0;
}
const router$9 = Router();
function estimateReminderCountFromMedications(medications) {
  let total = 0;
  for (const m of medications || []) {
    if (!m || m.frequencyType === "prn") continue;
    const durationDays = Number(m.durationDays) || 0;
    if (durationDays <= 0) continue;
    if (m.frequencyType === "interval" && Number(m.intervalHours) > 0) {
      const interval = Number(m.intervalHours);
      for (let day = 0; day < durationDays; day++) {
        let currHour = 0;
        while (currHour < 24) {
          total += 1;
          currHour += interval;
        }
      }
      continue;
    }
    const timesPerDay = Array.isArray(m.times) ? m.times.length : 0;
    if (timesPerDay > 0) {
      total += timesPerDay * durationDays;
    }
  }
  return total;
}
router$9.get("/", (req, res) => {
  const userId = req.query.userId;
  const patientId = req.query.patientId;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }
  try {
    refreshOrdonnanceActiveState(numericUserId);
    let query = `
      SELECT 
        cp.id_calendrier_prise as id,
        m.id_medicament as medicationId,
        m.nom as medicationName,
        o.nom_patient as clientName,
        o.id_ordonnance as patientId,
        eo.dose_personnalisee as dose,
        cp.heure_prevue as time,
        cp.rappel_envoye as statusReminderSent,
        cp.statut_prise as statusTaken
      FROM CalendrierPrises cp
      JOIN ElementsOrdonnance eo ON cp.id_element_ordonnance = eo.id_element_ordonnance
      JOIN Medicaments m ON eo.id_medicament = m.id_medicament
      JOIN Ordonnances o ON eo.id_ordonnance = o.id_ordonnance
      WHERE o.id_utilisateur = ? AND o.est_active = 1
      `;
    const params = [userId];
    if (patientId) {
      query += ` AND o.id_ordonnance = ?`;
      params.push(patientId);
    }
    query += ` ORDER BY cp.heure_prevue ASC LIMIT 100`;
    const doses = db.prepare(query).all(...params);
    const mappedDoses = doses.map((d) => {
      const dateObj = new Date(d.time);
      const isValidDate = !isNaN(dateObj.getTime());
      return {
        id: d.id,
        medicationId: d.medicationId,
        medicationName: d.medicationName,
        clientName: d.clientName || "Patient",
        patientId: d.patientId,
        dose: d.dose,
        unit: d.unit || "unité",
        scheduledAt: d.time,
        time: isValidDate ? dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--",
        day: isValidDate ? dateObj.getDate() : 1,
        statusReminderSent: !!d.statusReminderSent,
        statusTaken: !!d.statusTaken
      };
    });
    const patientsDb = db.prepare(`
           SELECT DISTINCT o.id_ordonnance as id, o.titre as name, o.date_ordonnance as date, u.numero_telephone as phone
           FROM Ordonnances o
           JOIN ElementsOrdonnance eo ON o.id_ordonnance = eo.id_ordonnance
           JOIN CalendrierPrises cp ON eo.id_element_ordonnance = cp.id_element_ordonnance
           JOIN Utilisateurs u ON o.id_utilisateur = u.id_utilisateur
           WHERE o.id_utilisateur = ? AND o.est_active = 1 AND cp.statut_prise = 0
           ORDER BY o.date_ordonnance DESC
        `).all(userId);
    const pharmacyCount = db.prepare("SELECT COUNT(*) as count FROM Pharmacies").get();
    const limits = getUserAccountLimits(numericUserId);
    const activeOrdonnances = countActiveOrdonnances(numericUserId);
    const activeRappels = countPendingRappels(numericUserId);
    const ordonnanceUnlimited = isUnlimited(limits?.maxOrdonnances);
    const rappelsUnlimited = isUnlimited(limits?.maxRappels);
    const ordonnanceRemaining = ordonnanceUnlimited ? null : Math.max(Number(limits?.maxOrdonnances || 0) - activeOrdonnances, 0);
    const rappelsRemaining = rappelsUnlimited ? null : Math.max(Number(limits?.maxRappels || 0) - activeRappels, 0);
    res.json({
      doses: mappedDoses,
      patients: patientsDb,
      stats: {
        observanceRate: mappedDoses.length > 0 ? Math.round(mappedDoses.filter((d) => d.statusTaken).length / mappedDoses.length * 100) : 100,
        activeReminders: activeRappels,
        plannedReminders: mappedDoses.length,
        nearbyPharmacies: pharmacyCount.count,
        nextDose: mappedDoses.find((d) => !d.statusTaken) || null,
        quota: {
          ordonnances: {
            max: limits?.maxOrdonnances ?? null,
            used: activeOrdonnances,
            remaining: ordonnanceRemaining,
            unlimited: ordonnanceUnlimited
          },
          rappels: {
            max: limits?.maxRappels ?? null,
            used: activeRappels,
            remaining: rappelsRemaining,
            unlimited: rappelsUnlimited
          }
        }
      }
    });
  } catch (error) {
    console.error("Failed to list prescriptions:", error);
    res.status(500).json({ error: "Server error fetching prescriptions" });
  }
});
router$9.post("/", (req, res) => {
  const { userId, title, weight, categorieAge, medications, notifConfig, startDate } = req.body;
  if (!userId) return res.status(400).json({ error: "User ID required" });
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  const headerUserId = req.headers["x-user-id"];
  if (headerUserId && headerUserId.toString() !== userId.toString()) {
    const client = db.prepare("SELECT id_createur FROM Utilisateurs WHERE id_utilisateur = ?").get(userId);
    if (!client || client.id_createur?.toString() !== headerUserId.toString()) {
      return res.status(403).json({ error: "User ID mismatch or unauthorized commercial link" });
    }
  }
  const limits = getUserAccountLimits(numericUserId);
  if (!limits) {
    return res.status(404).json({ error: "User account not found" });
  }
  refreshOrdonnanceActiveState(numericUserId);
  const activeOrdonnances = countActiveOrdonnances(numericUserId);
  if (!isUnlimited(limits.maxOrdonnances) && activeOrdonnances >= Number(limits.maxOrdonnances)) {
    return res.status(403).json({
      error: `Limite d'ordonnances atteinte (${limits.maxOrdonnances}).`
    });
  }
  const newReminderCount = estimateReminderCountFromMedications(Array.isArray(medications) ? medications : []);
  if (!isUnlimited(limits.maxRappels)) {
    const currentPendingRappels = countPendingRappels(numericUserId);
    const projectedRappels = currentPendingRappels + newReminderCount;
    if (projectedRappels > Number(limits.maxRappels)) {
      return res.status(403).json({
        error: `Limite de rappels atteinte (${limits.maxRappels}). Rappels actuels: ${currentPendingRappels}, nouveaux: ${newReminderCount}.`
      });
    }
  }
  try {
    const insertTransaction = db.transaction(() => {
      const ordStmt = db.prepare(`
                INSERT INTO Ordonnances (id_utilisateur, titre, nom_patient, poids_patient, categorie_age, date_ordonnance, date_debut) 
                VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?)
            `);
      const ordInfo = ordStmt.run(userId, title, title, weight || 0, categorieAge || "adulte", startDate || null);
      const idOrdonnance = ordInfo.lastInsertRowid;
      if (notifConfig) {
        const channelMap = {
          sms: 1,
          whatsapp: 2,
          call: 3,
          push: 4
        };
        const recipients = Array.isArray(notifConfig.recipients) ? notifConfig.recipients.map((r) => (r || "").trim()).filter(Boolean) : notifConfig.phone ? [String(notifConfig.phone).trim()] : [];
        const channels = Array.isArray(notifConfig.channels) ? notifConfig.channels.filter((c) => channelMap[c]) : notifConfig.type ? [notifConfig.type] : [];
        if (recipients.length > 0 && channels.length > 0) {
          db.prepare(`
                        UPDATE PreferencesNotificationUtilisateurs
                        SET est_active = 0
                        WHERE id_utilisateur = ?
                    `).run(userId);
          const insertPref = db.prepare(`
                        INSERT INTO PreferencesNotificationUtilisateurs (id_utilisateur, id_canal, valeur_contact, est_active)
                        VALUES (?, ?, ?, 1)
                    `);
          for (const recipient of recipients) {
            for (const channel of channels) {
              insertPref.run(userId, channelMap[channel], recipient);
            }
          }
        }
      }
      for (const m of medications) {
        let medRecord = db.prepare("SELECT id_medicament FROM Medicaments WHERE LOWER(nom) = LOWER(?)").get(m.name);
        let idMedicament;
        if (!medRecord) {
          const mStmt = db.prepare("INSERT INTO Medicaments (nom) VALUES (?)");
          const mInfo = mStmt.run(m.name);
          idMedicament = mInfo.lastInsertRowid;
        } else {
          idMedicament = medRecord.id_medicament;
        }
        let unitId = 5;
        if (m.unit) {
          const uRecord = db.prepare("SELECT id_unite FROM Unites WHERE LOWER(nom_unite) = LOWER(?)").get(m.unit);
          if (uRecord) {
            unitId = uRecord.id_unite;
          } else {
            try {
              const uInfo = db.prepare("INSERT INTO Unites (nom_unite) VALUES (?)").run(m.unit);
              unitId = uInfo.lastInsertRowid;
            } catch (e) {
              const uRecordRetry = db.prepare("SELECT id_unite FROM Unites WHERE LOWER(nom_unite) = LOWER(?)").get(m.unit);
              if (uRecordRetry) unitId = uRecordRetry.id_unite;
            }
          }
        }
        const allowedFrequencies = ["matin", "midi", "soir"];
        const dbFrequence = allowedFrequencies.includes(m.frequencyType) ? m.frequencyType : "personnalise";
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
        if (m.frequencyType !== "prn") {
          const pStmt = db.prepare(`
                        INSERT INTO CalendrierPrises (id_element_ordonnance, heure_prevue, dose, id_unite, statut_prise)
                        VALUES (?, ?, ?, ?, 0)
                    `);
          let baseDate;
          if (startDate && typeof startDate === "string") {
            const [y, mm, dd] = startDate.split("-").map(Number);
            baseDate = new Date(y, mm - 1, dd, 12, 0, 0);
          } else {
            baseDate = /* @__PURE__ */ new Date();
            baseDate.setHours(12, 0, 0, 0);
          }
          for (let dayOffset = 0; dayOffset < m.durationDays; dayOffset++) {
            const currentDate = new Date(baseDate);
            currentDate.setDate(baseDate.getDate() + dayOffset);
            if (m.frequencyType === "interval" && m.intervalHours) {
              let currHour = 0;
              while (currHour < 24) {
                const d = new Date(currentDate);
                d.setHours(currHour, 0, 0, 0);
                pStmt.run(idElement, d.toISOString(), m.doseValue, unitId);
                currHour += m.intervalHours;
              }
            } else if (m.times && m.times.length > 0) {
              for (const timeStr of m.times) {
                const [h, min] = timeStr.split(":").map(Number);
                const d = new Date(currentDate);
                d.setHours(h, min, 0, 0);
                pStmt.run(idElement, d.toISOString(), m.doseValue, unitId);
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
router$9.post("/doses/:id/take", (req, res) => {
  try {
    const result = db.prepare(`
            UPDATE CalendrierPrises 
            SET statut_prise = 1 
            WHERE id_calendrier_prise = ?
        `).run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Dose not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to mark dose as taken:", error);
    res.status(500).json({ error: "Server error" });
  }
});
router$9.post("/doses/:id/untake", (req, res) => {
  try {
    const result = db.prepare(`
            UPDATE CalendrierPrises 
            SET statut_prise = 0 
            WHERE id_calendrier_prise = ?
        `).run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Dose not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to unmark dose as taken:", error);
    res.status(500).json({ error: "Server error" });
  }
});
router$9.post("/doses/:id/delay", (req, res) => {
  try {
    const result = db.prepare(`
            UPDATE CalendrierPrises 
            SET heure_prevue = datetime(heure_prevue, '+1 hour') 
            WHERE id_calendrier_prise = ?
        `).run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Dose not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delay dose:", error);
    res.status(500).json({ error: "Server error" });
  }
});
const prescriptionRouter = router$9;
const router$8 = Router();
router$8.get("/", (req, res) => {
  try {
    const isNewOnly = req.query.new === "true";
    const searchQuery = req.query.q;
    let sql = `
            SELECT id_medicament as id, nom as name, description, photo_url as photoUrl, 
                   prix as price, date_ajout as dateAdded, type_utilisation as type, 
                   precaution_alimentaire as precautions
            FROM Medicaments
        `;
    const params = [];
    const whereClauses = [];
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
    let medications = db.prepare(sql + " ORDER BY nom ASC").all(...params);
    if (isNewOnly && medications.length === 0) {
      medications = db.prepare(`
                SELECT id_medicament as id, nom as name, description, photo_url as photoUrl, 
                       prix as price, date_ajout as dateAdded, type_utilisation as type, 
                       precaution_alimentaire as precautions
                FROM Medicaments
                ORDER BY date_ajout DESC
                LIMIT 5
            `).all();
    }
    res.json({ medications });
  } catch (error) {
    console.error("Failed to fetch medications:", error);
    res.status(500).json({ error: "Server error fetching medications" });
  }
});
router$8.post("/", (req, res) => {
  const { name, description, photoUrl, price, typeUtilisation } = req.body;
  if (!name) return res.status(400).json({ error: "Medication name is required" });
  try {
    const info = db.prepare(`
            INSERT INTO Medicaments (nom, description, photo_url, prix, type_utilisation, date_ajout)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(name, description || "", photoUrl || "", price || "", typeUtilisation || "comprime");
    res.status(201).json({ success: true, medicationId: info.lastInsertRowid });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Ce médicament existe déjà dans la base de données." });
    }
    console.error("Failed to register medication:", error);
    res.status(500).json({ error: "Server error registering medication" });
  }
});
router$8.get("/interactions", (req, res) => {
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
router$8.post("/interactions", (req, res) => {
  const { medicamentSourceId, medicamentInterditId, riskLevel, description } = req.body;
  if (!medicamentSourceId || !medicamentInterditId) {
    return res.status(400).json({ error: "Source and Interdit medication IDs are required" });
  }
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const userRole = db.prepare(`
            SELECT tc.nom_type 
            FROM Utilisateurs u 
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte 
            WHERE u.id_utilisateur = ?
        `).get(userId);
    if (userRole?.nom_type !== "Administrateur") {
      return res.status(403).json({ error: "Only Administrateurs can manage interactions" });
    }
    const info = db.prepare(`
            INSERT INTO InteractionsMedicaments (medicament_source, medicament_interdit, niveau_risque, description)
            VALUES (?, ?, ?, ?)
        `).run(medicamentSourceId, medicamentInterditId, riskLevel || "modere", description || "");
    res.status(201).json({ success: true, interactionId: info.lastInsertRowid });
  } catch (error) {
    console.error("Failed to add interaction:", error);
    res.status(500).json({ error: "Server error adding interaction" });
  }
});
const medicationRouter = router$8;
const router$7 = Router();
router$7.get("/", (req, res) => {
  const userId = req.query.pharmacistId || req.query.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  try {
    const pharmacies = db.prepare(`
            SELECT id_pharmacie as id, nom_pharmacie as name, adresse as address, telephone as phone
            FROM Pharmacies
            WHERE id_pharmacien = ?
        `).all(userId);
    res.json({ pharmacies });
  } catch (error) {
    console.error("Failed to fetch pharmacies:", error);
    res.status(500).json({ error: "Server error fetching pharmacies" });
  }
});
router$7.post("/", (req, res) => {
  const { name, address, phone, openTime, closeTime, pharmacistId, userId, initialMeds, latitude, longitude } = req.body;
  const ownerId = pharmacistId || userId;
  if (!name || !ownerId) {
    return res.status(400).json({ error: "Name and User ID are required" });
  }
  try {
    const user = db.prepare(`
            SELECT u.id_utilisateur, tc.nom_type, tc.max_pharmacies
            FROM Utilisateurs u
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            WHERE u.id_utilisateur = ?
        `).get(ownerId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.nom_type !== "Administrateur") {
      return res.status(403).json({ error: "Only Administrateurs can manage pharmacies" });
    }
    const currentCount = db.prepare(`
            SELECT COUNT(*) as count FROM Pharmacies WHERE id_pharmacien = ?
        `).get(ownerId);
    if (user.max_pharmacies !== null && currentCount.count >= user.max_pharmacies) {
      return res.status(403).json({
        error: `Pharmacy limit reached. Maximum allowed: ${user.max_pharmacies}`,
        maxPharmacies: user.max_pharmacies,
        currentCount: currentCount.count
      });
    }
    const transaction = db.transaction(() => {
      const info = db.prepare(`
                INSERT INTO Pharmacies (nom_pharmacie, adresse, telephone, heure_ouverture, heure_fermeture, id_pharmacien, latitude, longitude)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(name, address || "", phone || "", openTime || "08:00", closeTime || "20:00", ownerId, latitude || null, longitude || null);
      const pharmacyId2 = info.lastInsertRowid;
      if (initialMeds && Array.isArray(initialMeds)) {
        const insertStock = db.prepare("INSERT INTO StockMedicamentsPharmacie (id_pharmacie, id_medicament, quantite) VALUES (?, ?, ?)");
        for (const med of initialMeds) {
          insertStock.run(pharmacyId2, med.id, med.quantity);
        }
      }
      return pharmacyId2;
    });
    const pharmacyId = transaction();
    res.status(201).json({ success: true, pharmacyId });
  } catch (error) {
    console.error("Failed to create pharmacy:", error);
    res.status(500).json({ error: "Server error creating pharmacy" });
  }
});
router$7.get("/search", (req, res) => {
  const { medId, lat, lng } = req.query;
  if (!medId) return res.status(400).json({ error: "medId is required" });
  try {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const pharmacies = db.prepare(`
            SELECT 
                p.id_pharmacie as id, 
                p.nom_pharmacie as name, 
                p.adresse as address, 
                p.telephone as phone,
                p.latitude,
                p.longitude,
                s.quantite as quantity
            FROM Pharmacies p
            JOIN StockMedicamentsPharmacie s ON p.id_pharmacie = s.id_pharmacie
            WHERE s.id_medicament = ? AND s.quantite > 0
        `).all(medId);
    const result = pharmacies.map((p) => {
      let distance = null;
      if (!isNaN(userLat) && !isNaN(userLng) && p.latitude && p.longitude) {
        const R = 6371;
        const dLat = (p.latitude - userLat) * Math.PI / 180;
        const dLng = (p.longitude - userLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(userLat * Math.PI / 180) * Math.cos(p.latitude * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = parseFloat((R * c).toFixed(2));
      }
      return { ...p, distance };
    });
    result.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return a.name.localeCompare(b.name);
    });
    res.json({ pharmacies: result });
  } catch (error) {
    console.error("Failed to search pharmacies:", error);
    res.status(500).json({ error: "Server error searching pharmacies" });
  }
});
router$7.delete("/:id", (req, res) => {
  const pharmacyId = req.params.id;
  try {
    db.prepare("DELETE FROM Pharmacies WHERE id_pharmacie = ?").run(pharmacyId);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete pharmacy:", error);
    res.status(500).json({ error: "Server error deleting pharmacy" });
  }
});
router$7.get("/:id/stock", (req, res) => {
  const pharmacyId = req.params.id;
  try {
    const stock = db.prepare(`
            SELECT 
                s.id_stock as id,
                m.id_medicament as medicationId,
                m.nom as medicationName,
                s.quantite as quantity
            FROM StockMedicamentsPharmacie s
            JOIN Medicaments m ON s.id_medicament = m.id_medicament
            WHERE s.id_pharmacie = ?
        `).all(pharmacyId);
    res.json({ stock });
  } catch (error) {
    console.error("Failed to fetch stock:", error);
    res.status(500).json({ error: "Server error fetching stock" });
  }
});
router$7.post("/:id/stock", (req, res) => {
  const pharmacyId = req.params.id;
  const { medicationId, quantity } = req.body;
  if (!medicationId) return res.status(400).json({ error: "Missing medicationId" });
  try {
    db.prepare(`
            INSERT INTO StockMedicamentsPharmacie (id_pharmacie, id_medicament, quantite)
            VALUES (?, ?, ?)
            ON CONFLICT(id_pharmacie, id_medicament) DO UPDATE SET quantite = excluded.quantite
        `).run(pharmacyId, medicationId, quantity || 0);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update stock:", error);
    res.status(500).json({ error: "Server error updating stock" });
  }
});
const pharmacyRouter = router$7;
const router$6 = Router();
const otpRequestSchema = z.object({
  phone: z.string().min(8).max(20),
  channel: z.enum(["SMS", "WhatsApp", "Voice"]).default("SMS")
});
function generateOTP() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
async function hashOTP(otp) {
  return await bcrypt.hash(otp, 12);
}
async function verifyOTP(otp, hash) {
  return await bcrypt.compare(otp, hash);
}
async function sendOTP(phone, otp, channel) {
  const message = `Votre code de vérification TAKYMED est : ${otp}`;
  let result;
  if (channel === "SMS") {
    result = await notificationProvider.sendSMS(phone, message);
  } else if (channel === "WhatsApp") {
    result = await notificationProvider.sendWhatsApp(phone, message);
  } else {
    return false;
  }
  return result.success;
}
function cleanupExpiredOTPs() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare("DELETE FROM OtpRequests WHERE expires_at < ? AND status != 'verified'").run(now);
}
router$6.post("/pin/request", async (req, res) => {
  try {
    const { phone, channel } = otpRequestSchema.parse(req.body);
    cleanupExpiredOTPs();
    let user = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?").get(phone);
    const isNewUser = !user;
    if (!user) {
      const standardType = db.prepare("SELECT id_type_compte FROM TypesComptes WHERE nom_type = 'Standard'").get();
      if (!standardType) {
        return res.status(500).json({ error: "Type de compte Standard non trouvé" });
      }
      const result2 = db.prepare(`
                INSERT INTO Utilisateurs (numero_telephone, id_type_compte, est_pharmacien)
                VALUES (?, ?, 0)
            `).run(phone, standardType.id_type_compte);
      db.prepare(`
                INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet)
                VALUES (?, ?)
            `).run(result2.lastInsertRowid, `User ${phone.slice(-4)}`);
      user = { id_utilisateur: result2.lastInsertRowid };
    }
    const existingOtp = db.prepare(`
            SELECT id_otp, expires_at, attempts
            FROM OtpRequests
            WHERE phone = ? AND status = 'pending' AND expires_at > datetime('now')
            ORDER BY created_at DESC
            LIMIT 1
        `).get(phone);
    if (existingOtp && existingOtp.attempts >= 3) {
      return res.status(429).json({ error: "Trop de tentatives. Réessayez dans 5 minutes." });
    }
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1e3).toISOString();
    const result = db.prepare(`
            INSERT INTO OtpRequests (phone, otp_hash, channel, expires_at)
            VALUES (?, ?, ?, ?)
        `).run(phone, otpHash, channel, expiresAt);
    const sent = await sendOTP(phone, otp, channel);
    if (!sent) {
      return res.status(500).json({ error: "Erreur d'envoi du code" });
    }
    res.json({
      success: true,
      message: `Code envoyé par ${channel}`,
      otpId: result.lastInsertRowid,
      isNewUser
      // Indicate if this is a new account
    });
  } catch (error) {
    console.error("OTP request error:", error);
    res.status(400).json({ error: "Données invalides" });
  }
});
router$6.post("/pin/verify", async (req, res) => {
  try {
    const { phone, otp, otpId } = z.object({
      phone: z.string().min(8).max(20),
      otp: z.string().length(6),
      otpId: z.number().optional()
    }).parse(req.body);
    let otpRecord;
    if (otpId) {
      otpRecord = db.prepare(`
                SELECT * FROM OtpRequests
                WHERE id_otp = ? AND phone = ? AND status = 'pending'
            `).get(otpId, phone);
    } else {
      otpRecord = db.prepare(`
                SELECT * FROM OtpRequests
                WHERE phone = ? AND status = 'pending' AND expires_at > datetime('now')
                ORDER BY created_at DESC
                LIMIT 1
            `).get(phone);
    }
    if (!otpRecord) {
      return res.status(400).json({ error: "Code expiré ou invalide" });
    }
    if (otpRecord.attempts >= 3) {
      db.prepare("UPDATE OtpRequests SET status = 'failed' WHERE id_otp = ?").run(otpRecord.id_otp);
      return res.status(429).json({ error: "Trop de tentatives. Demandez un nouveau code." });
    }
    const isValid = await verifyOTP(otp, otpRecord.otp_hash);
    if (!isValid) {
      db.prepare("UPDATE OtpRequests SET attempts = attempts + 1 WHERE id_otp = ?").run(otpRecord.id_otp);
      return res.status(400).json({ error: "Code incorrect" });
    }
    if (/* @__PURE__ */ new Date() > new Date(otpRecord.expires_at)) {
      db.prepare("UPDATE OtpRequests SET status = 'expired' WHERE id_otp = ?").run(otpRecord.id_otp);
      return res.status(400).json({ error: "Code expiré" });
    }
    db.prepare(`
            UPDATE OtpRequests
            SET status = 'verified', verified_at = datetime('now')
            WHERE id_otp = ?
        `).run(otpRecord.id_otp);
    const user = db.prepare(`
            SELECT u.*, tc.nom_type as type, p.nom_complet as name
            FROM Utilisateurs u
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            WHERE u.numero_telephone = ?
        `).get(phone);
    const token = "jwt-token-placeholder";
    res.json({
      success: true,
      message: "Connexion réussie",
      user: {
        id: user.id_utilisateur,
        phone: user.numero_telephone,
        type: user.type,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    res.status(400).json({ error: "Données invalides" });
  }
});
const otpRouter = router$6;
const router$5 = Router();
router$5.get("/", (_req, res) => {
  try {
    const categories = db.prepare(`
            SELECT id_categorie as id, nom_categorie as name, description, COALESCE(considere_poids, 0) as considerWeight
            FROM CategoriesAge
            ORDER BY id_categorie ASC
        `).all();
    res.json({ categories });
  } catch (error) {
    console.error("Failed to fetch age categories:", error);
    res.status(500).json({ error: "Failed to fetch age categories" });
  }
});
router$5.post("/", (req, res) => {
  const { name, description, considerWeight } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  try {
    const info = db.prepare("INSERT INTO CategoriesAge (nom_categorie, description, considere_poids) VALUES (?, ?, ?)").run(name, description || "", considerWeight ? 1 : 0);
    res.status(201).json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Category already exists" });
    }
    console.error("Failed to add category:", error);
    res.status(500).json({ error: "Failed to add category" });
  }
});
router$5.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, considerWeight } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  try {
    db.prepare("UPDATE CategoriesAge SET nom_categorie = ?, description = ?, considere_poids = ? WHERE id_categorie = ?").run(name, description || "", considerWeight ? 1 : 0, id);
    res.json({ success: true });
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Category name already exists" });
    }
    console.error("Failed to update category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});
router$5.delete("/:id", (req, res) => {
  const { id } = req.params;
  try {
    db.prepare("DELETE FROM CategoriesAge WHERE id_categorie = ?").run(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});
const categoriesAgeRouter = router$5;
const router$4 = Router();
router$4.get("/", (_req, res) => {
  try {
    const list = CountryList.getAll ? CountryList.getAll() : CountryList.default?.getAll ? CountryList.default.getAll() : [];
    const seenCodes = /* @__PURE__ */ new Set();
    const countries = list.filter((c) => {
      if (seenCodes.has(c.code)) {
        return false;
      }
      seenCodes.add(c.code);
      return true;
    }).map((c) => ({
      code: c.code,
      name: c.name,
      dialCode: c.dial_code,
      flag: c.flag
    }));
    countries.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ countries });
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});
router$4.get("/:code", (req, res) => {
  try {
    const { code } = req.params;
    const finder = CountryList.findOneByCountryCode || CountryList.default?.findOneByCountryCode;
    if (!finder) {
      return res.status(500).json({ error: "Country lookup not available" });
    }
    const country = finder(code.toUpperCase());
    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }
    res.json({
      code: country.code,
      name: country.name,
      dialCode: country.dial_code,
      flag: country.flag
    });
  } catch (error) {
    console.error("Failed to fetch country:", error);
    res.status(500).json({ error: "Failed to fetch country" });
  }
});
const countriesRouter = router$4;
const verifyRole = (allowedTypes) => {
  return (req, res, next) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ error: "Authentification requise (ID manquant)" });
    }
    try {
      const user = db.prepare(`
        SELECT tc.nom_type 
        FROM Utilisateurs u 
        JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte 
        WHERE u.id_utilisateur = ?
      `).get(userId);
      if (!user) {
        return res.status(401).json({ error: "Utilisateur non trouvé" });
      }
      const userRole = user.nom_type.toLowerCase();
      const normalizedAllowed = allowedTypes.map((t) => t.toLowerCase());
      if (!normalizedAllowed.includes(userRole)) {
        console.warn(`[Security] Access denied for user ${userId} (Role: ${userRole}) to ${req.originalUrl}`);
        return res.status(403).json({ error: "Accès refusé. Privilèges insuffisants." });
      }
      next();
    } catch (error) {
      console.error("verifyRole middleware error:", error);
      res.status(500).json({ error: "Erreur interne de vérification des rôles" });
    }
  };
};
const __filename$3 = fileURLToPath(import.meta.url);
path.dirname(__filename$3);
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
function saveBase64Image(base64Data, prefix = "med") {
  if (!base64Data || !base64Data.startsWith("data:image/")) return base64Data;
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Data;
    const type = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const extension = type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1];
    const filename = `${prefix}_${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Error saving image:", error);
    return base64Data;
  }
}
const router$3 = Router();
const medicationSchema = z.object({
  name: z.string().trim().min(2).max(255),
  unitId: z.number().int().nullable().optional(),
  defaultDose: z.number().nonnegative().nullable().optional(),
  description: z.string().max(2e3).optional().default(""),
  photoUrl: z.string().max(4e6).optional().default(""),
  price: z.string().max(50).optional().default(""),
  typeUtilisation: z.enum(["comprime", "sirop", "gelule", "pommade", "goutte", "spray", "injection"]).optional().default("comprime"),
  precautionAlimentaire: z.enum(["aucune", "eviter_alcool", "boire_beaucoup_eau", "eviter_produits_laitiers", "eviter_pamplemousse"]).optional().default("aucune"),
  posology: z.object({
    categorieAge: z.string().trim().min(1).max(100),
    doseRecommandee: z.number().nonnegative(),
    unitId: z.number().int().optional()
  }).optional()
});
router$3.use(verifyRole(["Administrateur"]));
router$3.get("/stats", (_req, res) => {
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM Utilisateurs").get();
    const prescriptionCount = db.prepare("SELECT COUNT(*) as count FROM Ordonnances").get();
    const medicationCount = db.prepare("SELECT COUNT(*) as count FROM Medicaments").get();
    const pharmacyCount = db.prepare("SELECT COUNT(*) as count FROM Pharmacies").get();
    const latestUsers = db.prepare(`
            SELECT u.id_utilisateur as id, u.cree_le as createdAt, COALESCE(p.nom_complet, u.numero_telephone, 'Utilisateur') as label
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON p.id_utilisateur = u.id_utilisateur
            ORDER BY u.id_utilisateur DESC
            LIMIT 2
        `).all();
    const latestPrescriptions = db.prepare(`
            SELECT id_ordonnance as id, date_ordonnance as createdAt, COALESCE(titre, 'Ordonnance') as label
            FROM Ordonnances
            ORDER BY id_ordonnance DESC
            LIMIT 2
        `).all();
    const latestPharmacies = db.prepare(`
            SELECT id_pharmacie as id, nom_pharmacie as label, adresse as createdAt
            FROM Pharmacies
            ORDER BY id_pharmacie DESC
            LIMIT 2
        `).all();
    const recentActivity = [
      ...latestUsers.map((u) => ({ id: `u-${u.id}`, type: "user", message: `Nouveau compte: ${u.label}`, time: u.createdAt || "Récent" })),
      ...latestPrescriptions.map((o) => ({ id: `o-${o.id}`, type: "prescription", message: `Ordonnance: ${o.label}`, time: o.createdAt || "Récent" })),
      ...latestPharmacies.map((p) => ({ id: `p-${p.id}`, type: "pharmacy", message: `Pharmacie: ${p.label}`, time: p.createdAt || "Récent" }))
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
router$3.get("/monthly-activity", (_req, res) => {
  try {
    const prescriptionsByMonth = db.prepare(`
            SELECT 
                strftime('%m', date_ordonnance) as month,
                strftime('%Y', date_ordonnance) as year,
                COUNT(*) as count
            FROM Ordonnances
            WHERE date_ordonnance >= date('now', '-7 months')
            GROUP BY year, month
            ORDER BY year, month
        `).all();
    const visitsByMonth = db.prepare(`
            SELECT 
                strftime('%m', cree_le) as month,
                strftime('%Y', cree_le) as year,
                COUNT(*) as count
            FROM Utilisateurs
            WHERE cree_le >= date('now', '-7 months')
            GROUP BY year, month
            ORDER BY year, month
        `).all();
    const months = [];
    const now = /* @__PURE__ */ new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("fr-FR", { month: "short" })
      });
    }
    const data = months.map((m) => {
      const presc = prescriptionsByMonth.find((p) => `${p.year}-${p.month}` === m.key);
      const inscriptions = visitsByMonth.find((v) => `${v.year}-${v.month}` === m.key);
      return {
        name: m.label.charAt(0).toUpperCase() + m.label.slice(1),
        prescriptions: presc?.count || 0,
        inscriptions: inscriptions?.count || 0
      };
    });
    res.json(data);
  } catch (error) {
    console.error("Error fetching monthly activity:", error);
    res.status(500).json({ error: "Failed to fetch monthly activity" });
  }
});
router$3.get("/users", (_req, res) => {
  try {
    const users = db.prepare(`
            SELECT u.id_utilisateur as id, u.email, u.numero_telephone as phone, tc.nom_type as type, p.nom_complet as name,
                   u.pin_hash as pin, u.pin_expires_at as pinExpiresAt, u.pin_updated_at as pinUpdatedAt
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
router$3.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const { id_type_compte } = req.body;
  try {
    db.prepare("UPDATE Utilisateurs SET id_type_compte = ? WHERE id_utilisateur = ?").run(id_type_compte, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
});
router$3.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  try {
    db.prepare("DELETE FROM Utilisateurs WHERE id_utilisateur = ?").run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});
router$3.post("/users", (req, res) => {
  const { email, phone, password, type, name } = req.body;
  try {
    const typeStr = String(type).toLowerCase();
    let typeId = 1;
    if (typeStr === "professionnel" || typeStr === "professional" || typeStr === "pharmacien" || typeStr === "pharmacist") typeId = 2;
    if (typeStr === "administrateur" || typeStr === "admin") typeId = 4;
    db.transaction(() => {
      const insertUser = db.prepare(`
                INSERT INTO Utilisateurs (email, mot_de_passe_hash, numero_telephone, id_type_compte)
                VALUES (?, ?, ?, ?)
            `).run(email || void 0, password || "defaultpassword123", phone || void 0, typeId);
      const userId = insertUser.lastInsertRowid;
      if (name) {
        db.prepare(`
                    INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet)
                    VALUES (?, ?)
                `).run(userId, name);
      }
    })();
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});
router$3.get("/medications", (_req, res) => {
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
router$3.get("/medications/:id", (req, res) => {
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
router$3.post("/medications", (req, res) => {
  const parsed = medicationSchema.safeParse({
    ...req.body,
    unitId: req.body?.unitId !== void 0 && req.body?.unitId !== null ? Number(req.body.unitId) : null,
    defaultDose: req.body?.defaultDose !== void 0 && req.body?.defaultDose !== null ? Number(req.body.defaultDose) : null,
    posology: req.body?.posology ? {
      ...req.body.posology,
      doseRecommandee: Number(req.body.posology.doseRecommandee),
      unitId: req.body.posology.unitId !== void 0 ? Number(req.body.posology.unitId) : void 0
    } : void 0
  });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid medication payload" });
  }
  const { name, unitId, defaultDose, description, photoUrl, price, typeUtilisation, precautionAlimentaire, posology } = parsed.data;
  try {
    const finalPhotoUrl = saveBase64Image(photoUrl || "", "med");
    const insertTx = db.transaction(() => {
      const result = db.prepare(`
                INSERT INTO Medicaments
                (nom, id_unite_par_defaut, dose_par_defaut, description, photo_url, prix, type_utilisation, precaution_alimentaire)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(name, unitId, defaultDose, description, finalPhotoUrl, price, typeUtilisation, precautionAlimentaire);
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
router$3.put("/medications/:id", (req, res) => {
  const { id } = req.params;
  const parsed = medicationSchema.safeParse({
    ...req.body,
    unitId: req.body?.unitId !== void 0 && req.body?.unitId !== null ? Number(req.body.unitId) : null,
    defaultDose: req.body?.defaultDose !== void 0 && req.body?.defaultDose !== null ? Number(req.body.defaultDose) : null,
    posology: req.body?.posology ? {
      ...req.body.posology,
      doseRecommandee: Number(req.body.posology.doseRecommandee),
      unitId: req.body.posology.unitId !== void 0 ? Number(req.body.posology.unitId) : void 0
    } : void 0
  });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid medication payload" });
  }
  const { name, unitId, defaultDose, description, photoUrl, price, typeUtilisation, precautionAlimentaire, posology } = parsed.data;
  try {
    const finalPhotoUrl = saveBase64Image(photoUrl || "", "med");
    const updateTx = db.transaction(() => {
      db.prepare(`
                UPDATE Medicaments
                SET nom = ?, id_unite_par_defaut = ?, dose_par_defaut = ?, description = ?, photo_url = ?, prix = ?,
                    type_utilisation = ?, precaution_alimentaire = ?
                WHERE id_medicament = ?
            `).run(name, unitId, defaultDose, description, finalPhotoUrl, price, typeUtilisation, precautionAlimentaire, id);
      if (posology) {
        db.prepare("DELETE FROM PosologieDefautMedicaments WHERE id_medicament = ? AND categorie_age = ?").run(id, posology.categorieAge);
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
router$3.delete("/medications/all", (req, res) => {
  try {
    db.transaction(() => {
      db.prepare("DELETE FROM StockMedicamentsPharmacie").run();
      db.prepare("DELETE FROM PosologieDefautMedicaments").run();
      db.prepare("DELETE FROM InteractionsMedicaments").run();
      db.prepare("DELETE FROM ElementsOrdonnance").run();
      db.prepare("DELETE FROM Medicaments").run();
    })();
    res.json({ success: true, message: "Tous les médicaments ont été supprimés." });
  } catch (error) {
    console.error("Failed to delete all medications:", error);
    res.status(500).json({ error: "Failed to delete all medications" });
  }
});
router$3.delete("/medications/:id", (req, res) => {
  const { id } = req.params;
  try {
    db.prepare("DELETE FROM Medicaments WHERE id_medicament = ?").run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete medication" });
  }
});
router$3.get("/settings", (_req, res) => {
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
router$3.put("/settings/:id", (req, res) => {
  const { id } = req.params;
  const { price, description, maxOrdonnances, maxRappels } = req.body;
  try {
    db.prepare("UPDATE TypesComptes SET description = ?, max_ordonnances = ?, max_rappels = ? WHERE id_type_compte = ?").run(description, maxOrdonnances, maxRappels, id);
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
router$3.get("/pharmacies", (_req, res) => {
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
router$3.get("/upgrade-requests", (_req, res) => {
  try {
    const requests = db.prepare(`
            SELECT r.id_request as id, r.id_utilisateur as userId, r.requested_type as requestedType,
                   r.status, r.motive, r.admin_notes as adminNotes, r.created_at as createdAt,
                   COALESCE(p.nom_complet, u.numero_telephone, 'Utilisateur') as userName,
                   u.numero_telephone as userPhone
            FROM UpgradeRequests r
            JOIN Utilisateurs u ON r.id_utilisateur = u.id_utilisateur
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            ORDER BY r.created_at DESC
        `).all();
    res.json({ requests });
  } catch (error) {
    console.error("Error fetching upgrade requests:", error);
    res.status(500).json({ error: "Failed to fetch upgrade requests" });
  }
});
router$3.post("/upgrade-requests/:id/process", (req, res) => {
  const { id } = req.params;
  const { status, adminNotes, processedBy } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    db.transaction(() => {
      db.prepare(`
                UPDATE UpgradeRequests 
                SET status = ?, admin_notes = ?, processed_at = CURRENT_TIMESTAMP, processed_by = ?
                WHERE id_request = ?
            `).run(status, adminNotes || null, processedBy || null, id);
      if (status === "approved") {
        const request = db.prepare("SELECT id_utilisateur, requested_type FROM UpgradeRequests WHERE id_request = ?").get(id);
        if (request) {
          let typeId = 1;
          const typeName = request.requested_type.toLowerCase();
          if (typeName === "commercial") typeId = 3;
          else if (typeName === "pro" || typeName === "professionnel") typeId = 2;
          else if (typeName === "admin" || typeName === "administrateur") typeId = 4;
          db.prepare("UPDATE Utilisateurs SET id_type_compte = ? WHERE id_utilisateur = ?").run(typeId, request.id_utilisateur);
        }
      }
    })();
    res.json({ success: true });
  } catch (error) {
    console.error("Error processing upgrade request:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});
router$3.get("/commercials", (_req, res) => {
  try {
    const commercials = db.prepare(`
            SELECT u.id_utilisateur as id, u.numero_telephone as phone, p.nom_complet as name,
                   (SELECT COUNT(*) FROM Utilisateurs WHERE id_createur = u.id_utilisateur) as clientCount
            FROM Utilisateurs u
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            WHERE tc.nom_type = 'Commercial'
            ORDER BY clientCount DESC
        `).all();
    res.json({ commercials });
  } catch (error) {
    console.error("Error fetching commercials:", error);
    res.status(500).json({ error: "Failed to fetch commercials" });
  }
});
router$3.get("/commercial-clients/:id", (req, res) => {
  const { id } = req.params;
  try {
    const clients = db.prepare(`
            SELECT u.id_utilisateur as id, u.numero_telephone as phone, p.nom_complet as name, u.est_valide as isValid, u.cree_le as createdAt
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            WHERE u.id_createur = ?
            ORDER BY u.cree_le DESC
        `).all(id);
    res.json({ clients });
  } catch (error) {
    console.error("Error fetching commercial clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});
router$3.patch("/reassign-client", (req, res) => {
  const { clientId, newCommercialId } = req.body;
  if (!clientId || !newCommercialId) {
    return res.status(400).json({ error: "ClientId and newCommercialId are required" });
  }
  try {
    db.prepare("UPDATE Utilisateurs SET id_createur = ? WHERE id_utilisateur = ?").run(newCommercialId, clientId);
    res.json({ success: true, message: "Client réattribué avec succès" });
  } catch (error) {
    console.error("Error reassigning client:", error);
    res.status(500).json({ error: "Failed to reassign client" });
  }
});
router$3.get("/unassigned-clients", (_req, res) => {
  try {
    const clients = db.prepare(`
            SELECT u.id_utilisateur as id, u.numero_telephone as phone, p.nom_complet as name, u.est_valide as isValid, u.cree_le as createdAt
            FROM Utilisateurs u
            LEFT JOIN ProfilsUtilisateurs p ON u.id_utilisateur = p.id_utilisateur
            JOIN TypesComptes tc ON u.id_type_compte = tc.id_type_compte
            WHERE u.id_createur IS NULL AND tc.nom_type = 'Standard'
            ORDER BY u.cree_le DESC
        `).all();
    res.json({ clients });
  } catch (error) {
    console.error("Error fetching unassigned clients:", error);
    res.status(500).json({ error: "Failed to fetch unassigned clients" });
  }
});
router$3.patch("/users/:id", (req, res) => {
  const { id } = req.params;
  const { phone, name } = req.body;
  try {
    const user = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE id_utilisateur = ?").get(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (phone) {
      db.prepare("UPDATE Utilisateurs SET numero_telephone = ? WHERE id_utilisateur = ?").run(phone, id);
    }
    if (name !== void 0) {
      const profile = db.prepare("SELECT id_utilisateur FROM ProfilsUtilisateurs WHERE id_utilisateur = ?").get(id);
      if (profile) {
        db.prepare("UPDATE ProfilsUtilisateurs SET nom_complet = ? WHERE id_utilisateur = ?").run(name, id);
      } else {
        db.prepare("INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)").run(id, name);
      }
    }
    res.json({ success: true, message: "Informations utilisateur mises à jour" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});
const adminRouter = router$3;
const router$2 = Router();
router$2.post("/send-otp", (req, res) => {
  const { phoneNumber, amount } = req.body;
  if (!phoneNumber || phoneNumber.length < 10) {
    return res.status(400).json({ error: "Numéro de téléphone invalide" });
  }
  try {
    const otpCode = Math.floor(1e5 + Math.random() * 9e5).toString();
    console.log(`OTP for ${phoneNumber}: ${otpCode}`);
    res.json({
      success: true,
      message: "Code OTP envoyé par SMS",
      // For demo only: return OTP in response
      otpCode: false ? otpCode : void 0
    });
  } catch (error) {
    console.error("OTP sending error:", error);
    res.status(500).json({ error: "Échec de l'envoi du code OTP" });
  }
});
router$2.post("/process", (req, res) => {
  const { userId, planId, phoneNumber, otpCode, amount, method } = req.body;
  if (!userId || !planId || !phoneNumber || !otpCode) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }
  if (method !== "orange_money") {
    return res.status(400).json({ error: "Méthode de paiement non supportée" });
  }
  try {
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      return res.status(400).json({ error: "Code OTP invalide" });
    }
    const plan = db.prepare("SELECT * FROM TypesComptes WHERE id_type = ?").get(planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan non trouvé" });
    }
    const typeMap2 = {
      "Standard": "standard",
      "Pro": "professional",
      "Professionnel": "professional",
      "Pharmacien": "professional",
      "Administrateur": "admin"
    };
    const userType = typeMap2[plan.nom_type] || "standard";
    db.prepare(`
            INSERT INTO Paiements (id_utilisateur, montant, devise, statut, date_paiement, reference)
            VALUES (?, ?, 'FCFA', 'complete', CURRENT_TIMESTAMP, ?)
        `).run(userId, amount || 0, `ORANGE-${Date.now()}-${phoneNumber.slice(-4)}`);
    db.prepare(`
            UPDATE Utilisateurs 
            SET id_type_compte = ? 
            WHERE id_utilisateur = ?
        `).run(plan.id_type, userId);
    console.log(`User ${userId} upgraded to ${userType} (plan: ${plan.nom_type}) via Orange Money`);
    res.json({
      success: true,
      message: "Paiement Orange Money traité avec succès",
      newType: userType
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({ error: "Échec du traitement du paiement" });
  }
});
router$2.get("/history/:userId", (req, res) => {
  const { userId } = req.params;
  try {
    const payments = db.prepare(`
            SELECT id_paiement as id, montant as amount, devise as currency, statut as status, 
                   date_paiement as date, reference
            FROM Paiements
            WHERE id_utilisateur = ?
            ORDER BY date_paiement DESC
            LIMIT 20
        `).all(userId);
    res.json({ payments });
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});
const paymentRouter = router$2;
const router$1 = Router();
function estimateReminderCount(type, intervalHours, durationDays, times) {
  const days = Number(durationDays) || 0;
  if (days <= 0 || type === "prn") return 0;
  if (type === "interval" && Number(intervalHours) > 0) {
    const interval = Number(intervalHours);
    let countPerDay = 0;
    let hour = 0;
    while (hour < 24) {
      countPerDay += 1;
      hour += interval;
    }
    return countPerDay * days;
  }
  const timesPerDay = Array.isArray(times) && times.length > 0 ? times.length : 1;
  return timesPerDay * days;
}
router$1.get("/", (req, res) => {
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
                u.numero_telephone as phone,
                COUNT(DISTINCT eo.id_element_ordonnance) as nombre_medicaments,
                COUNT(cp.id_calendrier_prise) as prises_totales,
                SUM(CASE WHEN cp.statut_prise = 1 THEN 1 ELSE 0 END) as prises_effectuees
            FROM Ordonnances o
            LEFT JOIN ElementsOrdonnance eo ON o.id_ordonnance = eo.id_ordonnance
            LEFT JOIN CalendrierPrises cp ON eo.id_element_ordonnance = cp.id_element_ordonnance
            JOIN Utilisateurs u ON o.id_utilisateur = u.id_utilisateur
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
router$1.get("/:id", (req, res) => {
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
                o.est_active,
                u.numero_telephone as phone
            FROM Ordonnances o
            JOIN Utilisateurs u ON o.id_utilisateur = u.id_utilisateur
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
router$1.put("/:id", (req, res) => {
  const { id } = req.params;
  const { titre, nom_patient, poids_patient, categorie_age } = req.body;
  const userId = req.headers["x-user-id"];
  console.log("Updating ordonnance:", id, { titre, nom_patient, poids_patient, categorie_age });
  try {
    if (userId) {
      const user = db.prepare("SELECT id_type_compte FROM Utilisateurs WHERE id_utilisateur = ?").get(userId);
      if (user?.id_type_compte === 3) {
        return res.status(403).json({ error: "Les commerciaux ne peuvent pas modifier les ordonnances après création." });
      }
    }
    const result = db.prepare(`
            UPDATE Ordonnances 
            SET titre = ?, nom_patient = ?, poids_patient = ?, categorie_age = ?
            WHERE id_ordonnance = ?
        `).run(titre || null, nom_patient || null, poids_patient || null, categorie_age || "adulte", id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Ordonnance not found" });
    }
    res.json({ success: true, message: "Ordonnance mise à jour" });
  } catch (error) {
    console.error("Failed to update ordonnance:", error);
    res.status(500).json({ error: "Failed to update ordonnance" });
  }
});
router$1.patch("/:id/cancel", (req, res) => {
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
router$1.patch("/:id/reactivate", (req, res) => {
  const { id } = req.params;
  try {
    const ordonnanceMeta = db.prepare(`
            SELECT id_ordonnance, id_utilisateur, est_active
            FROM Ordonnances
            WHERE id_ordonnance = ?
        `).get(id);
    if (!ordonnanceMeta) {
      return res.status(404).json({ error: "Ordonnance not found" });
    }
    if (Number(ordonnanceMeta.est_active) === 1) {
      return res.json({ success: true, message: "Ordonnance déjà active" });
    }
    refreshOrdonnanceActiveState(ordonnanceMeta.id_utilisateur);
    const limits = getUserAccountLimits(ordonnanceMeta.id_utilisateur);
    if (!limits) {
      return res.status(404).json({ error: "Compte utilisateur introuvable" });
    }
    const activeOrdonnances = countActiveOrdonnances(ordonnanceMeta.id_utilisateur);
    if (!isUnlimited(limits.maxOrdonnances) && activeOrdonnances >= Number(limits.maxOrdonnances)) {
      return res.status(403).json({
        error: `Quota dépassé: vous avez déjà ${activeOrdonnances}/${limits.maxOrdonnances} ordonnance(s) active(s).`
      });
    }
    const pendingRappelsCurrent = countPendingRappels(ordonnanceMeta.id_utilisateur);
    const pendingRappelsForOrdonnance = db.prepare(`
            SELECT COUNT(*) as count
            FROM CalendrierPrises cp
            JOIN ElementsOrdonnance eo ON cp.id_element_ordonnance = eo.id_element_ordonnance
            WHERE eo.id_ordonnance = ?
              AND cp.statut_prise = 0
        `).get(id);
    const projectedRappels = pendingRappelsCurrent + (pendingRappelsForOrdonnance?.count || 0);
    if (!isUnlimited(limits.maxRappels) && projectedRappels > Number(limits.maxRappels)) {
      return res.status(403).json({
        error: `Quota dépassé: cette validation créerait ${projectedRappels}/${limits.maxRappels} rappels actifs.`
      });
    }
    const result = db.prepare(`
            UPDATE Ordonnances 
            SET est_active = 1 
            WHERE id_ordonnance = ?
        `).run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Ordonnance not found" });
    }
    res.json({ success: true, message: "Ordonnance réactivée" });
  } catch (error) {
    console.error("Failed to reactivate ordonnance:", error);
    res.status(500).json({ error: "Failed to reactivate ordonnance" });
  }
});
router$1.delete("/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.headers["x-user-id"];
  try {
    if (userId) {
      const user = db.prepare("SELECT id_type_compte FROM Utilisateurs WHERE id_utilisateur = ?").get(userId);
      if (user?.id_type_compte === 3) {
        return res.status(403).json({ error: "Les commerciaux ne peuvent pas supprimer les ordonnances." });
      }
    }
    db.prepare(`
            DELETE FROM CalendrierPrises 
            WHERE id_element_ordonnance IN (
                SELECT id_element_ordonnance FROM ElementsOrdonnance WHERE id_ordonnance = ?
            )
        `).run(id);
    db.prepare(`DELETE FROM ElementsOrdonnance WHERE id_ordonnance = ?`).run(id);
    const result = db.prepare(`DELETE FROM Ordonnances WHERE id_ordonnance = ?`).run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Ordonnance not found" });
    }
    res.json({ success: true, message: "Ordonnance supprimée définitivement" });
  } catch (error) {
    console.error("Failed to delete ordonnance:", error);
    res.status(500).json({ error: "Failed to delete ordonnance" });
  }
});
router$1.post("/:id/medicaments", (req, res) => {
  const { id } = req.params;
  const { medicamentName, dose, type_frequence, intervalle_heures, duree_jours, times } = req.body;
  if (!medicamentName) {
    return res.status(400).json({ error: "Le nom du médicament est requis" });
  }
  try {
    const ordonnanceOwner = db.prepare(`SELECT id_utilisateur FROM Ordonnances WHERE id_ordonnance = ?`).get(id);
    if (!ordonnanceOwner) {
      return res.status(404).json({ error: "Ordonnance not found" });
    }
    const limits = getUserAccountLimits(ordonnanceOwner.id_utilisateur);
    if (!limits) {
      return res.status(404).json({ error: "User account not found" });
    }
    refreshOrdonnanceActiveState(ordonnanceOwner.id_utilisateur);
    const newReminderCount = estimateReminderCount(type_frequence, intervalle_heures, duree_jours, times);
    if (!isUnlimited(limits.maxRappels)) {
      const currentPending = countPendingRappels(ordonnanceOwner.id_utilisateur);
      if (currentPending + newReminderCount > Number(limits.maxRappels)) {
        return res.status(403).json({
          error: `Limite de rappels atteinte (${limits.maxRappels}). Rappels actuels: ${currentPending}, nouveaux: ${newReminderCount}.`
        });
      }
    }
    let med = db.prepare(`SELECT id_medicament FROM Medicaments WHERE nom = ?`).get(medicamentName);
    if (!med) {
      const result = db.prepare(`INSERT INTO Medicaments (nom) VALUES (?)`).run(medicamentName);
      med = { id_medicament: result.lastInsertRowid };
    }
    const elementResult = db.prepare(`
            INSERT INTO ElementsOrdonnance (id_ordonnance, id_medicament, dose_personnalisee, type_frequence, intervalle_heures, duree_jours)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, med.id_medicament, dose || 1, type_frequence || "1x", intervalle_heures || null, duree_jours || 1);
    const elementId = elementResult.lastInsertRowid;
    const ordonnanceDate = db.prepare(`SELECT date_ordonnance FROM Ordonnances WHERE id_ordonnance = ?`).get(id);
    const startDate = new Date(ordonnanceDate.date_ordonnance);
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      return [h || 8, m || 0];
    };
    const insertPrise = db.prepare(`
            INSERT INTO CalendrierPrises (id_element_ordonnance, heure_prevue, dose, id_unite, rappel_envoye, statut_prise)
            VALUES (?, ?, ?, ?, 0, 0)
        `);
    for (let day = 0; day < (duree_jours || 1); day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day);
      if (type_frequence === "interval" && intervalle_heures) {
        let hour = 0;
        while (hour < 24) {
          const priseDate = new Date(dayDate);
          priseDate.setHours(hour, 0, 0, 0);
          insertPrise.run(elementId, priseDate.toISOString(), dose || 1, 1);
          hour += intervalle_heures;
        }
      } else {
        const timesArray = times || ["08:00"];
        timesArray.forEach((timeStr) => {
          const [h, m] = parseTime(timeStr);
          const priseDate = new Date(dayDate);
          priseDate.setHours(h, m, 0, 0);
          insertPrise.run(elementId, priseDate.toISOString(), dose || 1, 1);
        });
      }
    }
    res.json({
      success: true,
      message: "Médicament ajouté",
      elementId
    });
  } catch (error) {
    console.error("Failed to add medicament:", error);
    res.status(500).json({ error: "Failed to add medicament" });
  }
});
router$1.put("/:id/medicaments/:elementId", (req, res) => {
  const { id, elementId } = req.params;
  const { dose, type_frequence, intervalle_heures, duree_jours, times } = req.body;
  try {
    const ordonnanceOwner = db.prepare(`SELECT id_utilisateur FROM Ordonnances WHERE id_ordonnance = ?`).get(id);
    if (!ordonnanceOwner) {
      return res.status(404).json({ error: "Ordonnance not found" });
    }
    const limits = getUserAccountLimits(ordonnanceOwner.id_utilisateur);
    if (!limits) {
      return res.status(404).json({ error: "User account not found" });
    }
    refreshOrdonnanceActiveState(ordonnanceOwner.id_utilisateur);
    const newReminderCount = estimateReminderCount(type_frequence, intervalle_heures, duree_jours, times);
    if (!isUnlimited(limits.maxRappels)) {
      const pendingExcludingCurrent = countPendingRappels(ordonnanceOwner.id_utilisateur, Number(elementId));
      if (pendingExcludingCurrent + newReminderCount > Number(limits.maxRappels)) {
        return res.status(403).json({
          error: `Limite de rappels atteinte (${limits.maxRappels}). Rappels actuels: ${pendingExcludingCurrent}, nouveaux: ${newReminderCount}.`
        });
      }
    }
    db.prepare(`
            UPDATE ElementsOrdonnance 
            SET dose_personnalisee = ?, type_frequence = ?, intervalle_heures = ?, duree_jours = ?
            WHERE id_element_ordonnance = ? AND id_ordonnance = ?
        `).run(dose, type_frequence, intervalle_heures || null, duree_jours, elementId, id);
    db.prepare(`DELETE FROM CalendrierPrises WHERE id_element_ordonnance = ?`).run(elementId);
    const ordonnanceDate = db.prepare(`SELECT date_ordonnance FROM Ordonnances WHERE id_ordonnance = ?`).get(id);
    const startDate = new Date(ordonnanceDate.date_ordonnance);
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      return [h || 8, m || 0];
    };
    const insertPrise = db.prepare(`
            INSERT INTO CalendrierPrises (id_element_ordonnance, heure_prevue, dose, id_unite, rappel_envoye, statut_prise)
            VALUES (?, ?, ?, ?, 0, 0)
        `);
    for (let day = 0; day < (duree_jours || 1); day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day);
      if (type_frequence === "interval" && intervalle_heures) {
        let hour = 0;
        while (hour < 24) {
          const priseDate = new Date(dayDate);
          priseDate.setHours(hour, 0, 0, 0);
          insertPrise.run(elementId, priseDate.toISOString(), dose || 1, 1);
          hour += intervalle_heures;
        }
      } else {
        const timesArray = times || ["08:00"];
        timesArray.forEach((timeStr) => {
          const [h, m] = parseTime(timeStr);
          const priseDate = new Date(dayDate);
          priseDate.setHours(h, m, 0, 0);
          insertPrise.run(elementId, priseDate.toISOString(), dose || 1, 1);
        });
      }
    }
    res.json({ success: true, message: "Médicament mis à jour" });
  } catch (error) {
    console.error("Failed to update medicament:", error);
    res.status(500).json({ error: "Failed to update medicament" });
  }
});
router$1.delete("/:id/medicaments/:elementId", (req, res) => {
  const { elementId } = req.params;
  try {
    db.prepare(`DELETE FROM CalendrierPrises WHERE id_element_ordonnance = ?`).run(elementId);
    const result = db.prepare(`DELETE FROM ElementsOrdonnance WHERE id_element_ordonnance = ?`).run(elementId);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Medicament not found" });
    }
    res.json({ success: true, message: "Médicament supprimé" });
  } catch (error) {
    console.error("Failed to delete medicament:", error);
    res.status(500).json({ error: "Failed to delete medicament" });
  }
});
router$1.patch("/prises/:priseId", (req, res) => {
  const { priseId } = req.params;
  const { heure_prevue, statut_prise } = req.body;
  try {
    const updates = [];
    const values = [];
    if (heure_prevue !== void 0) {
      updates.push("heure_prevue = ?");
      values.push(heure_prevue);
    }
    if (statut_prise !== void 0) {
      updates.push("statut_prise = ?");
      values.push(statut_prise ? 1 : 0);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }
    values.push(priseId);
    const result = db.prepare(`
            UPDATE CalendrierPrises 
            SET ${updates.join(", ")}
            WHERE id_calendrier_prise = ?
        `).run(...values);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Prise not found" });
    }
    res.json({ success: true, message: "Prise mise à jour" });
  } catch (error) {
    console.error("Failed to update prise:", error);
    res.status(500).json({ error: "Failed to update prise" });
  }
});
router$1.patch("/:id/prises/mark-all-taken", (req, res) => {
  const { id } = req.params;
  const { date } = req.body;
  try {
    let query = `
            UPDATE CalendrierPrises 
            SET statut_prise = 1 
            WHERE id_element_ordonnance IN (
                SELECT id_element_ordonnance FROM ElementsOrdonnance WHERE id_ordonnance = ?
            )
        `;
    const params = [id];
    if (date) {
      query += " AND date(heure_prevue) = date(?)";
      params.push(date);
    }
    const result = db.prepare(query).run(...params);
    res.json({
      success: true,
      message: `${result.changes} prise(s) marquée(s) comme effectuée(s)`
    });
  } catch (error) {
    console.error("Failed to mark prises as taken:", error);
    res.status(500).json({ error: "Failed to mark prises as taken" });
  }
});
const ordonnanceRouter = router$1;
const router = Router();
router.use(verifyRole(["Commercial", "Administrateur"]));
router.post("/register-client", async (req, res) => {
  const { commercialId, clientPhone, clientName, prescription, startDate } = req.body;
  if (!commercialId || !clientPhone || !clientName || !prescription) {
    return res.status(400).json({ error: "Tous les champs sont requis (Commercial ID, Phone, Name, Prescription)" });
  }
  try {
    console.log(`[Commercial] Register attempt by User ID: ${commercialId} for ${clientPhone}`);
    const commercial = db.prepare("SELECT id_type_compte FROM Utilisateurs WHERE id_utilisateur = ?").get(commercialId);
    if (!commercial) {
      console.warn(`[Commercial] User ${commercialId} not found in DB`);
      return res.status(403).json({ error: "Accès refusé. Utilisateur non trouvé." });
    }
    if (commercial.id_type_compte !== 3) {
      console.warn(`[Commercial] User ${commercialId} has type ${commercial.id_type_compte}, expected 3`);
      return res.status(403).json({ error: "Acces refusé. Seul un commercial peut inscrire des clients." });
    }
    const normalizedPhone = clientPhone.replace(/\s+/g, "");
    const existingUser = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?").get(normalizedPhone);
    if (existingUser) {
      return res.status(409).json({ error: "Ce numéro de téléphone est déjà associé à un compte existant." });
    }
    const generatedPin = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const insertTransaction = db.transaction(() => {
      const userStmt = db.prepare(`
                INSERT INTO Utilisateurs (numero_telephone, pin_hash, pin_expires_at, pin_updated_at, id_type_compte, id_createur, est_valide)
                VALUES (?, ?, ?, ?, 1, ?, 0)
            `);
      const userInfo = userStmt.run(normalizedPhone, generatedPin, expiresAt, updatedAt, commercialId);
      const idUtilisateur = userInfo.lastInsertRowid;
      db.prepare("INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)").run(idUtilisateur, clientName);
      const ordStmt = db.prepare(`
                INSERT INTO Ordonnances (id_utilisateur, titre, nom_patient, poids_patient, categorie_age, date_ordonnance, date_debut) 
                VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?)
            `);
      const ordInfo = ordStmt.run(
        idUtilisateur,
        prescription.title || "Ordonnance initiale",
        clientName,
        prescription.weight || 0,
        prescription.categorieAge || "adulte",
        startDate || null
      );
      const idOrdonnance = ordInfo.lastInsertRowid;
      for (const m of prescription.medications) {
        let medRecord = db.prepare("SELECT id_medicament FROM Medicaments WHERE LOWER(nom) = LOWER(?)").get(m.name);
        let idMedicament;
        if (!medRecord) {
          const mStmt = db.prepare("INSERT INTO Medicaments (nom) VALUES (?)");
          const mInfo = mStmt.run(m.name);
          idMedicament = mInfo.lastInsertRowid;
        } else {
          idMedicament = medRecord.id_medicament;
        }
        let unitId = 5;
        if (m.unit) {
          const uRecord = db.prepare("SELECT id_unite FROM Unites WHERE LOWER(nom_unite) = LOWER(?)").get(m.unit);
          if (uRecord) {
            unitId = uRecord.id_unite;
          } else {
            try {
              const uInfo = db.prepare("INSERT INTO Unites (nom_unite) VALUES (?)").run(m.unit);
              unitId = uInfo.lastInsertRowid;
            } catch (e) {
              const uRecordRetry = db.prepare("SELECT id_unite FROM Unites WHERE LOWER(nom_unite) = LOWER(?)").get(m.unit);
              if (uRecordRetry) unitId = uRecordRetry.id_unite;
            }
          }
        }
        const allowedFrequencies = ["matin", "midi", "soir"];
        const dbFrequence = allowedFrequencies.includes(m.frequencyType) ? m.frequencyType : "personnalise";
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
        if (m.frequencyType !== "prn") {
          const pStmt = db.prepare(`
                        INSERT INTO CalendrierPrises (id_element_ordonnance, heure_prevue, dose, id_unite, statut_prise)
                        VALUES (?, ?, ?, ?, 0)
                    `);
          let baseDate;
          if (startDate && typeof startDate === "string") {
            const [y, mm, dd] = startDate.split("-").map(Number);
            baseDate = new Date(y, mm - 1, dd, 12, 0, 0);
          } else {
            baseDate = /* @__PURE__ */ new Date();
            baseDate.setHours(12, 0, 0, 0);
          }
          for (let dayOffset = 0; dayOffset < (m.durationDays || 1); dayOffset++) {
            const currentDate = new Date(baseDate);
            currentDate.setDate(baseDate.getDate() + dayOffset);
            if (m.frequencyType === "interval" && m.intervalHours) {
              let currHour = 0;
              while (currHour < 24) {
                const d = new Date(currentDate);
                d.setHours(currHour, 0, 0, 0);
                pStmt.run(idElement, d.toISOString(), m.doseValue, unitId);
                currHour += m.intervalHours;
              }
            } else if (m.times && m.times.length > 0) {
              for (const timeStr of m.times) {
                const [h, min] = timeStr.split(":").map(Number);
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
    await notificationProvider.sendSMS(
      normalizedPhone,
      `Bienvenue sur TAKYMED ! Pour valider votre inscription faite par votre agent, donnez-lui ce code PIN : ${generatedPin}`
    ).catch((err) => console.error("SMS Warning:", err));
    res.status(201).json({ success: true, clientId: newUserId });
  } catch (error) {
    console.error("Commercial register-client error:", error);
    res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : "Erreur inconnue" });
  }
});
router.post("/add-prescription", async (req, res) => {
  const { commercialId, clientId, prescription } = req.body;
  if (!commercialId || !clientId || !prescription) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }
  try {
    const client = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE id_utilisateur = ? AND id_createur = ?").get(clientId, commercialId);
    if (!client) {
      return res.status(403).json({ error: "Accès refusé ou client non trouvé." });
    }
    const transaction = db.transaction(() => {
      const ordInfo = db.prepare(`
                INSERT INTO Ordonnances (id_utilisateur, titre, nom_patient, poids_patient, categorie_age, date_ordonnance)
                VALUES (?, ?, (SELECT nom_complet FROM ProfilsUtilisateurs WHERE id_utilisateur = ?), ?, ?, CURRENT_DATE)
            `).run(clientId, prescription.title || "Nouvelle Ordonnance", clientId, prescription.weight || 0, prescription.categorieAge || "adulte");
      const idOrdonnance = ordInfo.lastInsertRowid;
      for (const m of prescription.medications) {
        let medRecord = db.prepare("SELECT id_medicament FROM Medicaments WHERE LOWER(nom) = LOWER(?)").get(m.name);
        let idMedicament = medRecord ? medRecord.id_medicament : db.prepare("INSERT INTO Medicaments (nom) VALUES (?)").run(m.name).lastInsertRowid;
        const eoInfo = db.prepare(`
                    INSERT INTO ElementsOrdonnance (id_ordonnance, id_medicament, type_frequence, duree_jours, dose_personnalisee, id_unite_personnalisee)
                    VALUES (?, ?, ?, ?, ?, ?)
                 `).run(idOrdonnance, idMedicament, m.frequencyType || "matin", m.durationDays || 7, m.doseValue || 1, 5);
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
router.post("/validate-client", async (req, res) => {
  const { commercialId, clientPhone, pin } = req.body;
  try {
    const user = db.prepare(`
            SELECT id_utilisateur, pin_hash, est_valide 
            FROM Utilisateurs 
            WHERE numero_telephone = ? AND id_createur = ?
        `).get(clientPhone, commercialId);
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
router.delete("/clients/:id", (req, res) => {
  const { id } = req.params;
  const finalCommercialId = req.body && req.body.commercialId || req.query.commercialId;
  if (!finalCommercialId) {
    return res.status(400).json({ error: "Commercial ID requis" });
  }
  try {
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
const commercialRouter = router;
const REMINDER_CHECK_INTERVAL = 30 * 1e3;
let isChecking = false;
function generateCombinedReminderMessage(patientName, items) {
  if (items.length === 0) return "";
  const uniqueItemsMap = /* @__PURE__ */ new Map();
  items.forEach((item) => {
    if (!uniqueItemsMap.has(item.id_calendrier_prise)) {
      uniqueItemsMap.set(item.id_calendrier_prise, item);
    }
  });
  const uniqueItems = Array.from(uniqueItemsMap.values());
  const firstItem = uniqueItems[0];
  const scheduledTime = new Date(firstItem.heure_prevue);
  const hour = scheduledTime.getHours();
  const greeting = hour >= 18 || hour < 6 ? "Bonsoir" : "Bonjour";
  const timeStr = scheduledTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  const groupedMeds = /* @__PURE__ */ new Map();
  uniqueItems.forEach((item) => {
    const key = item.med_name;
    const current = groupedMeds.get(key) || { dose: 0, unite: item.nom_unite || "" };
    const doseNum = parseFloat(String(item.dose).replace(",", "."));
    if (!isNaN(doseNum)) {
      current.dose += doseNum;
    } else {
      if (current.dose === 0) current.rawDose = item.dose;
    }
    groupedMeds.set(key, current);
  });
  const medsList = Array.from(groupedMeds.entries()).map(([name, info]) => {
    const doseDisplay = info.rawDose || info.dose;
    return `${name} : ${doseDisplay} ${info.unite}`.trim();
  }).join("\n");
  return `${greeting} MR/Mme ${patientName} ; c'est l'heure de prendre vos médicaments de ${timeStr} :
${medsList}`;
}
let workerTimeout = null;
function startReminderWorker() {
  if (workerTimeout) {
    console.log("ℹ️ Reminder worker already running.");
    return;
  }
  console.log("🚀 Starting reminder worker (30s interval)...");
  const runWorker = async () => {
    try {
      await checkAndSendReminders();
      await handleVoiceFallbacks();
    } catch (err) {
      console.error("Error in reminder worker loop:", err);
    }
    workerTimeout = setTimeout(runWorker, REMINDER_CHECK_INTERVAL);
  };
  runWorker();
}
async function checkAndSendReminders() {
  if (isChecking) return;
  isChecking = true;
  try {
    const now = /* @__PURE__ */ new Date();
    const plus65Str = new Date(now.getTime() + 65 * 60 * 1e3).toISOString();
    const minus24HoursStr = new Date(now.getTime() - 24 * 60 * 60 * 1e3).toISOString();
    const retryCooldownStr = new Date(now.getTime() - 5 * 60 * 1e3).toISOString();
    const dueReminders = db.prepare(`
      SELECT
        cp.id_calendrier_prise,
        cp.heure_prevue,
        cp.dose,
        u.nom_unite,
        m.nom as med_name,
        o.nom_patient,
        pnu.valeur_contact,
        cn.nom_canal,
        u2.numero_telephone,
        u2.id_utilisateur,
        cp.tentatives_rappel
      FROM CalendrierPrises cp
      JOIN ElementsOrdonnance eo ON cp.id_element_ordonnance = eo.id_element_ordonnance
      JOIN Ordonnances o ON eo.id_ordonnance = o.id_ordonnance
      JOIN Medicaments m ON eo.id_medicament = m.id_medicament
      JOIN Unites u ON cp.id_unite = u.id_unite
      JOIN Utilisateurs u2 ON o.id_utilisateur = u2.id_utilisateur
      LEFT JOIN PreferencesNotificationUtilisateurs pnu ON u2.id_utilisateur = pnu.id_utilisateur
      LEFT JOIN CanauxNotification cn ON pnu.id_canal = cn.id_canal
      WHERE cp.rappel_envoye = 0
        AND cp.tentatives_rappel < 3
        AND (cp.dernier_essai IS NULL OR cp.dernier_essai <= ?)
        AND cp.heure_prevue <= ?
        AND cp.heure_prevue >= ?
        AND (pnu.est_active = 1 OR pnu.est_active IS NULL)
        AND o.est_active = 1
    `).all(retryCooldownStr, plus65Str, minus24HoursStr);
    if (dueReminders.length === 0) {
      return;
    }
    const groups = {};
    dueReminders.forEach((r) => {
      const contact = r.valeur_contact || r.numero_telephone;
      const key = `${contact}_${r.nom_patient}_${r.heure_prevue}_${r.nom_canal || "SMS"}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    for (const [key, items] of Object.entries(groups)) {
      const contact = items[0].valeur_contact || items[0].numero_telephone;
      try {
        await sendCombinedReminders(contact, items);
      } catch (error) {
        console.error(`Failed to send combined reminders to ${contact}:`, error);
      }
    }
  } catch (error) {
    console.error("Critical error in reminder worker:", error);
  } finally {
    isChecking = false;
  }
}
async function sendCombinedReminders(contact, items) {
  const patientName = items[0].nom_patient;
  const channel = items[0].nom_canal || "SMS";
  const userId = items[0].id_utilisateur;
  const message = generateCombinedReminderMessage(patientName, items);
  const ids = items.map((i) => i.id_calendrier_prise);
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`
    UPDATE CalendrierPrises 
    SET tentatives_rappel = tentatives_rappel + 1,
        dernier_essai = datetime('now'),
        rappel_envoye = 1
    WHERE id_calendrier_prise IN (${placeholders})
  `).run(...ids);
  console.log(`📤 [Attempt] Sending ${channel} to ${contact} (${items.length} items grouped)`);
  const jobId = db.prepare(`
    INSERT INTO NotificationJobs (id_utilisateur, channel, message, contact_value, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, 'processing')
  `).run(userId, channel, message, contact, (/* @__PURE__ */ new Date()).toISOString()).lastInsertRowid;
  let result;
  try {
    if (channel === "SMS") {
      result = await notificationProvider.sendSMS(contact, message);
    } else if (channel === "WhatsApp") {
      result = await notificationProvider.sendWhatsApp(contact, message);
    } else if (channel === "Appel") {
      result = await notificationProvider.sendVoiceCall(contact, message);
      if (result.success) result.statusOverride = "calling";
    } else {
      result = { success: false, error: "Unsupported channel" };
    }
  } catch (error) {
    result = { success: false, error: error.message };
  }
  const finalStatus = result.statusOverride || (result.success ? "sent" : "failed");
  db.prepare(`UPDATE NotificationJobs SET status = ?, processed_at = datetime('now') WHERE id_job = ?`).run(finalStatus, jobId);
  const providerName = notificationProvider.constructor.name.includes("Orange") ? "orange" : "mock";
  try {
    db.prepare(`
        INSERT INTO NotificationLogs (id_job, provider, channel, to_contact, message, status, error_message, provider_message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(jobId, providerName, channel, contact, message, finalStatus, result.error, result.messageId || null);
  } catch (logError) {
    console.error("Failed to insert notification log:", logError);
  }
  if (!result.success) {
    console.log(`❌ Failed: ${result.error}`);
  } else {
    console.log(`✅ Sent to ${patientName}`);
  }
}
async function handleVoiceFallbacks() {
  try {
    const pendingCalls = db.prepare(`
      SELECT nj.*, nl.provider_message_id 
      FROM NotificationJobs nj
      JOIN NotificationLogs nl ON nj.id_job = nl.id_job
      WHERE nj.channel = 'Appel' 
        AND nj.status = 'calling'
        AND nj.created_at <= datetime('now', '-1 minute')
    `).all();
    for (const job of pendingCalls) {
      console.log(`📞 Checking status for Call Job ${job.id_job} to ${job.contact_value}...`);
      const statusCheck = await notificationProvider.checkStatus(job.provider_message_id, "Voice");
      if (statusCheck.status === "answered") {
        console.log(`✅ Call ${job.id_job} was answered. No fallback needed.`);
        db.prepare(`UPDATE NotificationJobs SET status = 'sent' WHERE id_job = ?`).run(job.id_job);
      } else if (statusCheck.status === "no-answer") {
        console.log(`⌛ Call ${job.id_job} not answered. Triggering WhatsApp fallback...`);
        db.prepare(`UPDATE NotificationJobs SET status = 'fallback_triggered' WHERE id_job = ?`).run(job.id_job);
        const fallbackMsg = `${job.message}
(Ceci est un message de rappel suite à notre tentative d'appel restée sans réponse.)`;
        const waResult = await notificationProvider.sendWhatsApp(job.contact_value, fallbackMsg);
        const providerName = notificationProvider.constructor.name.includes("Orange") ? "orange" : "mock";
        const fallbackJobId = db.prepare(`
          INSERT INTO NotificationJobs (id_utilisateur, channel, message, contact_value, scheduled_at, status, processed_at)
          VALUES (?, 'WhatsApp', ?, ?, datetime('now'), ?, datetime('now'))
        `).run(job.id_utilisateur, fallbackMsg, job.contact_value, waResult.success ? "sent" : "failed").lastInsertRowid;
        db.prepare(`
          INSERT INTO NotificationLogs (id_job, provider, channel, to_contact, message, status, error_message, provider_message_id)
          VALUES (?, ?, 'WhatsApp', ?, ?, ?, ?, ?)
        `).run(fallbackJobId, providerName, job.contact_value, fallbackMsg, waResult.success ? "sent" : "failed", waResult.error, waResult.messageId || null);
      }
    }
  } catch (error) {
    console.error("Error in handleVoiceFallbacks:", error);
  }
}
const __filename$2 = fileURLToPath(import.meta.url);
path.dirname(__filename$2);
const logger = pino({ level: "info" });
const AUTH_STATE_DIR = path.join(process.cwd(), "data", "auth_info_baileys");
if (!fs.existsSync(AUTH_STATE_DIR)) {
  fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
}
let sock = null;
let connectionRetryCount = 0;
let connectingPromise = null;
async function connectToWhatsApp() {
  if (sock) return sock;
  if (connectingPromise) return connectingPromise;
  connectingPromise = (async () => {
    try {
      console.log("⏳ Initializing WhatsApp connection...");
      const result = await performConnection();
      connectingPromise = null;
      return result;
    } catch (err) {
      connectingPromise = null;
      throw err;
    }
  })();
  return connectingPromise;
}
async function performConnection() {
  if (sock) return sock;
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_STATE_DIR);
  if (state.creds.registered) {
    console.log("✅ Found existing WhatsApp session. Connecting...");
  } else {
    console.log("ℹ️ No existing session found. Awaiting QR scan...");
  }
  const { version, isLatest } = await fetchLatestBaileysVersion();
  sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    logger,
    browser: ["TAKYMED", "Chrome", "110.0.0"],
    syncFullHistory: false
  });
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📸 NEW QR CODE GENERATED - Scan with WhatsApp:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      qrcode.generate(qr, { small: true });
      console.log("\n(If you don't see the QR code, ensure your terminal supports ANSI)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const isAuthError = statusCode === DisconnectReason.badSession || statusCode === 401 || statusCode === 403;
      console.log(`🔴 WhatsApp Connection closed (Status: ${statusCode}). Should Reconnect: ${shouldReconnect}`);
      if (!shouldReconnect || isAuthError) {
        console.log("⚠️  Critical connection error or logged out. Resetting session...");
        if (fs.existsSync(AUTH_STATE_DIR)) {
          try {
            const files = fs.readdirSync(AUTH_STATE_DIR);
            for (const file of files) {
              fs.unlinkSync(path.join(AUTH_STATE_DIR, file));
            }
          } catch (e) {
            console.error("Failed to clear AUTH_STATE_DIR:", e);
          }
        }
        sock = null;
        connectionRetryCount = 0;
        if (shouldReconnect) {
          console.log("🔄 Attempting fresh start after reset...");
          setTimeout(() => connectToWhatsApp(), 5e3);
        }
      } else if (connectionRetryCount < 15) {
        connectionRetryCount++;
        sock = null;
        const backoff = Math.min(3e4, 2e3 * Math.pow(1.5, connectionRetryCount));
        console.log(`🔄 Attempting reconnection session #${connectionRetryCount} in ${Math.round(backoff / 1e3)}s...`);
        setTimeout(() => connectToWhatsApp(), backoff);
      } else {
        console.log("❌ Maximum reconnection attempts reached. Please check server status.");
        sock = null;
        connectionRetryCount = 0;
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp Connection Opened for TAKYMED!");
      connectionRetryCount = 0;
    }
  });
  sock.ev.on("creds.update", saveCreds);
  return sock;
}
async function sendWhatsAppMessage(to, text) {
  try {
    const currentSock = await connectToWhatsApp();
    if (!currentSock) return { success: false, error: "Socket not initialized" };
    const cleanTo = to.replace(/\D/g, "");
    if (!cleanTo) return { success: false, error: "Invalid phone number format" };
    const jid = `${cleanTo}@s.whatsapp.net`;
    console.log(`📡 Preparing to send WhatsApp to ${jid}...`);
    await currentSock.presenceSubscribe(jid);
    const delay = Math.floor(Math.random() * 2500) + 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));
    await currentSock.sendPresenceUpdate("composing", jid);
    const typingDelay = Math.floor(Math.random() * 1e3) + 500;
    await new Promise((resolve) => setTimeout(resolve, typingDelay));
    await currentSock.sendPresenceUpdate("paused", jid);
    const result = await currentSock.sendMessage(jid, { text });
    if (result && result.key) {
      console.log(`📤 Message sent successfully to ${jid}. ID: ${result.key.id}`);
      return { success: true, messageId: result.key.id };
    }
    return { success: true, messageId: "unknown" };
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}
async function sendWhatsAppVoice(to, message) {
  try {
    const currentSock = await connectToWhatsApp();
    if (!currentSock) return { success: false, error: "WhatsApp service not initialized" };
    const cleanTo = to.replace(/\D/g, "");
    if (!cleanTo) return { success: false, error: "Invalid phone number format" };
    const jid = `${cleanTo}@s.whatsapp.net`;
    const gtts = new gTTS(message, "fr");
    const tempDir = path.join(process.cwd(), "data", "temp_audio");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, `voice_${Date.now()}.mp3`);
    return new Promise((resolve) => {
      gtts.save(filePath, async (err) => {
        if (err) {
          console.error("[gTTS] Error saving audio:", err);
          return resolve({ success: false, error: "Failed to generate audio" });
        }
        try {
          console.log(`📡 Sending Voice Note to ${jid}...`);
          const delay = Math.floor(Math.random() * 2e3) + 1e3;
          await new Promise((r) => setTimeout(r, delay));
          const result = await currentSock.sendMessage(jid, {
            audio: { url: filePath },
            mimetype: "audio/mp4",
            ptt: true
          });
          setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          }, 6e4);
          if (result && result.key) {
            return resolve({ success: true, messageId: result.key.id });
          }
          resolve({ success: false, error: "Failed to obtain result key" });
        } catch (sendErr) {
          console.error("[WhatsApp Voice] Send error:", sendErr);
          resolve({ success: false, error: sendErr.message });
        }
      });
    });
  } catch (error) {
    console.error("[WhatsApp Voice] Critical error:", error);
    return { success: false, error: error.message };
  }
}
const whatsappProvider = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  connectToWhatsApp,
  sendWhatsAppMessage,
  sendWhatsAppVoice
}, Symbol.toStringTag, { value: "Module" }));
initializeDatabase();
function createServer() {
  const app2 = express__default();
  const configuredOrigins = (process.env.CORS_ORIGIN || "").split(",").map((origin) => origin.trim()).filter(Boolean);
  const defaultOrigins = [
    "https://takymed.com",
    "https://www.takymed.com",
    "http://takymed.com",
    "http://www.takymed.com",
    "https://dev.takymed.com",
    "http://dev.takymed.com",
    "http://localhost:3500"
  ];
  const allowedOrigins = /* @__PURE__ */ new Set([...defaultOrigins, ...configuredOrigins]);
  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "X-Requested-With"
    ],
    optionsSuccessStatus: 204
  };
  app2.use(cors(corsOptions));
  app2.options("*", cors(corsOptions));
  app2.use(express__default.json({ limit: "10mb" }));
  app2.use(express__default.urlencoded({ extended: true, limit: "10mb" }));
  app2.use(express__default.static("public"));
  app2.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob: ws: wss:;"
    );
    next();
  });
  app2.get("/", (_req, res) => {
    res.redirect("/api");
  });
  app2.get(["/api", "/api/"], (_req, res) => {
    res.json({
      status: "ok",
      message: "TAKYMED API is running",
      endpoints: {
        health: "/api",
        ping: "/api/ping"
      }
    });
  });
  app2.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app2.use("/api/auth", authRouter);
  app2.use("/api/otp", otpRouter);
  app2.use("/api/prescriptions", prescriptionRouter);
  app2.use("/api/medications", medicationRouter);
  app2.use("/api/pharmacies", pharmacyRouter);
  app2.use("/api/categories", categoriesAgeRouter);
  app2.use("/api/countries", countriesRouter);
  app2.use("/api/admin", adminRouter);
  app2.use("/api/payments", paymentRouter);
  app2.use("/api/ordonnances", ordonnanceRouter);
  app2.use("/api/notifications", notificationRouter);
  app2.use("/api/commercial", commercialRouter);
  connectToWhatsApp().catch((err) => console.error("WhatsApp Init Error:", err));
  startReminderWorker();
  return app2;
}
const app = createServer();
const port = Number(process.env.PORT) || 3e3;
const sslPort = Number(process.env.SSL_PORT) || 443;
const domain = process.env.DOMAIN || "localhost";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
const distPath = path.join(__dirname$1, "../spa");
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});
const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
const keyPath = `/etc/letsencrypt/live/${domain}/privkey.pem`;
const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);
if (hasSSL) {
  const sslOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
  https.createServer(sslOptions, app).listen(sslPort, "0.0.0.0", () => {
    console.log(`� HTTPS Server running on port ${sslPort}`);
    console.log(`📱 Frontend: https://${domain}:${sslPort}`);
    console.log(`🔧 API: https://${domain}:${sslPort}/api`);
  });
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${domain}:${sslPort}${req.url}` });
    res.end();
  }).listen(port, "0.0.0.0", () => {
    console.log(`🔄 HTTP redirect server on port ${port} → HTTPS ${sslPort}`);
  });
} else {
  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 HTTP Server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
    console.log(`⚠️  SSL certificates not found at ${certPath}`);
    console.log(`   Run: certbot certonly --standalone -d ${domain}`);
  });
}
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
//# sourceMappingURL=node-build.mjs.map
