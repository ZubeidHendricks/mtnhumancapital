#!/bin/bash

# DigitalOcean Droplet Setup Script
# Run this on your DigitalOcean droplet after initial setup

set -e

echo "🔧 Setting up DigitalOcean droplet for AvatarHumanCapital..."

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "✓ Docker installed"
else
    echo "✓ Docker already installed"
fi

# Install Docker Compose
echo "🐙 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✓ Docker Compose installed"
else
    echo "✓ Docker Compose already installed"
fi

# Install Git
echo "📚 Installing Git..."
if ! command -v git &> /dev/null; then
    apt-get install -y git
    echo "✓ Git installed"
else
    echo "✓ Git already installed"
fi

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /opt/avatarhc
cd /opt/avatarhc

# Clone repository (you'll need to provide credentials)
echo ""
echo "📥 Ready to clone repository"
echo "Run: git clone https://github.com/ZubeidHendricks/AvatarHumanCapital.git ."
echo ""

# Setup firewall
echo "🔒 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp
ufw --force enable
echo "✓ Firewall configured"

# Install Nginx (optional, for reverse proxy)
echo "🌐 Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
echo "✓ Nginx installed"

# Install Certbot for SSL (optional)
echo "🔐 Installing Certbot for SSL..."
apt-get install -y certbot python3-certbot-nginx
echo "✓ Certbot installed"

echo ""
echo "✅ Droplet setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Clone your repository: cd /opt/avatarhc && git clone <your-repo-url> ."
echo "2. Create .env file with your environment variables"
echo "3. Run: ./deploy.sh"
echo "4. Setup Nginx reverse proxy (optional)"
echo "5. Setup SSL with certbot (optional)"
echo ""
echo "🌐 Your app will be available at:"
echo "   http://your-droplet-ip:5000"
echo "   or http://your-domain.com (after Nginx setup)"
