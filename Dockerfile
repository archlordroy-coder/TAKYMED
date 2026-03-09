# Étape de build
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
# Installer les dépendances (y compris les devDependencies pour le build)
RUN npm install

COPY . .
# Construire le client (Vite) et le serveur
RUN npm run build

# Étape finale (production)
FROM node:20-slim

WORKDIR /app

# SQLite et autres dépendances natives peuvent nécessiter des librairies C
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# N'installer que les dépendances de production
RUN npm install --omit=dev

# Copier le build depuis l'étape précédente
COPY --from=builder /app/dist ./dist

# Créer le répertoire pour les données persistantes (SQLite)
RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production
# Le chemin vers la base de données SQLite (monté sur un disque Render)
ENV DB_PATH=/app/data/bd.sqlite

# Lancer sous un utilisateur non-root pour plus de sécurité
USER node

CMD ["npm", "start"]
