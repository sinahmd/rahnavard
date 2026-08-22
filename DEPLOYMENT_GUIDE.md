# Rahnavard Automotive - Deployment Guide for Arvan Cloud

## Prerequisites

- Arvan Cloud server with Ubuntu 22.04+
- Domain `rahnavard.co` pointed to your server IP
- SSH access to the server
- GitHub repository with the code

## Step 1: Server Setup (One-time)

SSH into your Arvan Cloud server and run:

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/sinahmd/rahnavard/main/scripts/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

Or manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Create project directory
sudo mkdir -p /var/www/rahnavard
sudo chown -R $USER:$USER /var/www/rahnavard

# Clone repository
cd /var/www/rahnavard
git clone https://github.com/sinahmd/rahnavard.git .

# Copy and edit environment file
cp .env.production .env
nano .env  # Edit with your production values
```

## Step 2: Configure Environment Variables

Edit `/var/www/rahnavard/.env`:

```bash
# Django
DEBUG=0
SECRET_KEY=<generate-a-strong-random-key>
ALLOWED_HOSTS=rahnavard.co,www.rahnavard.co,backend
DATABASE_URL=postgres://rahnavard_user:<your-password>@postgres:5432/rahnavard
CORS_ALLOWED_ORIGINS=https://rahnavard.co,https://www.rahnavard.co
CSRF_TRUSTED_ORIGINS=https://rahnavard.co,https://www.rahnavard.co

# Next.js
NEXT_PUBLIC_SITE_URL=https://rahnavard.co
NEXT_PUBLIC_API_URL=https://rahnavard.co/api/v1

# PostgreSQL
POSTGRES_DB=rahnavard
POSTGRES_USER=rahnavard_user
POSTGRES_PASSWORD=<your-password>
```

Generate a secret key:
```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Step 3: Setup SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d rahnavard.co -d www.rahnavard.co

# Follow the prompts and choose to redirect HTTP to HTTPS
```

## Step 4: Deploy the Application

```bash
cd /var/www/rahnavard

# Build and start services
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Create superuser for admin
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Collect static files
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## Step 5: Verify Deployment

```bash
# Check if services are running
docker compose -f docker-compose.prod.yml ps

# Check backend health
curl http://localhost:8000/api/v1/settings/

# Check frontend
curl http://localhost:3000

# Check nginx
curl http://localhost
```

Visit:
- Website: https://rahnavard.co
- Admin: https://rahnavard.co/admin

## GitHub Actions CI/CD Setup

### 1. Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `SERVER_HOST`: Your Arvan Cloud server IP
- `SERVER_USER`: SSH username (usually `root` or your user)
- `DEPLOY_SSH_KEY`: Your SSH private key

### 2. Generate SSH Key (if needed)

On your local machine:
```bash
ssh-keygen -t ed25519 -C "github-deploy"
```

Add the public key to your server:
```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server-ip
```

Add the private key content to GitHub secret `DEPLOY_SSH_KEY`.

### 3. Push to Deploy

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

The GitHub Action will automatically:
1. Lint and check the code
2. Build the application
3. Deploy to your Arvan Cloud server

## Manual Deployment

If you need to deploy manually:

```bash
# On your server
cd /var/www/rahnavard
./scripts/deploy.sh
```

## Backup and Restore

### Create Backup
```bash
./scripts/backup.sh
```

### Restore from Backup
```bash
./scripts/restore.sh
```

## Monitoring

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build
```

### Database issues
```bash
# Access database
docker compose -f docker-compose.prod.yml exec postgres psql -U rahnavard_user -d rahnavard

# Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### SSL issues
```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## Admin Dashboard

After deployment, access the admin dashboard:

1. Go to https://rahnavard.co/admin
2. Login with your superuser credentials
3. You can manage:
   - Site settings (logo, contact info, section titles)
   - Hero slides
   - Cars (add, edit, delete, feature)
   - Articles (add, edit, publish)
   - Branches
   - Inquiries
   - Why features

## Content Management

All content is now manageable from the admin dashboard:

1. **Site Settings**: Logo, phone, address, section titles, footer text
2. **Hero Slides**: Upload images, set alt text, reorder
3. **Cars**: Full CRUD with images, SEO fields
4. **Articles**: Full CRUD with rich content, publishing workflow
5. **Branches**: Add/edit branches with map links
6. **Inquiries**: View and manage customer inquiries

## Support

For issues or questions:
- Check the logs: `docker compose -f docker-compose.prod.yml logs`
- Review this documentation
- Check GitHub Issues
