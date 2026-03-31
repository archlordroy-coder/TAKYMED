# Problèmes TAKYMED - À Résoudre

## 🏗️ Architecture de Déploiement

### Vue d'ensemble
```
┌─────────────────────────────────────────────────────────────────┐
│                          INTERNET                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     dev.takymed.com                             │
│                     (IP: 82.165.150.150)                        │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   Nginx      │────────▶│   Backend    │                      │
│  │  Port 443    │  proxy  │  Port 3500   │                      │
│  │   HTTPS      │         │   HTTP       │                      │
│  └──────────────┘         └──────────────┘                      │
│         │                                                  │
│         │ (statique si configuré)                        │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │   Frontend   │  ◀── Non déployé ici actuellement       │
│  │   (dist/)    │     L'utilisateur déploie ailleurs       │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Où est déployé quoi ?

| Composant | Serveur | Chemin | Port | Statut |
|-----------|---------|--------|------|--------|
| **Backend API** | dev.takymed.com (82.165.150.150) | `/root/TAKYMED/backend` | 3500 (HTTP) | ✅ Déployé |
| **Nginx Proxy** | dev.takymed.com | `/etc/nginx/sites-enabled/dev.takymed.com` | 443 (HTTPS) | ✅ Configuré |
| **Frontend** | takymed.com (autre serveur) | - | 80/443 | 🔲 Non géré par nous |

### Flux de requêtes attendu

```
1. Utilisateur sur takymed.com
   └─> Charge le frontend (HTML/JS/CSS)
   
2. Frontend JS exécute un appel API
   └─> fetch("http://dev.takymed.com:3500/api/...")
   
3. Requête arrive sur dev.takymed.com:3500
   └─> Backend Express traite la requête
   
4. Réponse retourne au frontend
   └─> JSON data affichée à l'utilisateur
```

### Configuration actuelle

#### Backend (dev.takymed.com)
```
Fichier: /root/TAKYMED/backend/.env
├── PORT=3500
├── CORS_ORIGIN=https://takymed.com
└── DOMAIN=dev.takymed.com

Process: PM2 (takymed-backend)
├── Port 3500
├── HTTP uniquement
└── Géré par /root/TAKYMED/backend/ecosystem.config.cjs
```

#### Nginx (dev.takymed.com)
```
Fichier: /etc/nginx/sites-enabled/dev.takymed.com
├── HTTPS 443 → Proxy vers 127.0.0.1:3500
├── HTTP 80 → Redirection 301 vers HTTPS
└── Certificats: /etc/letsencrypt/live/dev.takymed.com/
```

#### Frontend (local/build uniquement)
```
Fichier: /home/ravel/Documents/TAKYMED/frontend/.env
├── VITE_API_BASE_URL=http://dev.takymed.com:3500
└── Build généré dans: frontend/dist/

Note: L'utilisateur déploie le dist/ lui-même sur takymed.com
```

### Comment cela DOIT fonctionner

1. **Frontend** (déployé sur takymed.com par l'utilisateur):
   - Doit pointer vers `http://dev.takymed.com:3500` (dans `.env`)
   - Au build, cette URL doit être injectée dans le JS
   - Les appels API doivent utiliser `getApiUrl()` depuis `api-config.ts`

2. **Backend** (déployé sur dev.takymed.com):
   - Doit accepter les requêtes CORS de `https://takymed.com`
   - Doit répondre sur `/api/ping` et `/api` (healthcheck)
   - Tourne en HTTP sur port 3500

3. **Nginx** (sur dev.takymed.com):
   - Termine le SSL (HTTPS 443)
   - Proxi-fie vers le backend HTTP 3500
   - Redirection HTTP→HTTPS

---

## 🔴 Critiques (Bloquant le déploiement)

### 1. Backend API - Route `/api` manquante
**Statut:** ❌ Non résolu  
**Description:** La route `GET /api` retourne "Endpoint API non trouvé" alors que `/api/ping` fonctionne correctement.

**Impact:** Le frontend ne peut pas vérifier la disponibilité de l'API au démarrage.

**Tests:**
```bash
# Local (fonctionne)
curl http://127.0.0.1:3500/api/ping  → "TAKYMED API is running"

# Local (ne fonctionne PAS)
curl http://127.0.0.1:3500/api       → "Endpoint API non trouvé"
```

**Fichier concerné:** `/root/TAKYMED/backend/server/index.ts`  
**Action requise:** Ajouter une route `app.get('/api', ...)` qui retourne un JSON de status.

---

### 2. Frontend - URL Backend non injectée dans le build
**Statut:** ❌ Non résolu  
**Description:** Le fichier `frontend/dist/assets/index-*.js` ne contient pas l'URL `http://dev.takymed.com:3500` configurée dans `.env`. Le fallback `http://localhost:3001` n'est pas présent non plus, ce qui suggère que le code API n'est pas correctement bundlé.

