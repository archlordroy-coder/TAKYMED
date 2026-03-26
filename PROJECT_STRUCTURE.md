# TAKYMED - Medical Prescription & Pharmacy Management System

## Project Structure

This is a **monorepo** with two independent applications:

```
TAKYMED/
├── frontend/          # React + Vite frontend (SPA)
│   ├── client/       # React componentes et pages
│   ├── public/       # Assets statiques
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/          # Express + Node.js API server
│   ├── server/       # Routes et middleware
│   ├── shared/       # Types TS partagés
│   ├── data/         # SQLite database et données
│   ├── public/       # Assets serveur
│   ├── package.json
│   ├── vite.config.server.ts
│   └── tsconfig.json
│
├── scripts/          # Deplacement/build scripts
├── docs/             # Documentation
└── package.json      # Root workspace (npm workspaces)
```

## Quick Start

### Installation

Install dependencies for all workspaces:
```bash
npm install
```

### Development

**Start frontend only** (development server):
```bash
npm run dev:frontend
```

**Start backend only** (API server):
```bash
npm run dev:backend
```

**Note:** In production, frontend and backend run independently:
- Frontend: Hosted on a CDN/static host (e.g., Vercel, AWS S3)
- Backend: Runs as Node.js server (e.g., AWS EC2, DigitalOcean)

### Build

**Build both frontend and backend:**
```bash
npm run build
```

**Build frontend separately:**
```bash
npm run build:frontend
# Output: frontend/dist/
```

**Build backend separately:**
```bash
npm run build:backend
# Output: backend/dist/
```

### Production

**Start the backend server:**
```bash
npm run start
# Runs backend/dist/production.mjs
```

## Environment Configuration

### Frontend (.env)
```
VITE_API_BASE_URL=https://api.takymed.com
```

### Backend (.env)
```
PORT=3001
CORS_ORIGIN=https://takymed.com,https://www.takymed.com
```

## Deployment

### Frontend Deployment
Deploy the `frontend/dist/` folder to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

Set `VITE_API_BASE_URL` to your backend API domain.

### Backend Deployment
Deploy the `backend/dist/` folder to:
- AWS EC2
- DigitalOcean
- Railway.app
- Any Node.js hosting service

## API Endpoints

Frontend communicates with backend via API:
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/medications` - List medications
- `POST /api/prescriptions` - Create prescription
- And many more...

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **SQLite** - Database
- **Vite** - Build for ESM
- **Baileys** - WhatsApp integration

## Development Notes

- Frontend uses `http://localhost:3001` as API base URL in development (via Vite proxy configuration)
- Backend runs on port `3001` by default
- Shared TypeScript types are in `backend/shared/`
- Frontend references: `@shared/api`

## Git Workflow

After making changes:
```bash
git add .
git commit -m "feat: description"
git push origin master
```

Deployments are triggered by push to `master` branch (GitHub Actions).
