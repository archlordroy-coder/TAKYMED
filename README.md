# TAKYMED

Application full-stack React + Express pour la gestion d'ordonnances, les rappels de prises, la recherche de médicaments et l'administration de pharmacies.

## Stack

- Frontend: React 18, Vite, React Router 6, TailwindCSS
- Backend: Express + SQLite (`better-sqlite3`)
- Shared types: `shared/api.ts`
- Tests: Vitest

## Scripts utiles

```bash
npm run dev          # Lancement local (frontend + backend)
npm run typecheck    # Vérification TypeScript
npm test             # Tests unitaires
npm run build        # Build client + serveur
npm run build:full   # Typecheck + tests + build complet (recommandé avant déploiement)
npm start            # Démarrage serveur de production
```

## Déploiement serveur

1. Installer les dépendances:
   ```bash
   npm ci
   ```
2. Générer les artefacts:
   ```bash
   npm run build:full
   ```
3. Lancer l'application:
   ```bash
   npm start
   ```

L'application sert la SPA et les endpoints API depuis le même serveur Node.js.

## Comptes de test (exemples)

> Le login détecte automatiquement le type de compte à partir du numéro/identifiant.

- **Standard**: `+237 600000001` / PIN `1234`
- **Professionnel**: `+237 612345678` / PIN `1234`
- **Pharmacien**: `+237 699999999` / PIN `1234`
- **Administrateur**: `admin` / PIN `admin`

## Import de médicaments (CSV compatible BD)

Un fichier prêt à l'import est fourni:

- `data/medicaments_import_bd.csv`

Colonnes compatibles avec la table `Medicaments`:

- `nom`
- `dose_par_defaut`
- `id_unite_par_defaut`
- `description`
- `photo_url`
- `prix`
- `date_ajout`
- `type_utilisation`
- `mode_administration`
- `moment_repas`
- `precaution_alimentaire`
