-- =========================================
-- BASE : GESTION DES ORDONNANCES MEDICALES
-- =========================================
-- ===============================
-- HEURES REPAS
-- ===============================
CREATE TABLE IF NOT EXISTS HeurespriseDefaut (
    id_heure_repas INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_repas VARCHAR(50) UNIQUE NOT NULL,
    heure_par_defaut TIME NOT NULL
);
INSERT
    OR IGNORE INTO HeurespriseDefaut (nom_repas, heure_par_defaut)
VALUES ('matin', '08:00:00'),
    ('midi', '12:00:00'),
    ('soir', '18:00:00');
-- ===============================
-- UNITES
-- ===============================
CREATE TABLE IF NOT EXISTS Unites (
    id_unite INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_unite VARCHAR(50) UNIQUE NOT NULL
);
INSERT
    OR IGNORE INTO Unites (nom_unite)
VALUES ('mg'),
    ('ml'),
    ('comprimé'),
    ('goutte'),
    ('unité');
-- ===============================
-- TYPES COMPTES
-- ===============================
CREATE TABLE IF NOT EXISTS TypesComptes (
    id_type_compte INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_type VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    max_ordonnances INT,
    max_rappels INT,
    necessite_paiement BOOLEAN DEFAULT FALSE,
    max_pharmacies INT
);
INSERT
    OR IGNORE INTO TypesComptes (
        nom_type,
        description,
        max_ordonnances,
        max_rappels,
        necessite_paiement,
        max_pharmacies
    )
VALUES ('Standard', 'Compte limité', 1, 3, 0, NULL),
    (
        'Professionnel',
        'Compte Pro avancé',
        NULL,
        NULL,
        1,
        5
    ),
    (
        'Administrateur',
        'Accès complet au système',
        NULL,
        NULL,
        0,
        NULL
    );
-- ===============================
-- FRAIS COMPTES
-- ===============================
CREATE TABLE IF NOT EXISTS FraisComptesProfessionnels (
    id_frais INTEGER PRIMARY KEY AUTOINCREMENT,
    id_type_compte INTEGER UNIQUE NOT NULL,
    montant DECIMAL(10, 2) NOT NULL,
    devise VARCHAR(10) DEFAULT 'FCFA',
    FOREIGN KEY (id_type_compte) REFERENCES TypesComptes(id_type_compte) ON DELETE CASCADE
);
INSERT
    OR IGNORE INTO FraisComptesProfessionnels (id_type_compte, montant, devise)
VALUES (2, 5000, 'FCFA');
-- ===============================
-- UTILISATEURS
-- ===============================
CREATE TABLE IF NOT EXISTS Utilisateurs (
    id_utilisateur INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE,
    mot_de_passe_hash VARCHAR(255),
    numero_telephone VARCHAR(20) UNIQUE,
    pin_hash VARCHAR(255),
    expiration_pin DATETIME,
    id_type_compte INT NOT NULL,
    est_pharmacien BOOLEAN DEFAULT FALSE,
    cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_type_compte) REFERENCES TypesComptes(id_type_compte)
);
-- ===============================
-- PROFIL
-- ===============================
CREATE TABLE IF NOT EXISTS ProfilsUtilisateurs (
    id_profil INTEGER PRIMARY KEY AUTOINCREMENT,
    id_utilisateur INT UNIQUE NOT NULL,
    nom_complet VARCHAR(255),
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE
);
-- ===============================
-- MEDICAMENTS
-- ===============================
CREATE TABLE IF NOT EXISTS Medicaments (
    id_medicament INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(255) UNIQUE NOT NULL,
    dose_par_defaut DECIMAL(10, 2),
    id_unite_par_defaut INT,
    description TEXT,
    photo_url TEXT,
    mode_administration TEXT DEFAULT 'orale',
    moment_repas TEXT DEFAULT 'indifferent',
    precaution_alimentaire TEXT DEFAULT 'aucune',
    type_utilisation TEXT,
    FOREIGN KEY (id_unite_par_defaut) REFERENCES Unites(id_unite)
);
-- ===============================
-- POSOLOGIE DEFAUT
-- ===============================
CREATE TABLE IF NOT EXISTS PosologieDefautMedicaments (
    id_posologie INTEGER PRIMARY KEY AUTOINCREMENT,
    id_medicament INT NOT NULL,
    categorie_age TEXT,
    dose_recommandee DECIMAL(10, 2),
    id_unite INT,
    FOREIGN KEY (id_medicament) REFERENCES Medicaments(id_medicament) ON DELETE CASCADE,
    FOREIGN KEY (id_unite) REFERENCES Unites(id_unite)
);
-- ===============================
-- ORDONNANCES
-- ===============================
CREATE TABLE IF NOT EXISTS Ordonnances (
    id_ordonnance INTEGER PRIMARY KEY AUTOINCREMENT,
    id_utilisateur INT NOT NULL,
    titre VARCHAR(255),
    nom_patient VARCHAR(255),
    categorie_age TEXT DEFAULT 'adulte',
    poids_patient DECIMAL(5, 2),
    date_ordonnance DATE DEFAULT CURRENT_DATE,
    date_debut DATE,
    est_active BOOLEAN DEFAULT TRUE,
    cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE
);
-- ===============================
-- ELEMENTS ORDONNANCE
-- ===============================
CREATE TABLE IF NOT EXISTS ElementsOrdonnance (
    id_element_ordonnance INTEGER PRIMARY KEY AUTOINCREMENT,
    id_ordonnance INT NOT NULL,
    id_medicament INT NOT NULL,
    type_frequence TEXT NOT NULL,
    intervalle_heures INT,
    duree_jours INT NOT NULL,
    dose_personnalisee DECIMAL(10, 2),
    id_unite_personnalisee INT,
    instructions_speciales TEXT,
    FOREIGN KEY (id_ordonnance) REFERENCES Ordonnances(id_ordonnance) ON DELETE CASCADE,
    FOREIGN KEY (id_medicament) REFERENCES Medicaments(id_medicament),
    FOREIGN KEY (id_unite_personnalisee) REFERENCES Unites(id_unite)
);
-- ===============================
-- CALENDRIER PRISES
-- ===============================
CREATE TABLE IF NOT EXISTS CalendrierPrises (
    id_calendrier_prise INTEGER PRIMARY KEY AUTOINCREMENT,
    id_element_ordonnance INT NOT NULL,
    heure_prevue DATETIME NOT NULL,
    dose DECIMAL(10, 2),
    id_unite INT,
    rappel_envoye BOOLEAN DEFAULT FALSE,
    statut_prise BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_element_ordonnance) REFERENCES ElementsOrdonnance(id_element_ordonnance) ON DELETE CASCADE,
    FOREIGN KEY (id_unite) REFERENCES Unites(id_unite)
);
-- ===============================
-- CANAUX NOTIFICATION
-- ===============================
CREATE TABLE IF NOT EXISTS CanauxNotification (
    id_canal INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_canal VARCHAR(50) UNIQUE
);
INSERT
    OR IGNORE INTO CanauxNotification (nom_canal)
