import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the project root robustly (works whether in src/server or dist/server)
const projectRoot = __dirname.includes('dist') ? path.join(__dirname, "../../") : path.join(__dirname, "../");

// Path to our SQLite database file
const dbPath = process.env.DB_PATH || path.join(projectRoot, "bd.sqlite");
const sqlScriptPath = path.join(projectRoot, "bd.sql");

// Create or open the database
export const db = new Database(dbPath, {
    verbose: console.log
});

// Enable modern SQLite features for better performance and safety
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/**
 * Initializes the database by running the bd.sql script if the tables don't exist.
 */
export function initializeDatabase() {
    try {
        // Check if a core table like 'Utilisateurs' exists
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Utilisateurs'");
        const exists = tableCheck.get();

        if (!exists) {
            console.log("Database tables not found. Initializing from bd.sql...");
            const sqlScript = fs.readFileSync(sqlScriptPath, "utf-8");

            // better-sqlite3 handles multiple statements using .exec()
            // Note: SQLite doesn't natively support ENUMs like MySQL/MariaDB, 
            // but it will accept the syntax and map it to TEXT.
            db.exec(sqlScript);
            console.log("Database initialized successfully.");
        } else {
            console.log("Database tables already exist. Skipping initialization.");

            // Check for missing columns in Medicaments (Migration)
            const medicamentColumns = db.prepare("PRAGMA table_info(Medicaments)").all() as { name: string }[];
            const hasDateAjout = medicamentColumns.some(c => c.name === 'date_ajout');
            const hasPrix = medicamentColumns.some(c => c.name === 'prix');

            if (!hasDateAjout) {
                console.log("Adding date_ajout column to Medicaments...");
                db.exec("ALTER TABLE Medicaments ADD COLUMN date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP");
            }
            if (!hasPrix) {
                console.log("Adding prix column to Medicaments...");
                db.exec("ALTER TABLE Medicaments ADD COLUMN prix VARCHAR(50)");
            }

            // Check for missing columns in Pharmacies (Migration)
            const pharmacyColumns = db.prepare("PRAGMA table_info(Pharmacies)").all() as { name: string }[];
            const hasLat = pharmacyColumns.some(c => c.name === 'latitude');
            const hasLng = pharmacyColumns.some(c => c.name === 'longitude');

            if (!hasLat) {
                console.log("Adding latitude column to Pharmacies...");
                db.exec("ALTER TABLE Pharmacies ADD COLUMN latitude REAL");
            }
            if (!hasLng) {
                console.log("Adding longitude column to Pharmacies...");
                db.exec("ALTER TABLE Pharmacies ADD COLUMN longitude REAL");
            }

            // New Migrations for Phase 8
            const ordonnanceColumns = db.prepare("PRAGMA table_info(Ordonnances)").all() as { name: string }[];
            const hasCategorieAge = ordonnanceColumns.some(c => c.name === 'categorie_age');
            if (!hasCategorieAge) {
                console.log("Adding categorie_age column to Ordonnances...");
                db.exec("ALTER TABLE Ordonnances ADD COLUMN categorie_age TEXT DEFAULT 'adulte'");
            }

            // New Migrations for Phase 14
            const typeComptesColumns = db.prepare("PRAGMA table_info(TypesComptes)").all() as { name: string }[];
            const hasMaxOrdonnances = typeComptesColumns.some(c => c.name === 'max_ordonnances');
            const hasMaxRappels = typeComptesColumns.some(c => c.name === 'max_rappels');

            if (!hasMaxOrdonnances) {
                console.log("Adding max_ordonnances column to TypesComptes...");
                db.exec("ALTER TABLE TypesComptes ADD COLUMN max_ordonnances INT DEFAULT -1");
            }
            if (!hasMaxRappels) {
                console.log("Adding max_rappels column to TypesComptes...");
                db.exec("ALTER TABLE TypesComptes ADD COLUMN max_rappels INT DEFAULT -1");
            }

            // Create CategoriesAge table
            db.exec(`
                CREATE TABLE IF NOT EXISTS CategoriesAge (
                    id_categorie INTEGER PRIMARY KEY AUTOINCREMENT,
                    nom_categorie TEXT NOT NULL UNIQUE,
                    description TEXT,
                    considere_poids BOOLEAN DEFAULT 0
                )
            `);
            const catAgeCount = db.prepare("SELECT COUNT(*) as count FROM CategoriesAge").get() as { count: number };
            if (catAgeCount.count === 0) {
                console.log("Adding default age categories...");
                db.prepare("INSERT INTO CategoriesAge (nom_categorie, description, considere_poids) VALUES (?, ?, ?)").run('bébé', '0 à 2 ans', 1);
                db.prepare("INSERT INTO CategoriesAge (nom_categorie, description, considere_poids) VALUES (?, ?, ?)").run('enfant', '2 à 12 ans', 1);
                db.prepare("INSERT INTO CategoriesAge (nom_categorie, description, considere_poids) VALUES (?, ?, ?)").run('adulte', 'Plus de 12 ans', 0);
            }

            // Create PosologieDefautMedicaments table if not exists (Updated for dynamic categories)
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


            // Migration: allow dynamic age categories in PosologieDefautMedicaments
            const posologyTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='PosologieDefautMedicaments'").get() as { sql?: string } | undefined;
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

            // Migration: allow dynamic age categories and cleanup Ordonnances
            const ordonnanceSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='Ordonnances'").get() as { sql?: string } | undefined;
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

            // Migration for Phase 2: date_debut
            const ordonnanceCols = db.prepare("PRAGMA table_info(Ordonnances)").all() as { name: string }[];
            if (!ordonnanceCols.some(c => c.name === 'date_debut')) {
                console.log("Adding date_debut column to Ordonnances...");
                db.exec("ALTER TABLE Ordonnances ADD COLUMN date_debut DATE");
                // Initialize date_debut with date_ordonnance for existing records
                db.exec("UPDATE Ordonnances SET date_debut = date_ordonnance WHERE date_debut IS NULL");
            }

            // Phase 9: Admin Account Initialization
            const adminType = db.prepare("SELECT id_type_compte FROM TypesComptes WHERE nom_type = 'Administrateur'").get();
            if (!adminType) {
                console.log("Adding 'Administrateur' account type...");
                db.prepare("INSERT INTO TypesComptes (nom_type, description, max_ordonnances_actives, limite_notifications, necessite_paiement, max_pharmacies) VALUES (?, ?, ?, ?, ?, ?)")
                    .run('Administrateur', 'Accès complet au système', null, null, 0, null);
            }

            const getAdminTypeId = () => db.prepare("SELECT id_type_compte FROM TypesComptes WHERE nom_type = 'Administrateur'").get() as { id_type_compte: number };
            const adminPhone = process.env.ADMIN_PHONE || 'admin';
            const adminPin = process.env.ADMIN_PIN || 'admin';
            const adminUser = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = ?").get(adminPhone);

            if (!adminUser) {
                console.log("Creating default admin user (admin/admin)...");
                const adminTypeId = getAdminTypeId().id_type_compte;
                const info = db.prepare("INSERT INTO Utilisateurs (numero_telephone, pin_hash, id_type_compte, est_pharmacien) VALUES (?, ?, ?, 1)")
                    .run(adminPhone, adminPin, adminTypeId);

                db.prepare("INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)")
                    .run(info.lastInsertRowid, 'Administrateur Système');
            }

            // Create test users for Professional and Pharmacist accounts
            const proType = db.prepare("SELECT id_type_compte FROM TypesComptes WHERE nom_type = 'Professionnel'").get() as { id_type_compte: number };
            const pharmType = db.prepare("SELECT id_type_compte FROM TypesComptes WHERE nom_type = 'Pharmacien'").get() as { id_type_compte: number };

            const proUser = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = '+237 612345678'").get();
            if (!proUser && proType) {
                console.log("Creating test professional user (+237 612345678 / 1234)...");
                const info = db.prepare("INSERT INTO Utilisateurs (numero_telephone, pin_hash, id_type_compte, est_pharmacien) VALUES (?, ?, ?, 0)")
                    .run('+237 612345678', '1234', proType.id_type_compte);
                db.prepare("INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)")
                    .run(info.lastInsertRowid, 'Utilisateur Professionnel');
            }

            const pharmUser = db.prepare("SELECT id_utilisateur FROM Utilisateurs WHERE numero_telephone = '+237 699999999'").get();
            if (!pharmUser && pharmType) {
                console.log("Creating test pharmacist user (+237 699999999 / 1234)...");
                const info = db.prepare("INSERT INTO Utilisateurs (numero_telephone, pin_hash, id_type_compte, est_pharmacien) VALUES (?, ?, ?, 1)")
                    .run('+237 699999999', '1234', pharmType.id_type_compte);
                db.prepare("INSERT INTO ProfilsUtilisateurs (id_utilisateur, nom_complet) VALUES (?, ?)")
                    .run(info.lastInsertRowid, 'Pharmacien Test');
            }

            // Create UpgradeRequests table for account upgrade requests
            db.exec(`
                CREATE TABLE IF NOT EXISTS UpgradeRequests (
                    id_request INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_utilisateur INTEGER NOT NULL,
                    requested_type TEXT NOT NULL CHECK(requested_type IN ('Professionnel', 'Pharmacien')),
                    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                    admin_notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    processed_at DATETIME,
                    processed_by INTEGER,
                    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE,
                    FOREIGN KEY (processed_by) REFERENCES Utilisateurs(id_utilisateur)
                )
            `);
        }
    } catch (error) {
        console.error("Failed to initialize database:", error);
        throw error;
    }
}
