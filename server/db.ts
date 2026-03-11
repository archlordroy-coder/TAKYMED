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
                    description TEXT
                )
            `);
            const catAgeCount = db.prepare("SELECT COUNT(*) as count FROM CategoriesAge").get() as { count: number };
            if (catAgeCount.count === 0) {
                console.log("Adding default age categories...");
                db.prepare("INSERT INTO CategoriesAge (nom_categorie, description) VALUES (?, ?)").run('bébé', '0 à 2 ans');
                db.prepare("INSERT INTO CategoriesAge (nom_categorie, description) VALUES (?, ?)").run('enfant', '2 à 12 ans');
                db.prepare("INSERT INTO CategoriesAge (nom_categorie, description) VALUES (?, ?)").run('adulte', 'Plus de 12 ans');
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
        }
    } catch (error) {
        console.error("Failed to initialize database:", error);
        throw error;
    }
}
