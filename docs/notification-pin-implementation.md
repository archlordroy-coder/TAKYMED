# Implémentation des rappels multi-canaux et envoi de PIN par téléphone

## 1) État actuel de TAKYMED (audit rapide)

### Ce qui existe déjà
- Le schéma SQL prévoit déjà les canaux de notification (`SMS`, `WhatsApp`, `Appel`, `Push`) et les préférences utilisateur avec un numéro/contact cible. 
- L'écran de prescription permet déjà de choisir le canal (`sms`, `whatsapp`, `call`, `push`) et de stocker cette préférence.
- Le backend persiste les préférences dans `PreferencesNotificationUtilisateurs` lors de la création d'une ordonnance.

### Ce qui manque pour un envoi réel
- Il n’existe pas encore de worker/cron qui lit les prises à venir et déclenche l’envoi via un fournisseur télécom.
- Dans l’UI, la partie “envoi” est une simulation (toasts), pas une intégration opérateur réelle.
- Le PIN utilisateur est stocké en clair (`pin_hash` utilisé comme texte), il faut passer à un OTP/PIN sécurisé + expiration + tentative limitée.

## 2) Architecture recommandée (simple et robuste)

### Flux A — Envoi de PIN (connexion/inscription)
1. L’utilisateur saisit son numéro.
2. API `POST /api/auth/pin/request` crée un OTP 4-6 chiffres.
3. Stockage côté serveur: hash OTP + `expires_at` + compteur tentatives.
4. Envoi OTP via canal choisi (SMS/WhatsApp/voice call).
5. API `POST /api/auth/pin/verify` valide OTP, puis crée une session/JWT.

### Flux B — Rappels de prise
1. Un job planifié (toutes les 1-5 minutes) lit `CalendrierPrises` pour les rappels dus (`heure_prevue <= now`, `rappel_envoye = 0`).
2. Jointure avec préférences de canal + numéro de contact.
3. Envoi via provider (SMS / WhatsApp / voice call).
4. Enregistrer le résultat dans une table de logs (`sent`, `failed`, `provider_message_id`, coût éventuel).
5. Mettre `rappel_envoye = 1` si succès (ou politique de retry en cas d’échec).

## 3) Modifications techniques minimales dans TAKYMED

### Base de données
Ajouter des tables:
- `OtpRequests` : `id`, `phone`, `otp_hash`, `channel`, `expires_at`, `attempts`, `status`, `created_at`.
- `NotificationJobs` : file d’attente des envois (`scheduled_at`, `status`, `retry_count`, `payload`).
- `NotificationLogs` : audit détaillé (`provider`, `channel`, `to`, `status`, `error`, `provider_id`).

Conserver `PreferencesNotificationUtilisateurs`, mais ajouter une contrainte unique `(id_utilisateur, id_canal)` pour éviter les doublons.

### Backend Express
Créer des routes:
- `POST /api/auth/pin/request`
- `POST /api/auth/pin/verify`
- `POST /api/notifications/test-send` (admin, facultatif)

Créer un service unique `server/services/notificationProvider.ts` avec interface:
- `sendSMS(to, text)`
- `sendWhatsApp(to, text)`
- `makeVoiceCall(to, textOrTts)`

Puis implémenter des adapters par fournisseur (Twilio, Vonage, Meta Cloud API, etc.).

### Worker de rappel
Option 1 (rapide): `setInterval` dans le process Node (OK MVP).
Option 2 (propre): worker dédié (BullMQ + Redis, ou cron système) pour résilience et retries.

## 4) Solutions fournisseurs — gratuites vs payantes

> Important: pour WhatsApp et appels vocaux, le “100% gratuit en production” est très rare. La plupart des offres sont “free trial” puis payantes.

### A. Twilio (payant + trial)
- **SMS**: excellent support international.
- **WhatsApp**: support sandbox puis numéro business validé.
- **Voice call**: API mature (TTS, call flow).
- **Avantages**: un seul provider pour 3 canaux.
- **Inconvénients**: coût unitaire non négligeable selon pays.

### B. Vonage (payant + crédits d’essai)
- SMS + Voice solides.
- WhatsApp via API partenaire selon configuration.
- Bonne alternative à Twilio pour optimisation tarifaire.

### C. Meta WhatsApp Cloud API + provider SMS/Voice séparé
- **WhatsApp**: possible directement via Meta (développeur + business verification).
- **SMS/Call**: ajouter un provider local/régional (Orange API, Infobip, etc.).
- **Avantages**: coût parfois meilleur côté WhatsApp.
- **Inconvénients**: intégration plus complexe (multi-fournisseurs).

### D. Ultra-budgets / gratuits (MVP)
1. **Mode dev gratuit**: logs en console + fake sender (déjà proche de votre simulation actuelle).
2. **Free trial providers**: crédits de démarrage Twilio/Vonage pour POC.
3. **WhatsApp gratuit non officiel**: déconseillé (risque blocage, non conforme).

## 5) Stratégie coût optimisée recommandée

1. **MVP (coût quasi nul)**
   - Garder push in-app gratuit en priorité.
   - Activer SMS uniquement pour OTP et rappels critiques.
   - Utiliser free trial pour validation produit.

2. **Phase production initiale**
   - OTP par SMS (fiable).
   - Rappels routine via WhatsApp (souvent perçu comme plus engageant).
   - Fallback SMS si WhatsApp échoue.

3. **Phase scale**
   - Routage intelligent par pays/coût.
   - Retry policy + fenêtre horaire + anti-spam.
   - Dashboard de coûts par utilisateur/canal.

## 6) Sécurité indispensable (PIN/OTP)

- Ne jamais stocker de PIN/OTP en clair.
- Hash OTP/PIN avec `bcrypt` (ou `argon2`).
- OTP expirant en 2-5 min.
- Max 3-5 tentatives.
- Rate limit par IP + numéro.
- Journaliser sans exposer OTP brut.

## 7) Plan d’implémentation concret (ordre conseillé)

### Sprint 1 (2-3 jours)
- Créer `OtpRequests` + endpoints `request/verify`.
- Remplacer login PIN direct par OTP optionnel.
- Intégrer 1 provider SMS (Twilio ou Vonage).

### Sprint 2 (2-4 jours)
- Créer worker de rappel + `NotificationLogs`.
- Envoi SMS réel sur rappels dus.
- Marquage `rappel_envoye` + retries basiques.

### Sprint 3 (3-5 jours)
- Ajouter WhatsApp.
- Ajouter appels vocaux (TTS court).
- Fallback canal + tableau d’administration simple.

## 8) Mapping direct avec votre code actuel

- Point d’entrée serveur: `server/index.ts`.
- Auth actuelle: `server/routes/auth.ts` (à migrer vers OTP sécurisé).
- Rappels ordonnances: `server/routes/prescriptions.ts` (déjà le bon point pour brancher la file d’envoi).
- Schéma notifications existant: `bd.sql` (`CanauxNotification`, `PreferencesNotificationUtilisateurs`, `CalendrierPrises`).
- UI côté prescription: `client/pages/Prescription.tsx` (déjà prête pour choisir le canal, il manque l’envoi réel).

## 9) Recommandation finale (pragmatique pour TAKYMED)

- **Stack conseillée**: Twilio au départ (SMS + WhatsApp + Voice), puis optimisation fournisseur par pays après traction.
- **Priorité**: OTP SMS + rappel SMS d’abord (fiabilité), ensuite WhatsApp, puis voice call.
- **Technique**: introduire un service d’abstraction provider dès le début pour éviter le lock-in.
