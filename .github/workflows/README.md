# GitHub Actions Deployment Setup

This directory contains the automated deployment workflow for TAKYMED.

## Workflow Overview

The `.github/workflows/deploy.yml` workflow automatically deploys your application to production when:
- Code is pushed to `master` or `main` branch
- Manual trigger from GitHub Actions tab

## Required GitHub Secrets

You must configure these secrets in your GitHub repository:

1. **SSH_PRIVATE_KEY**
   - Generate a new SSH key pair: `ssh-keygen -t rsa -b 4096 -C "github-actions"`
   - Add the public key to your server: `ssh-copy-id -i ~/.ssh/id_rsa.pub root@82.165.150.150`
   - Add the private key content to GitHub Secrets

2. **SERVER_HOST**
   - Value: `82.165.150.150`

3. **SERVER_USER**
   - Value: `root`

4. **APP_URL**
   - Value: `http://dev.takymed.com:3500`

## Setup Instructions

### 1. Generate SSH Keys
```bash
# Generate new key pair
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github-actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github-actions.pub root@82.165.150.150
```

### 2. Add Secrets to GitHub
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret listed above

### 3. Test the Workflow
```bash
# Make a small change and commit
git add .
git commit -m "Test GitHub Actions deployment"
git push origin master
```

## Workflow Process

1. **Checkout** - Gets the latest code
2. **Setup Node.js** - Uses Node.js 18 with npm cache
3. **Build** - Installs dependencies and builds the application
4. **Setup SSH** - Configures SSH connection to server
5. **Deploy** - Syncs files using rsync (excludes sensitive files)
6. **Install** - Installs production dependencies on server
7. **Build** - Builds application on server
8. **Restart** - Restarts application with PM2
9. **Health Check** - Verifies application is responding

## Protected Files

The following files are never overwritten during deployment:
- `.env` - Environment variables
- `bd.sqlite*` - Database files
- `uploads/` - User uploads
- `node_modules/` - Dependencies
- `.git/` - Git metadata

## Troubleshooting

### SSH Connection Issues
- Verify the public key is correctly added to `~/.ssh/authorized_keys` on server
- Check that the server allows SSH key authentication
- Ensure the SSH private key in GitHub Secrets is complete (including `-----BEGIN/END RSA PRIVATE KEY-----`)

### Build Failures
- Check the build logs in GitHub Actions
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Health Check Failures
- Check if the application is running on the correct port
- Verify firewall settings allow access to the port
- Check PM2 logs: `pm2 logs takymed`

### Manual Deployment
If GitHub Actions fail, you can still deploy manually:
```bash
./scripts/push.sh
```

## Security Notes

- SSH keys are stored encrypted in GitHub Secrets
- Sensitive files are excluded from deployment
- The workflow runs with minimal permissions
- Consider using a non-root user for better security
