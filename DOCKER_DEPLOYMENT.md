# AvatarHumanCapital - Docker Deployment Guide

## 🐳 Docker Deployment to DigitalOcean

This guide walks you through deploying AvatarHumanCapital using Docker on DigitalOcean.

---

## 📋 Prerequisites

- DigitalOcean account
- Domain name (optional, but recommended)
- GitHub repository access
- Environment variables (API keys, database URL, etc.)

---

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# On your DigitalOcean droplet
cd /opt/avatarhc
git clone https://github.com/ZubeidHendricks/AvatarHumanCapital.git .
./deploy.sh
```

### Option 2: Docker Compose

```bash
# Create .env file first
docker-compose up -d
```

---

## 📝 Step-by-Step Deployment

### 1. Create DigitalOcean Droplet

**Recommended specs:**
- **OS:** Ubuntu 22.04 LTS
- **Size:** 2GB RAM / 2 CPUs (Basic)
- **Storage:** 50GB SSD

Create droplet via:
- DigitalOcean Dashboard
- Or use `doctl` CLI

### 2. Initial Droplet Setup

SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

Run setup script:
```bash
curl -fsSL https://raw.githubusercontent.com/ZubeidHendricks/AvatarHumanCapital/main/setup-droplet.sh | bash
```

Or manually:
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
apt-get install -y git nginx certbot python3-certbot-nginx

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp
ufw --force enable
```

### 3. Clone Repository

```bash
cd /opt
mkdir avatarhc
cd avatarhc
git clone https://github.com/ZubeidHendricks/AvatarHumanCapital.git .
```

### 4. Configure Environment Variables

Create `.env` file:
```bash
nano .env
```

Add your environment variables:
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Application
NODE_ENV=production
SESSION_SECRET=your-super-secret-key-change-this

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
HUME_API_KEY=your-hume-key
HUME_SECRET_KEY=your-hume-secret

# PNet Integration
PNET_ORG_ID=120911
PNET_SENDER_ID=21965
PNET_API_URL=https://api.pnet.co.za
PNET_USERNAME=your-pnet-username
PNET_PASSWORD=your-pnet-password

# Optional Services
DEEPGRAM_API_KEY=your-deepgram-key
GOOGLE_CREDENTIALS=your-google-credentials-json
```

Save and exit (Ctrl+X, Y, Enter)

### 5. Deploy with Docker

```bash
./deploy.sh
```

This script will:
1. Build Docker image
2. Stop old container (if exists)
3. Start new container
4. Show logs and status

### 6. Setup Nginx Reverse Proxy (Optional but Recommended)

Copy Nginx configuration:
```bash
cp nginx.conf /etc/nginx/sites-available/avatarhc
```

Edit with your domain:
```bash
nano /etc/nginx/sites-available/avatarhc
# Replace 'your-domain.com' with your actual domain
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/avatarhc /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

### 7. Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow prompts to:
- Enter email
- Agree to terms
- Choose redirect option (recommended)

Auto-renewal is configured automatically!

---

## 🔧 Docker Commands

### View Logs
```bash
docker logs -f avatarhc-container
```

### Restart Application
```bash
docker restart avatarhc-container
```

### Stop Application
```bash
docker stop avatarhc-container
```

### Remove Container
```bash
docker rm -f avatarhc-container
```

### Rebuild Image
```bash
docker build -t avatarhc-app:latest .
```

### Using Docker Compose
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build
```

---

## 📊 Monitoring

### Check Container Status
```bash
docker ps
```

### View Resource Usage
```bash
docker stats avatarhc-container
```

### Check Health
```bash
curl http://localhost:5000/api/health
```

---

## 🔄 Updating the Application

```bash
# Pull latest code
cd /opt/avatarhc
git pull origin main

# Rebuild and deploy
./deploy.sh
```

---

## 🗂️ File Structure

```
/opt/avatarhc/
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Files to exclude from image
├── deploy.sh              # Deployment script
├── setup-droplet.sh       # Droplet setup script
├── nginx.conf             # Nginx configuration
├── .env                   # Environment variables (create this)
├── uploads/               # Persistent upload storage
└── ...                    # Application code
```

---

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker logs avatarhc-container

# Check if port is in use
netstat -tulpn | grep 5000

# Verify environment variables
docker exec avatarhc-container env | grep DATABASE_URL
```

### Database connection issues
```bash
# Test database connection from container
docker exec avatarhc-container node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(console.log).catch(console.error);
"
```

### Out of memory
```bash
# Check memory usage
free -h
docker stats

# Upgrade droplet or add swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### SSL certificate renewal
```bash
# Test renewal
certbot renew --dry-run

# Force renewal
certbot renew --force-renewal
```

---

## 🔒 Security Best Practices

1. **Use strong passwords** for all services
2. **Enable firewall** (ufw)
3. **Setup SSL/HTTPS** with Let's Encrypt
4. **Keep system updated**: `apt-get update && apt-get upgrade`
5. **Use SSH keys** instead of password authentication
6. **Limit SSH access** to specific IPs (optional)
7. **Regular backups** of database and uploads
8. **Monitor logs** for suspicious activity

---

## 📈 Performance Optimization

### Nginx Caching
Add to nginx.conf:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
proxy_cache my_cache;
```

### Docker Resource Limits
```yaml
# In docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## 🎯 Production Checklist

- [ ] Droplet created and configured
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned
- [ ] `.env` file configured with production values
- [ ] Application deployed and running
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed
- [ ] Firewall enabled and configured
- [ ] Database migrations run
- [ ] Health check endpoint working
- [ ] Logs being monitored
- [ ] Backup strategy in place
- [ ] Domain DNS configured

---

## 📞 Support

For issues or questions:
- Check logs: `docker logs -f avatarhc-container`
- Review documentation: `FLEETLOGIX_*.md` files
- Check GitHub Issues

---

## 🎉 Success!

Your application should now be running at:
- **HTTP:** http://your-droplet-ip:5000
- **With Nginx:** http://your-domain.com
- **With SSL:** https://your-domain.com

Login and start using FleetLogix! 🚀
