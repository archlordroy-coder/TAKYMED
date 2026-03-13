# Environment Variables Security Guide

## 🛡️ Security Best Practices

### Public Variables (.env safe)
These variables are safe to commit to version control:
- `VITE_PUBLIC_BUILDER_KEY` - Public API key
- `PING_MESSAGE` - Server status message
- `PORT` - Server port number
- `DB_PATH` - Database file path
- `SERVER_IP` - Server IP address
- `SERVER_USER` - Server username
- `DOMAIN` - Domain name

### Secret Variables (use DevServerControl)
For sensitive data, use DevServerControl instead of .env:

```bash
# Set server password
DevServerControl set_env_variable: ["SERVER_PASS", "your_actual_password"]

# Set payment keys
DevServerControl set_env_variable: ["STRIPE_SECRET_KEY", "sk_test_..."]
DevServerControl set_env_variable: ["STRIPE_PUBLIC_KEY", "pk_test_..."]

# Set email credentials
DevServerControl set_env_variable: ["EMAIL_PASS", "your_app_password"]
DevServerControl set_env_variable: ["EMAIL_USER", "your_email@gmail.com"]

# Set Orange Money credentials
DevServerControl set_env_variable: ["ORANGE_MONEY_API_KEY", "your_key"]
DevServerControl set_env_variable: ["ORANGE_MONEY_SECRET", "your_secret"]
```

## 🔧 DevServerControl Commands

### Setting Variables
```bash
# Single variable
DevServerControl set_env_variable: ["KEY", "value"]

# Multiple variables
DevServerControl set_env_variable: ["KEY1", "value1", "KEY2", "value2"]
```

### Managing Variables
```bash
# List all variables
DevServerControl list_env_variables

# Remove a variable
DevServerControl remove_env_variable: ["KEY_NAME"]

# Update a variable
DevServerControl set_env_variable: ["EXISTING_KEY", "new_value"]
```

## 📋 Recommended Setup

### 1. Initial Server Setup
```bash
# Set your server password
DevServerControl set_env_variable: ["SERVER_PASS", "AQtLTp8MX1ngoh"]

# Set admin credentials (for production)
DevServerControl set_env_variable: ["ADMIN_PHONE", "+237xxxxxxxxx"]
DevServerControl set_env_variable: ["ADMIN_PIN", "secure_pin"]
```

### 2. Payment Setup (when needed)
```bash
# Stripe configuration
DevServerControl set_env_variable: ["STRIPE_PUBLIC_KEY", "pk_test_..."]
DevServerControl set_env_variable: ["STRIPE_SECRET_KEY", "sk_test_..."]
```

### 3. Email Setup (when needed)
```bash
# Email configuration
DevServerControl set_env_variable: ["EMAIL_HOST", "smtp.gmail.com"]
DevServerControl set_env_variable: ["EMAIL_PORT", "587"]
DevServerControl set_env_variable: ["EMAIL_USER", "your_email@gmail.com"]
DevServerControl set_env_variable: ["EMAIL_PASS", "your_app_password"]
```

## 🚀 GitHub Actions Integration

For automated deployment, combine both approaches:

### .env.example (committed to Git)
```bash
# Public variables only
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__
PING_MESSAGE="TAKYMED API is running"
PORT=3500
DB_PATH=./bd.sqlite
SERVER_IP=82.165.150.150
SERVER_USER=root
DOMAIN=dev.takymed.com
```

### GitHub Secrets (for deployment)
- `SERVER_PASS` - Server password
- `STRIPE_SECRET_KEY` - Stripe secret key
- `EMAIL_PASS` - Email password
- `ORANGE_MONEY_SECRET` - Orange Money secret

## 🔒 Security Benefits

1. **No secrets in Git** - Sensitive data never committed
2. **Environment isolation** - Different values per environment
3. **Easy rotation** - Update secrets without code changes
4. **Audit trail** - Track who changed what and when
5. **Access control** - Only authorized users can modify secrets

## ⚠️ Important Notes

- Never commit actual passwords or API keys to Git
- Use strong, unique passwords for production
- Regularly rotate your secrets
- Test with development keys before production
- Keep a backup of your DevServerControl variables

## 📚 Additional Resources

- [Builder.io API Documentation](https://www.builder.io/c/docs/using-your-api-key)
- [DevServerControl Documentation](https://docs.devservercontrol.com)
- [GitHub Security Best Practices](https://docs.github.com/en/actions/security-guides)
