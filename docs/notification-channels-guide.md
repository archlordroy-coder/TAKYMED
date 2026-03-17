# Notification & Appel vocal guide (TAKYMED)

## Objectif
Ce document résume les options sûres et légales pour:
- envoyer des rappels à plusieurs numéros,
- utiliser plusieurs canaux (SMS, WhatsApp, appel vocal),
- faire un appel automatisé qui lit un message puis raccroche.

## Bibliothèques déjà utilisées dans ce projet
- `express` (API)
- `better-sqlite3` (stockage)
- `zod` (validation)

## Bibliothèques recommandées par canal

### SMS
- Option existante: Orange SMS API via `fetch` (déjà en place)
- Alternative multi-pays: `twilio`

### WhatsApp (recommandé: officiel)
- **API officielle WhatsApp Business** (Meta Cloud API)
- Bibliothèque côté Node:
  - `axios` ou `node-fetch` pour appeler l’API Meta

> ⚠️ Éviter les librairies non officielles type session-web scraping pour la prod critique.
> Risques: blocage du numéro, indisponibilité, non-conformité ToS.

### Appel vocal (message puis raccrocher)
- Recommandé: `twilio` (Programmable Voice + TwiML)
- Flow standard:
  1. lancer l’appel,
  2. lire un message TTS (`<Say>`),
  3. raccrocher automatiquement (`<Hangup>`)

## Exemple dépendances (si activation Twilio/Meta)
```bash
npm install twilio axios
```

## Dépendances que vous aviez proposées
Vous aviez proposé:
```bash
npm install @whiskeysockets/baileys pino google-tts-api
```

Ces packages peuvent fonctionner en prototype, mais pour la production santé, ils comportent des risques opérationnels et de conformité (notamment WhatsApp non officiel). Préférer les API officielles pour éviter le ban des numéros.

## Bonnes pratiques de conformité
- Consentement explicite patient (opt-in) par canal
- Journalisation (`NotificationLogs`) des envois et erreurs
- Limitation de fréquence (anti-spam)
- Possibilité de désabonnement par canal
- Masquage des données sensibles dans les logs
