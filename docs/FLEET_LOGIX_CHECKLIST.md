# 🚀 FLEET LOGIX - Quick Deployment Checklist

Use this checklist to track your deployment progress for FLEET LOGIX on Digital Ocean.

---

## Pre-Deployment

- [ ] Digital Ocean account created with billing enabled
- [ ] Domain name registered (fleetlogix.co.za) or subdomain configured
- [ ] DNS access to create A records
- [ ] Gathered all API keys (GROQ, OpenAI, etc.)
- [ ] Reviewed full deployment guide: `docs/FLEET_LOGIX_DEPLOYMENT.md`

---

## Digital Ocean Setup

- [ ] Created Ubuntu 22.04 LTS droplet
- [ ] Selected appropriate plan size (2GB+ RAM recommended)
- [ ] Chosen Cape Town (CPT1) datacenter region
- [ ] Added SSH key for secure access
- [ ] Tagged droplet: `fleetlogix`, `production`, `ahc-tenant`
- [ ] DNS A record created pointing to droplet IP
- [ ] DNS propagation verified (use: `nslookup fleetlogix.co.za`)

---

## Server Configuration

- [ ] SSH access verified: `ssh root@<droplet-ip>`
- [ ] System packages updated: `apt update && apt upgrade -y`
- [ ] Deployment user created: `ahc`
- [ ] Firewall configured (UFW): ports 22, 80, 443
- [ ] Node.js 20.x installed and verified
- [ ] PostgreSQL 15 installed and running
- [ ] Nginx installed and running
- [ ] PM2 process manager installed globally
- [ ] Certbot installed for SSL certificates

---

## Database Setup

- [ ] PostgreSQL database created: `fleetlogix_prod`
- [ ] Database user created: `fleetlogix_user` with secure password
- [ ] User granted all privileges on database
- [ ] pgvector extension installed in database
- [ ] Database connection tested successfully

---

## Application Deployment

- [ ] Application code deployed to: `/home/ahc/apps/fleetlogix/`
- [ ] Dependencies installed: `npm ci --production`
- [ ] Application built: `npm run build`
- [ ] `.env.production` file created with all required variables
- [ ] Secure secrets generated (JWT_SECRET, SESSION_SECRET, etc.)
- [ ] Database schema pushed: `npm run db:push`
- [ ] Uploads directory created with correct permissions

---

## Tenant Configuration

- [ ] Tenant setup script executed: `npx tsx scripts/setup-tenant.ts`
- [ ] FLEET LOGIX tenant created in database
- [ ] Tenant subdomain configured: `fleetlogix`
- [ ] Company branding configured (colors, tagline)
- [ ] Admin user created: `npx tsx scripts/create-admin.ts`
- [ ] Admin credentials securely documented
- [ ] Company logo prepared (200x200px PNG recommended)
- [ ] Logo uploaded to `/uploads/` directory

---

## Web Server Configuration

- [ ] Nginx configuration file created: `/etc/nginx/sites-available/fleetlogix`
- [ ] Configuration includes all required proxy settings
- [ ] Static file serving configured correctly
- [ ] Upload directory properly mapped
- [ ] WebSocket support enabled (for real-time features)
- [ ] Configuration symlinked to sites-enabled
- [ ] Nginx configuration tested: `sudo nginx -t`
- [ ] Nginx restarted: `sudo systemctl restart nginx`

---

## SSL Certificate

- [ ] Let's Encrypt SSL certificate obtained via certbot
- [ ] Certificate covers both root and www subdomain
- [ ] HTTP to HTTPS redirect configured
- [ ] SSL auto-renewal tested: `sudo certbot renew --dry-run`
- [ ] Security headers configured in Nginx

---

## Application Launch

- [ ] PM2 ecosystem file created: `ecosystem.config.cjs`
- [ ] Application started with PM2: `pm2 start ecosystem.config.cjs`
- [ ] PM2 configuration saved: `pm2 save`
- [ ] PM2 startup script configured: `pm2 startup systemd`
- [ ] Application auto-start on reboot tested
- [ ] Application logs verified: `pm2 logs fleetlogix-prod`
- [ ] Application accessible via HTTPS

---

## Testing & Verification

