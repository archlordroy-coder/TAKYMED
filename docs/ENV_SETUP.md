# Environment Variables Template

This file contains all the environment variables needed for TAKYMED deployment.

## Quick Setup

1. Copy this file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the values with your actual configuration

## Required Variables

### Server Configuration
- `PORT`: Server port (default: 3500)
- `DB_PATH`: Path to SQLite database
- `ADMIN_PHONE`: Admin phone number
- `ADMIN_PIN`: Admin PIN
- `SERVER_IP`: Server IP address
- `SERVER_USER`: Server username (usually root)
- `SERVER_PASS`: Server password

### Client Configuration
- `VITE_PUBLIC_BUILDER_KEY`: Builder public key for client

### GitHub Actions Configuration
These variables are used by the deployment workflow:
- `SERVER_HOST`: Your server IP/hostname (e.g., 82.165.150.150)
- `APP_URL`: Full URL to your app (e.g., http://dev.takymed.com:3500)

## Optional Variables

### Payment Configuration
- `STRIPE_PUBLIC_KEY`: Stripe public key for payments
- `STRIPE_SECRET_KEY`: Stripe secret key for payments

### Email Configuration
- `EMAIL_HOST`: SMTP server (e.g., smtp.gmail.com)
- `EMAIL_PORT`: SMTP port (e.g., 587)
- `EMAIL_USER`: Email username
- `EMAIL_PASS`: Email password/app password

### Orange Money Configuration
- `ORANGE_MONEY_API_KEY`: Orange Money API key
- `ORANGE_MONEY_SECRET`: Orange Money secret

## Security Notes

⚠️ **Important**: Never commit your actual `.env` file to Git!
- The `.env` file is already in `.gitignore`
- Only commit `.env.example` as a template
- Use GitHub Secrets for sensitive deployment variables

## GitHub Secrets Setup

For automated deployment, add these secrets to your GitHub repository:

1. `SERVER_HOST`: Your server IP/hostname
2. `SERVER_USER`: Server username (root)
3. `SSH_PRIVATE_KEY`: SSH private key for deployment
4. `APP_URL`: Full application URL

## Example .env File

```bash
# Server Configuration
PORT=3500
DB_PATH=./bd.sqlite
PING_MESSAGE="TAKYMED API is running"
ADMIN_PHONE=admin
ADMIN_PIN=admin
SERVER_IP=127.0.0.1
SERVER_USER=root
SERVER_PASS=your_actual_password

# Client Configuration
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__

# GitHub Actions Configuration
SERVER_HOST=82.165.150.150
APP_URL=http://dev.takymed.com:3500
```

## Testing

After setting up your `.env` file:

1. Test locally:
   ```bash
   npm run dev
   ```

2. Test deployment:
   ```bash
   ./scripts/push.sh
   ```

3. Test GitHub Actions:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin master
   ```
