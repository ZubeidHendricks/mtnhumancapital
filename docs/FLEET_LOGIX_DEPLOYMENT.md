# 🚛 FLEET LOGIX - New Tenant Deployment Guide

## Overview
This guide walks you through setting up FLEET LOGIX as a new tenant on a separate Digital Ocean droplet instance. FLEET LOGIX will have its own database, isolated environment, and custom branding.

---

## 📋 Prerequisites

- Digital Ocean account with billing enabled
- Domain name (e.g., `fleetlogix.co.za` or subdomain `fleetlogix.ahc.ai`)
- SSH key for server access
- Basic knowledge of Linux/Ubuntu server administration

---

## 🎯 Deployment Strategy

### Option 1: Separate Droplet (Recommended for Production)
- **Pros**: Complete isolation, independent scaling, dedicated resources
- **Cons**: Higher cost, separate maintenance
- **Best for**: Production deployment with 50+ users

### Option 2: Shared Instance with Tenant Isolation
- **Pros**: Cost-effective, shared infrastructure
- **Cons**: Shared resources, potential performance impact
- **Best for**: Initial deployment, testing, or smaller operations

This guide covers **Option 1** (separate droplet).

---

## 🖥️ Step 1: Create Digital Ocean Droplet

### 1.1 Create Droplet
```bash
# Via Digital Ocean Web Console:
# 1. Click "Create" → "Droplets"
# 2. Choose Image: Ubuntu 22.04 LTS
# 3. Choose Plan: 
#    - Basic: $12/month (2GB RAM, 1 vCPU) - Development
#    - Regular: $24/month (4GB RAM, 2 vCPU) - Production
# 4. Choose datacenter: Cape Town (CPT1) for South Africa
# 5. Authentication: Add your SSH key
# 6. Hostname: fleetlogix-production
# 7. Tags: fleetlogix, production, ahc-tenant
```

### 1.2 Point Domain to Droplet
```bash
# Option A: Using custom domain (fleetlogix.co.za)
# Add A record in your DNS provider:
# Type: A
# Host: @
# Value: <droplet-ip-address>
# TTL: 3600

# Option B: Using subdomain (fleetlogix.ahc.ai)
# Add A record in ahc.ai DNS:
# Type: A
# Host: fleetlogix
# Value: <droplet-ip-address>
# TTL: 3600
```

---

## 🔧 Step 2: Server Setup

### 2.1 Initial Server Configuration
```bash
# SSH into your droplet
ssh root@<droplet-ip>

# Update system packages
apt update && apt upgrade -y

# Create deployment user
adduser ahc
usermod -aG sudo ahc

# Setup firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Switch to deployment user
su - ahc
```

### 2.2 Install Required Software
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x
npm --version   # Should be v10.x

# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2.3 Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user for FLEET LOGIX
CREATE DATABASE fleetlogix_prod;
CREATE USER fleetlogix_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE fleetlogix_prod TO fleetlogix_user;

# Enable pgvector extension (for AI/RAG features)
\c fleetlogix_prod
CREATE EXTENSION IF NOT EXISTS vector;

# Exit psql
\q
```

---

## 📦 Step 3: Deploy Application Code

### 3.1 Clone Repository
```bash
# Create application directory
cd /home/ahc
mkdir -p apps/fleetlogix
cd apps/fleetlogix

# Clone the repository (replace with your repo URL)
git clone https://github.com/your-org/AvatarHumanCapital.git .

# Or upload via SCP/rsync from local machine:
# rsync -avz --exclude 'node_modules' --exclude '.git' \
#   /local/path/to/AvatarHumanCapital/ ahc@<droplet-ip>:/home/ahc/apps/fleetlogix/
```

### 3.2 Install Dependencies
```bash
# Install Node.js dependencies
npm ci --production

# Build the application
npm run build
```

### 3.3 Configure Environment Variables
```bash
# Create production environment file
nano .env.production

# Add the following configuration:
```

```env
# Database Configuration
DATABASE_URL=postgresql://fleetlogix_user:YOUR_SECURE_PASSWORD_HERE@localhost:5432/fleetlogix_prod

