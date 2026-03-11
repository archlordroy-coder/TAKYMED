# 🏥 TAKYMED

Application full-stack **React + Express** pour la gestion complète de pharmacies, ordonnances, rappels de prises et recherche de médicaments. Plateforme multi-rôles avec support pour patients, professionnels de santé et pharmaciens.

---

## 🎯 Fonctionnalités principales

- **👤 Gestion d'ordonnances** : Création, consultation et suivi des ordonnances
- **⏰ Rappels de prises** : Notifications intelligentes pour la prise de médicaments
- **�️ Calendrier interactif** : Visualisation des prises avec filtrage par client pour les professionnels
- **�💊 Catalogue de médicaments** : Recherche et consultation détaillée des produits avec gestion dynamique des catégories d'âge
- **🏪 Administration de pharmacies** : Gestion d'inventaire et des clients
- **🔐 Authentification multi-rôles** : Support patients, professionnels, pharmaciens et admins
- **📱 Interface responsive** : Adaptée aux appareils mobiles et desktop

---

## 🛠️ Stack Technologique

### Frontend

- **React 18** - Framework UI moderne
- **Vite** - Build tool ultra-rapide
- **React Router 6** - Routage côté client
- **TailwindCSS** - Styling utility-first
- **TypeScript** - Typage statique

### Backend

- **Express.js** - Serveur web et API REST
- **SQLite** avec `better-sqlite3` - Base de données embarquée
- **TypeScript** - Typage statique côté serveur

### Qualité du code

- **Vitest** - Tests unitaires et d'intégration
- **Shared types** (`shared/api.ts`) - Types synchronisés frontend/backend
- **Type checking** - Vérification TypeScript stricte

---

## 📋 Prérequis

- **Node.js** >= 18.x
- **npm** >= 9.x

---

## 🚀 Installation et démarrage

### 1. Cloner le repository

```bash
git clone https://github.com/Archlord12345/TAKYMED.git
cd TAKYMED
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Lancer en développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173` (frontend) et les endpoints API sur `http://localhost:3000`.

---

## 📖 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lancement local (frontend + backend simultanément) |
| `npm run typecheck` | Vérification TypeScript stricte |
| `npm test` | Exécution des tests unitaires |
| `npm run build` | Build client + serveur pour production |
| `npm run build:full` | **Build complet** (typecheck + tests + build) ⭐ |
| `npm start` | Démarrage du serveur de production |

### 💡 Recommandation

Avant tout déploiement, utilisez `npm run build:full` pour garantir que votre code passe tous les contrôles de qualité.

---

## 🌐 Déploiement serveur

### Étapes de déploiement

1. **Installer les dépendances en mode production**

   ```bash
   npm ci
   ```

2. **Générer les artefacts (build complet avec vérifications)**

   ```bash
   npm run build:full
   ```

3. **Démarrer l'application**

   ```bash
   npm start
   ```

### Scripts de déploiement automatisés

Des scripts sont disponibles dans le dossier `scripts/` pour faciliter la gestion sur serveur :

- **`./scripts/deploy.sh`** : Déploiement complet (sync, install, build, start).
- **`./scripts/push.sh`** : Mise à jour du code uniquement (préserve la base de données et le fichier `.env` du serveur).

### Architecture de déploiement

L'application est un serveur **Node.js unique** qui :

- Sert la Single Page Application (SPA) React
- Expose les endpoints API REST
- Gère la base de données SQLite (Configurable via `DB_PATH`)
- Peut être déployé sur Heroku, Railway, Render, VPS, etc.

---

## 🔐 Comptes de test

> ℹ️ Le système de login détecte automatiquement le type de compte selon le numéro/identifiant.

| Type | Identifiant | PIN | Rôle |
|------|-------------|-----|------|
| **Standard** | `+237 600000001` | `1234` | Patient |
| **Professionnel** | `+237 612345678` | `1234` | Médecin/Professionnel de santé |
| **Pharmacien** | `+237 699999999` | `1234` | Gestionnaire de pharmacie |
| **Administrateur** | *Configurable* (`ADMIN_PHONE`) | *Configurable* (`ADMIN_PIN`) | Admin système |

### Utilisation

- Utilisez ces comptes pour tester les différentes fonctionnalités selon le rôle
- Les données de test sont présentes dans la base SQLite

---

## 📊 Import de médicaments

### Fichier de référence

Un fichier CSV prêt à l'import est fourni : **`data/medicaments_import_bd.csv`**

### Colonnes compatibles (schéma table `Medicaments`)

| Colonne | Description |
|---------|-------------|
| `nom` | Nom du médicament |
| `dose_par_defaut` | Dose par défaut prescrite |
| `id_unite_par_defaut` | Unité de dosage (mg, ml, etc.) |
| `description` | Description détaillée |
| `photo_url` | URL de la photo du produit |
| `prix` | Prix unitaire |
| `date_ajout` | Date d'ajout au catalogue |
| `type_utilisation` | Type d'utilisation |
| `mode_administration` | Mode d'administration (oral, injectable, etc.) |
| `moment_repas` | Moment de prise par rapport aux repas |
| `precaution_alimentaire` | Restrictions alimentaires |

### Comment importer

1. Accédez à la section administration
2. Utilisez l'outil d'import CSV
3. Sélectionnez le fichier `data/medicaments_import_bd.csv`
4. Vérifiez les données et validez l'import

---

## 📁 Structure du projet

```
TAKYMED/
├── src/
│   ├── client/          # Frontend React
│   ├── server/          # Backend Express
│   └── shared/          # Types partagés (api.ts)
├── data/                # Fichiers de données (CSV, etc.)
├── dist/                # Build output
├── package.json
└── README.md
```

---

## 🤝 Contribution

Les contributions sont bienvenues ! Pour contribuer :

1. Fork le repository
2. Créez une branche (`git checkout -b feature/ma-feature`)
3. Committez vos changements (`git commit -m 'Ajout de ma feature'`)
4. Poussez la branche (`git push origin feature/ma-feature`)
5. Ouvrez une Pull Request

---

## 📝 License

Ce projet est distribué sous licence [à spécifier].

---

## 📞 Support

Pour toute question ou problème :

- 📧 Ouverture d'une **issue** sur GitHub
- 💬 Discussion dans les **Discussions** du repository

---

## 🎓 Ressources utiles

- [Documentation React](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [Vite Documentation](https://vitejs.dev)
- [TailwindCSS](https://tailwindcss.com)
- [SQLite Documentation](https://www.sqlite.org)

---

**Dernière mise à jour**: 2026-03-11
