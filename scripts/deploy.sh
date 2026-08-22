#!/bin/bash
# Manual deployment script for Rahnavard Automotive
# Use this for manual deployments or troubleshooting

set -e

echo "🚀 Starting manual deployment..."

# Navigate to project directory
cd /var/www/rahnavard

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.production to .env and update with real values."
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git fetch origin main
git reset --hard origin/main

# Build images
echo "📦 Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

# Run migrations
echo "🗄️  Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm backend python manage.py migrate --noinput

# Collect static files
echo "📁 Collecting static files..."
docker compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --noinput

# Start services
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 15

# Health checks
echo "🏥 Running health checks..."

# Check backend
if curl -f -s http://localhost:8000/api/v1/settings/ > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed - checking logs..."
    docker compose -f docker-compose.prod.yml logs backend | tail -20
fi

# Check frontend
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend health check failed - checking logs..."
    docker compose -f docker-compose.prod.yml logs frontend | tail -20
fi

# Check nginx
if curl -f -s http://localhost > /dev/null 2>&1; then
    echo "✅ Nginx is healthy"
else
    echo "⚠️  Nginx health check failed"
fi

# Show running containers
echo ""
echo "📊 Running containers:"
docker compose -f docker-compose.prod.yml ps

# Cleanup
echo ""
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo ""
echo "✅ Deployment completed!"
echo "🌐 Website: https://rahnavard.co"
echo "🔧 Admin: https://rahnavard.co/admin"
