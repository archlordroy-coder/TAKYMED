# Environment Variables Setup Guide

## 🛡️ Security First Approach

We use a two-tier approach for environment variables:

1. **Public Variables** (.env) - Safe to commit
2. **Secret Variables** (DevServerControl) - Secure storage

---

## 🟢 Public Variables (.env.example)

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

These variables are safe to commit to Git:
- `VITE_PUBLIC_BUILDER_KEY` - Public Builder.io API key
- `PING_MESSAGE` - Server status message  
- `PORT` - Server port (3500)
- `DB_PATH` - Database path
- `SERVER_IP` - Server IP address
- `SERVER_USER` - Server username
- `DOMAIN` - Domain name

---

## 🔒 Secret Variables (DevServerControl)

For sensitive data, use DevServerControl:

### Server Password
```bash
DevServerControl set_env_variable: ["SERVER_PASS", "your_actual_password"]
```

### Payment Configuration
```bash
DevServerControl set_env_variable: ["STRIPE_PUBLIC_KEY", "pk_test_..."]
DevServerControl set_env_variable: ["STRIPE_SECRET_KEY", "sk_test_..."]
```

### Email Configuration  
```bash
DevServerControl set_env_variable: ["EMAIL_HOST", "smtp.gmail.com"]
DevServerControl set_env_variable: ["EMAIL_PORT", "587"]
DevServerControl set_env_variable: ["EMAIL_USER", "your_email@gmail.com"]
DevServerControl set_env_variable: ["EMAIL_PASS", "your_app_password"]
```

### Orange Money Configuration
```bash
DevServerControl set_env_variable: ["ORANGE_MONEY_API_KEY", "your_key"]
DevServerControl set_env_variable: ["ORANGE_MONEY_SECRET", "your_secret"]
```

---

## 🚀 GitHub Actions Setup

### 1. Public Variables in Repository
`.env.example` is committed with safe variables only.

### 2. Secret Variables in GitHub Secrets
Add these to GitHub → Settings → Secrets:

- `SERVER_PASS` - Server password
- `STRIPE_SECRET_KEY` - Stripe secret
- `EMAIL_PASS` - Email password  
- `ORANGE_MONEY_SECRET` - Orange Money secret
- `SSH_PRIVATE_KEY` - Deployment SSH key
- `SERVER_HOST` - Server IP (82.165.150.150)
- `SERVER_USER` - root
- `APP_URL` - http://dev.takymed.com:3500

---

## 📋 Complete Setup Checklist

### Local Development
- [ ] Copy `.env.example` to `.env`
- [ ] Set DevServerControl variables for secrets
- [ ] Test with `npm run dev`

### Production Deployment
- [ ] Configure GitHub Secrets
- [ ] Test deployment with `git push`
- [ ] Verify health check passes

### Security Review
- [ ] No passwords in `.env`
- [ ] All secrets in DevServerControl
- [ ] GitHub Secrets configured
- [ ] Documentation updated

---

## 🔧 DevServerControl Commands

```bash
# Set variable
DevServerControl set_env_variable: ["KEY", "value"]

# List all variables  
DevServerControl list_env_variables

# Remove variable
DevServerControl remove_env_variable: ["KEY"]
```

---

## 📚 Documentation

- [Security Guide](./SECURITY.md) - Detailed security practices
- [GitHub Actions](../.github/workflows/README.md) - Deployment workflow
- [Builder.io API](https://www.builder.io/c/docs/using-your-api-key)
