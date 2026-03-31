# TAKYMED - VERIFICATION POST-DEPLOIEMENT

## Resume
- Backend: 82.165.150.150:3001 (PM2 + Nginx) - DEPLOYE
- Frontend: takymed.com (A DEPLOYER PAR TOI)

## Deployer le Frontend
```bash
# Upload frontend/dist/ vers takymed.com:
scp -r /home/ravel/Documents/TAKYMED/frontend/dist/* user@takymed.com:/var/www/html/
# Ou via FTP/panel de l'hebergeur
```

## Tests
1. Backend: `curl http://82.165.150.150:3001/api`
2. CORS: Verifier dans navigateur pas d'erreur rouge
3. Connexion: Tester login sur takymed.com

## Commandes Serveur Backend
```bash
ssh root@82.165.150.150
pm2 status                    # Voir processus
pm2 logs takymed-backend      # Logs
pm2 restart takymed-backend   # Redemarrer
systemctl restart nginx       # Redemarrer nginx
```

## Si Probleme CORS
Verifier sur serveur:
```bash
cat /etc/nginx/sites-available/takymed-api
# Doit contenir: add_header 'Access-Control-Allow-Origin' 'https://takymed.com'
```