- [ ] Health check endpoint tested: `curl https://fleetlogix.co.za/api/health`
- [ ] Website loads successfully in browser
- [ ] SSL certificate valid (green padlock icon)
- [ ] Admin login working with created credentials
- [ ] Dashboard loads without errors
- [ ] API requests working correctly
- [ ] File upload functionality tested
- [ ] Database queries executing successfully

---

## Post-Deployment Configuration

- [ ] Admin password changed immediately after first login
- [ ] Company logo uploaded via web interface
- [ ] Tenant branding customized (colors, tagline)
- [ ] Required modules enabled/disabled
- [ ] Additional user accounts created for team
- [ ] User roles and permissions configured
- [ ] Email SMTP settings configured and tested
- [ ] WhatsApp integration configured (if needed)
- [ ] PNET API integration configured (if available)

---

## Backup & Monitoring

- [ ] Backup script created: `/usr/local/bin/backup-fleetlogix.sh`
- [ ] Backup script tested successfully
- [ ] Cron job configured for daily backups (2 AM)
- [ ] Backup retention policy set (7 days)
- [ ] Backup storage location verified
- [ ] PM2 log rotation configured
- [ ] Server monitoring tools installed (htop, etc.)
- [ ] Application monitoring enabled
- [ ] Disk space monitoring configured
- [ ] Alert system setup (optional)

---

## Security Hardening

- [ ] Default admin password changed
- [ ] Strong JWT_SECRET and SESSION_SECRET in use
- [ ] Database password is strong and unique
- [ ] Firewall configured with minimal open ports
- [ ] SSH key-based authentication enforced
- [ ] Root login disabled (if using non-root user)
- [ ] SSL/TLS properly configured
- [ ] Security headers enabled in Nginx
- [ ] File upload size limits configured
- [ ] Rate limiting configured (if applicable)

---

## Documentation & Handover

- [ ] Deployment documentation reviewed with client
- [ ] Admin credentials securely shared with client
- [ ] Server access credentials documented
- [ ] Database credentials documented
- [ ] API keys inventory documented
- [ ] Backup procedures documented
- [ ] Troubleshooting guide provided
- [ ] Support contact information shared
- [ ] Training session scheduled for FLEET LOGIX team
- [ ] Ongoing maintenance plan discussed

---

## Go-Live Verification

- [ ] **Final smoke test completed**
- [ ] **All critical features verified working**
- [ ] **Performance acceptable under load**
- [ ] **Backup tested and verified**
- [ ] **Rollback plan documented**
- [ ] **Client signed off on deployment**
- [ ] **Support channel confirmed**
- [ ] **Monitoring active**

---

## Post Go-Live (Week 1)

- [ ] Daily health checks performed
- [ ] User feedback collected
- [ ] Performance metrics reviewed
- [ ] Error logs monitored
- [ ] Backup verification performed
- [ ] Support tickets addressed
- [ ] Quick fixes deployed if needed
- [ ] Client check-in call completed

---

## Notes Section

```
Date Started: _________________
Date Completed: _________________
Deployed By: _________________
Droplet IP: _________________
Domain: _________________
Tenant ID: _________________
Admin Username: _________________

Issues Encountered:
_________________________________________________
_________________________________________________
_________________________________________________

Resolutions:
_________________________________________________
_________________________________________________
_________________________________________________

Additional Configuration:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## Quick Commands Reference

```bash
# View application logs
pm2 logs fleetlogix-prod

# Restart application
pm2 restart fleetlogix-prod

# Check application status
pm2 status

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check database connection
sudo -u postgres psql -d fleetlogix_prod

# Test SSL certificate
sudo certbot certificates

# Check disk space
df -h

# Monitor system resources
htop

# Run backup manually
sudo /usr/local/bin/backup-fleetlogix.sh

# Update application code
cd /home/ahc/apps/fleetlogix
git pull origin main
npm ci --production
npm run build
pm2 restart fleetlogix-prod
```

---

## Emergency Contacts

- **Technical Support**: ___________________________
- **Digital Ocean Support**: support@digitalocean.com
- **Domain Registrar Support**: ___________________________
- **On-Call Developer**: ___________________________

---

**Deployment Status**: [ ] In Progress  [ ] Completed  [ ] Issues

**Sign-off**: _________________________  **Date**: _____________