# Application Settings
NODE_ENV=production
PORT=5000

# Authentication (CHANGE THESE!)
JWT_SECRET=generate-a-random-64-character-secret-key-here-use-openssl-rand-base64-48
SESSION_SECRET=generate-another-random-secret-key-for-sessions-use-openssl-rand-base64-48

# Admin API Protection
ADMIN_API_KEY=generate-a-secure-admin-api-key-for-protected-endpoints

# AI Services (Required)
GROQ_API_KEY=gsk_your_groq_api_key_here
OPENAI_API_KEY=sk-your_openai_api_key_here

# Optional AI Services (if using interviews)
HUME_API_KEY=your_hume_api_key_if_using_voice_interviews
HUME_SECRET_KEY=your_hume_secret_key_if_using_voice_interviews
TAVUS_API_KEY=your_tavus_api_key_if_using_video_interviews

# WhatsApp Integration (if using)
WHATSAPP_API_TOKEN=your_whatsapp_business_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=fleetlogix-noreply@yourcompany.com
SMTP_PASSWORD=your_app_specific_password

# PNET Integration (South African Job Boards)
PNET_API_BASE_URL=https://fleetlogix.co.za/pnet-api
PNET_API_KEY=your_pnet_api_key_when_available
```

```bash
# Generate secure secrets
openssl rand -base64 48  # Use for JWT_SECRET
openssl rand -base64 48  # Use for SESSION_SECRET
openssl rand -hex 32     # Use for ADMIN_API_KEY
```

### 3.4 Initialize Database
```bash
# Push database schema
npm run db:push