VALUES ('SMS'),
    ('WhatsApp'),
    ('Appel'),
    ('Push');
-- ===============================
-- PREFERENCES NOTIFICATION
-- ===============================
CREATE TABLE IF NOT EXISTS PreferencesNotificationUtilisateurs (
    id_preference INTEGER PRIMARY KEY AUTOINCREMENT,
    id_utilisateur INT,
    id_canal INT,
    valeur_contact VARCHAR(255),
    est_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_canal) REFERENCES CanauxNotification(id_canal)
);
-- ===============================
-- PHARMACIES
-- ===============================
CREATE TABLE IF NOT EXISTS Pharmacies (
    id_pharmacie INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pharmacien INT NOT NULL,
    nom_pharmacie VARCHAR(255),
    adresse TEXT,
    telephone VARCHAR(20),
    heure_ouverture TIME,
    heure_fermeture TIME,
    photo_url TEXT,
    FOREIGN KEY (id_pharmacien) REFERENCES Utilisateurs(id_utilisateur)
);
-- ===============================
-- STOCK PHARMACIE
-- ===============================
CREATE TABLE IF NOT EXISTS StockMedicamentsPharmacie (
    id_stock INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pharmacie INT,
    id_medicament INT,
    quantite INT DEFAULT 0,
    UNIQUE(id_pharmacie, id_medicament),
    FOREIGN KEY (id_pharmacie) REFERENCES Pharmacies(id_pharmacie) ON DELETE CASCADE,
    FOREIGN KEY (id_medicament) REFERENCES Medicaments(id_medicament)
);
-- ===============================
-- OTP REQUESTS
-- ===============================
CREATE TABLE IF NOT EXISTS OtpRequests (
    id_otp INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts INT DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME
);
-- ===============================
-- NOTIFICATION JOBS
-- ===============================
CREATE TABLE IF NOT EXISTS NotificationJobs (
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
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur),
    FOREIGN KEY (id_calendrier_prise) REFERENCES CalendrierPrises(id_calendrier_prise)
);
-- ===============================
-- NOTIFICATION LOGS
-- ===============================
CREATE TABLE IF NOT EXISTS NotificationLogs (
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
    FOREIGN KEY (id_job) REFERENCES NotificationJobs(id_job)
);
-- ===============================
-- UPGRADE REQUESTS
-- ===============================
CREATE TABLE IF NOT EXISTS UpgradeRequests (
    id_request INTEGER PRIMARY KEY AUTOINCREMENT,
    id_utilisateur INTEGER NOT NULL,
    requested_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    processed_by INTEGER,
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES Utilisateurs(id_utilisateur)
);