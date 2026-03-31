# Modifications `.env` à faire avant de redéployer

## 1. `frontend/.env` (ou variables d'environnement du serveur de build)

Ce fichier n'est **pas versionné** (git ignore). Il doit être créé ou mis à jour manuellement sur le serveur avant de rebuild le frontend.

```env
# URL de l'API backend — OBLIGATOIRE en production
VITE_API_BASE_URL=https://api.takymed.com

# Port du serveur de développement (optionnel)
PORT=3500

# Clé Builder.io (optionnel)
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__
```

> ⚠️ Sans `VITE_API_BASE_URL`, toutes les requêtes API tomberont sur `http://localhost:3001` (serveur de dev) et échoueront en production.

---

## 2. `.env` à la racine du projet (backend)

```env
# Base de données
DB_PATH=./bd.sqlite

# Serveur
PORT=3500
SERVER_IP=82.165.150.150
SERVER_USER=root
DOMAIN=takymed.com

# Secrets — à définir via DevServerControl ou directement :
STRIPE_PUBLIC_KEY=...
STRIPE_SECRET_KEY=...
EMAIL_HOST=...
EMAIL_PORT=...
EMAIL_USER=...
EMAIL_PASS=...
ORANGE_MONEY_API_KEY=...
ORANGE_MONEY_SECRET=...
ADMIN_PHONE=...
ADMIN_PIN=...
```

> 🔐 Ne jamais committer les valeurs secrètes dans le dépôt Git.

---

## 3. Étapes de redéploiement

1. Mettre à jour `frontend/.env` avec les valeurs ci-dessus
2. Aller dans le dossier frontend : `cd frontend`
3. Installer les dépendances : `npm install`
4. Builder le frontend : `npm run build`
5. Redémarrer le backend : `pm2 restart all` (ou équivalent)