# The application will seed default tenant on first run
```

---

## 🎨 Step 4: Configure FLEET LOGIX Tenant

### 4.1 Create Tenant Configuration Script
```bash
# Create tenant setup script
nano setup-fleetlogix-tenant.ts
```

```typescript
import { db } from "./server/db";
import { tenantConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

async function setupFleetLogixTenant() {
  try {
    // Check if tenant already exists
    const existing = await db.query.tenantConfig.findFirst({
      where: eq(tenantConfig.subdomain, 'fleetlogix')
    });

    if (existing) {
      console.log('✓ FLEET LOGIX tenant already exists');
      return existing;
    }

    // Create FLEET LOGIX tenant
    const [tenant] = await db.insert(tenantConfig).values({
      companyName: 'FLEET LOGIX',
      subdomain: 'fleetlogix',
      primaryColor: '#1a472a', // Fleet green color
      logoUrl: '/uploads/fleetlogix-logo.png', // Upload logo separately
      tagline: 'Professional Fleet Management & Logistics Recruitment',
      industry: 'Logistics & Transportation',
      modulesEnabled: {
        recruitment: true,
        integrity: true,
        onboarding: true,
        hr_management: true,
        fleet_management: true, // Custom module
      },
      apiKeysConfigured: {
        groq: true,
        openai: true,
        whatsapp: false, // Enable when configured
        pnet: false,     // Enable when configured
      },
    }).returning();

    console.log('✓ FLEET LOGIX tenant created successfully');
    console.log('  - Company:', tenant.companyName);
    console.log('  - Subdomain:', tenant.subdomain);
    console.log('  - Tenant ID:', tenant.id);
    
    return tenant;
  } catch (error) {
    console.error('Failed to setup FLEET LOGIX tenant:', error);
    throw error;
  }
}

setupFleetLogixTenant()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

```bash
# Run the tenant setup
npx tsx setup-fleetlogix-tenant.ts
```

### 4.2 Create Admin User for FLEET LOGIX
```bash
# Create admin user script
nano create-fleetlogix-admin.ts
```

```typescript
import { db } from "./server/db";
import { users, tenantConfig } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createFleetLogixAdmin() {
  try {
    // Get FLEET LOGIX tenant
    const tenant = await db.query.tenantConfig.findFirst({
      where: eq(tenantConfig.subdomain, 'fleetlogix')
    });

    if (!tenant) {
      throw new Error('FLEET LOGIX tenant not found. Run setup script first.');
    }

    // Check if admin exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.username, 'fleetlogix_admin')
    });

    if (existingAdmin) {
      console.log('✓ Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('ChangeThisPassword123!', 10);

    // Create admin user
    const [admin] = await db.insert(users).values({
      tenantId: tenant.id,
      username: 'fleetlogix_admin',
      password: hashedPassword,
      role: 'tenant_admin',
      isSuperAdmin: 0,
    }).returning();

    console.log('✓ Admin user created successfully');
    console.log('  - Username: fleetlogix_admin');
    console.log('  - Password: ChangeThisPassword123! (CHANGE THIS IMMEDIATELY!)');
    console.log('  - Role: tenant_admin');
    
  } catch (error) {
    console.error('Failed to create admin user:', error);
    throw error;
  }
}

createFleetLogixAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

```bash
# Run the admin creation
npx tsx create-fleetlogix-admin.ts
```

---

## 🚀 Step 5: Configure Nginx & SSL

### 5.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/fleetlogix
```

```nginx
# FLEET LOGIX Nginx Configuration

upstream fleetlogix_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

server {
    listen 80;
    server_name fleetlogix.co.za www.fleetlogix.co.za;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fleetlogix.co.za www.fleetlogix.co.za;

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/fleetlogix.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fleetlogix.co.za/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size for CVs/documents
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Root directory for static files
    root /home/ahc/apps/fleetlogix/dist/public;
    index index.html;

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploads directory
    location /uploads/ {
        alias /home/ahc/apps/fleetlogix/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # API requests
    location /api/ {
        proxy_pass http://fleetlogix_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support for real-time features
    location /ws {
        proxy_pass http://fleetlogix_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback - serve index.html for all other routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/fleetlogix /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx
```

### 5.2 Obtain SSL Certificate
```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d fleetlogix.co.za -d www.fleetlogix.co.za

# Follow prompts and choose:
# - Email for urgent renewal and security notices
# - Agree to terms of service
# - Redirect HTTP to HTTPS (recommended)

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 🔄 Step 6: Start Application with PM2

### 6.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.cjs
```

```javascript
module.exports = {
  apps: [{
    name: 'fleetlogix-prod',
    script: 'dist/index.js',
    instances: 2, // Use 2 CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    env_file: '.env.production',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
  }]
};
```

### 6.2 Start Application
```bash
# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Run the command provided by PM2

# Monitor application
pm2 monit

# View logs
pm2 logs fleetlogix-prod
```

---

## ✅ Step 7: Verify Deployment

### 7.1 Health Checks
```bash
# Check if application is running
pm2 status

# Check if Nginx is serving requests
curl -I https://fleetlogix.co.za

# Test API endpoint
curl https://fleetlogix.co.za/api/health

# Check database connection
sudo -u postgres psql -d fleetlogix_prod -c "SELECT COUNT(*) FROM tenant_config;"
```

### 7.2 Access Application
```
1. Open browser: https://fleetlogix.co.za
2. Login with admin credentials:
   - Username: fleetlogix_admin
   - Password: ChangeThisPassword123!
3. IMMEDIATELY change password in settings
4. Configure company branding (logo, colors)
5. Setup user accounts for FLEET LOGIX team
```

---

## 📊 Step 8: Post-Deployment Configuration

### 8.1 Upload Company Logo
```bash
# Create uploads directory with correct permissions
mkdir -p /home/ahc/apps/fleetlogix/uploads
chmod 755 /home/ahc/apps/fleetlogix/uploads

# Upload logo via SCP or through the web interface
# Recommended size: 200x200px PNG with transparent background
```

### 8.2 Configure Modules
1. Login as admin
2. Go to **Settings → Tenant Configuration**
3. Enable required modules:
   - ✅ Recruitment & Sourcing
   - ✅ Integrity Checks
   - ✅ Onboarding
   - ✅ HR Management
   - ✅ Fleet-specific features (if applicable)

### 8.3 Setup WhatsApp (Optional)
```bash
# If FLEET LOGIX wants WhatsApp integration:
# 1. Create Meta Business Account
# 2. Setup WhatsApp Business API
# 3. Get credentials and add to .env.production
# 4. Restart application: pm2 restart fleetlogix-prod
```

### 8.4 Configure PNET Integration (Optional)
```bash
# For South African job board integration:
# 1. Contact PNET for API access
# 2. Add credentials to .env.production
# 3. Update tenant config to enable PNET
# 4. Restart application
```

---

## 🔒 Security Checklist

- [ ] Changed default admin password
- [ ] Generated strong JWT_SECRET and SESSION_SECRET
- [ ] Configured firewall (UFW) with only necessary ports open
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Database password is strong and unique
- [ ] Regular backups configured (see below)
- [ ] Monitoring and alerts setup
- [ ] Security headers configured in Nginx
- [ ] Rate limiting enabled (if applicable)
- [ ] File upload size limits set

---

## 💾 Backup Strategy

### Daily Database Backups
```bash
# Create backup script
sudo nano /usr/local/bin/backup-fleetlogix.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ahc/backups/fleetlogix"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="fleetlogix_prod"
DB_USER="fleetlogix_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U $DB_USER -d $DB_NAME -F c -f "$BACKUP_DIR/db_$DATE.dump"

# Backup uploads folder
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /home/ahc/apps/fleetlogix/uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.dump" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-fleetlogix.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add this line:
0 2 * * * /usr/local/bin/backup-fleetlogix.sh >> /var/log/fleetlogix-backup.log 2>&1
```

---

## 📈 Monitoring & Maintenance

### Application Monitoring
```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitor system resources
htop
```

### Regular Maintenance Tasks
```bash
# Weekly: Update system packages
sudo apt update && sudo apt upgrade -y

# Monthly: Check disk space
df -h

# Monthly: Review logs for errors
pm2 logs fleetlogix-prod --lines 100

# Quarterly: Review and optimize database
sudo -u postgres psql -d fleetlogix_prod -c "VACUUM ANALYZE;"
```

---

## 🔄 Update & Deployment Process

### Update Application Code
```bash
cd /home/ahc/apps/fleetlogix

# Pull latest changes
git pull origin main

# Install dependencies
npm ci --production

# Rebuild application
npm run build

# Run database migrations (if any)
npm run db:push

# Restart application
pm2 restart fleetlogix-prod

# Monitor for issues
pm2 logs fleetlogix-prod
```

---

## 🆘 Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs fleetlogix-prod --lines 50

# Check environment variables
pm2 env 0

# Test database connection
psql -U fleetlogix_user -d fleetlogix_prod -h localhost

# Check port availability
sudo netstat -tlnp | grep :5000
```

### Nginx Errors
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Database Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Performance Issues
```bash
# Check system resources
htop

# Check PM2 process status
pm2 monit

# Review slow queries
sudo -u postgres psql -d fleetlogix_prod
# Then run: SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

---

## 📞 Support Contacts

- **Technical Support**: support@avatarhumancapital.com
- **Emergency Hotline**: +27 XX XXX XXXX
- **Documentation**: https://docs.avatarhumancapital.com
- **Status Page**: https://status.avatarhumancapital.com

---

## 📝 Summary Checklist

- [ ] Digital Ocean droplet created and configured
- [ ] Domain DNS configured and propagated
- [ ] Server software installed (Node.js, PostgreSQL, Nginx)
- [ ] Database created and pgvector extension enabled
- [ ] Application code deployed and built
- [ ] Environment variables configured
- [ ] FLEET LOGIX tenant created in database
- [ ] Admin user created and password changed
- [ ] Nginx configured and SSL certificate obtained
- [ ] PM2 process manager configured and running
- [ ] Application accessible via HTTPS
- [ ] Backups configured and tested
- [ ] Monitoring setup
- [ ] Security hardening completed
- [ ] Documentation provided to FLEET LOGIX team

---

## 🎉 Deployment Complete!

Your FLEET LOGIX instance is now live at **https://fleetlogix.co.za**

Next steps:
1. Train FLEET LOGIX team on the platform
2. Import existing candidate data (if applicable)
3. Configure integrations (WhatsApp, PNET)
4. Setup custom workflows and templates
5. Schedule regular check-ins for support

---

*Last Updated: 2026-01-14*
*Version: 1.0*