**Impact:** Le frontend ne sait pas où appeler l'API backend.

**Vérification:**
```bash
grep "dev.takymed.com:3500" frontend/dist/assets/*.js
# Aucun résultat
grep "localhost:3001" frontend/dist/assets/*.js  
# Aucun résultat (sauf code React interne)
```

**Hypothèses:**
- Le fichier `client/lib/api-config.ts` n'est pas correctement importé
- Les variables d'environnement Vite ne sont pas remplacées au build
- Le build utilise une autre source pour l'URL API

**Action requise:** 
- Vérifier les imports de `api-config.ts` dans les pages
- Vérifier que `VITE_API_BASE_URL` est bien définie dans l'environnement de build
- Rebuilder avec `VITE_API_BASE_URL=http://dev.takymed.com:3500` explicitement

---

### 3. Nginx - Proxy HTTPS vers backend
**Statut:** ⚠️ Partiellement résolu  
**Description:** Nginx est configuré mais la route `/api` via HTTPS retourne une erreur différente de celle en local.

**Tests:**
```bash
# HTTPS via Nginx (fonctionne partiellement)
curl https://dev.takymed.com/api/ping  → "TAKYMED API is running"
curl https://dev.takymed.com/api        → "Endpoint API non trouvé"
```

**Action requise:** Corriger la route `/api` dans le backend (lié au problème #1).

---

## 🟡 Importants (À améliorer)

### 4. Backend - Certificats SSL HTTPS natif
**Statut:** ⚠️ Non prioritaire  
**Description:** Le backend tourne actuellement en HTTP sur port 3500. Nginx gère le HTTPS.

**Config actuelle:**
- Nginx : HTTPS 443 → Proxy HTTP 3500
- Backend : HTTP 3500

**Alternative:** Le backend pourrait gérer directement HTTPS si besoin.

---

### 5. PM2 - Gestion du processus backend
**Statut:** ✅ Fonctionnel mais à optimiser  
**Description:** Le processus `takymed-backend` a 11 redémarrages (uptime 2 jours).

**Statut actuel:**
```
Name               id  mode  status  uptime   cpu  mem
────────────────────────────────────────────────────────
takymed-backend    0   fork  online  2 days   0%   153MB
```

**Action:** Surveiller les logs en cas de crash répétés.

---

## 🟢 Mineurs (À noter)

### 6. Frontend - Warning build chunks
**Statut:** ℹ️ Information  
**Description:** Le build génère un fichier JS de 1.4MB (gzip: 383KB), au-dessus de la limite recommandée de 500KB.

**Message:**
```
(!) Some chunks are larger than 500 kB after minification.
dist/assets/index-DjFcdVHq.js  1,410.44 kB │ gzip: 382.91 kB
```

**Impact:** Temps de chargement initial potentiellement long.

**Solution future:** Utiliser `import()` dynamique pour le code-splitting.

---

## 📝 Plan d'action priorisé

### Phase 1 - Critique (À faire immédiatement)
1. ✅ Vérifier PM2 backend (fait - fonctionnel)
2. 🔲 Corriger la route `/api` dans `backend/server/index.ts`
3. 🔲 Rebuilder le backend et redémarrer PM2
4. 🔲 Tester `/api` et `/api/ping` en local

### Phase 2 - Critique (Frontend)
5. 🔲 Vérifier les imports de `api-config.ts` dans toutes les pages
6. 🔲 S'assurer que `VITE_API_BASE_URL` est bien injectée au build
7. 🔲 Rebuilder le frontend avec la bonne URL
8. 🔲 Vérifier que le dist contient bien l'URL `http://dev.takymed.com:3500`

### Phase 3 - Validation
9. 🔲 Tester l'accès HTTPS complet via `https://dev.takymed.com`
10. 🔲 Vérifier la communication frontend → backend

---

## 🔧 Commandes de debug

```bash
# Backend local
curl http://127.0.0.1:3500/api/ping
curl http://127.0.0.1:3500/api

# Backend via Nginx (HTTPS)
curl https://dev.takymed.com/api/ping
curl https://dev.takymed.com/api

# Vérifier URL dans le dist
grep "dev.takymed.com" frontend/dist/assets/*.js
grep "localhost:3001" frontend/dist/assets/*.js

# PM2 logs
pm2 logs takymed-backend --lines 20

# Rebuild backend
cd /root/TAKYMED/backend && npm run build && pm2 restart takymed-backend

# Rebuild frontend
cd /root/TAKYMED/frontend && npm run build
```

---

**Dernière mise à jour:** 31/03/2026  
**Prochaine étape:** Corriger la route `/api` du backend
