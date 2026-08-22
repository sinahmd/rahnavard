#!/bin/bash
# Server Setup Script for Arvan Cloud
# Run this once on your Arvan Cloud server

set -e

echo "🚀 Setting up Rahnavard Automotive server..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    sudo apt install -y docker-compose-plugin
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install Nginx (for SSL termination if needed)
echo "🌐 Installing Nginx..."
sudo apt install -y nginx certbot python3-certbot-nginx

# Create project directory
echo "📁 Creating project directory..."
sudo mkdir -p /var/www/rahnavard
sudo chown -R $USER:$USER /var/www/rahnavard

# Clone repository
echo "📥 Cloning repository..."
cd /var/www/rahnavard
if [ ! -d ".git" ]; then
    git clone https://github.com/YOUR_USERNAME/rahnavard.git .
fi

# Create .env file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.production .env
    echo "⚠️  Please edit /var/www/rahnavard/.env with your production values!"
fi

# Create SSL directory
sudo mkdir -p /var/www/rahnavard/nginx/ssl

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Setup automatic updates
echo "🔄 Setting up automatic security updates..."
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Setup log rotation
echo "📋 Setting up log rotation..."
sudo tee /etc/logrotate.d/rahnavard > /dev/null <<EOF
/var/www/rahnavard/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF

# Create logs directory
mkdir -p /var/www/rahnavard/logs

# Setup systemd service for auto-restart
echo "⚙️  Setting up systemd service..."
sudo tee /etc/systemd/system/rahnavard.service > /dev/null <<EOF
[Unit]
Description=Rahnavard Automotive
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/var/www/rahnavard
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable rahnavard.service

echo ""
echo "✅ Server setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit /var/www/rahnavard/.env with your production values"
echo "2. Setup SSL certificate:"
echo "   sudo certbot --nginx -d rahnavard.co -d www.rahnavard.co"
echo "3. Start the application:"
echo "   cd /var/www/rahnavard && docker compose -f docker-compose.prod.yml up -d"
echo "4. Create superuser:"
echo "   docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
echo "5. Run migrations:"
echo "   docker compose -f docker-compose.prod.yml exec backend python manage.py migrate"
echo ""
echo "🌐 Your site will be available at: https://rahnavard.co"
