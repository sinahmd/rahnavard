#!/bin/bash
# Production deployment script for Rahnavard Automotive
# Zero-downtime deployment with health checks

set -e

PROJECT_DIR="/var/www/rahnavard"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Starting deployment..."

cd "$PROJECT_DIR"

# Check .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Copy .env.production to .env and configure it."
    exit 1
fi

# Source .env for validation
source .env

# Validate critical variables
if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "CHANGE-THIS-TO-A-STRONG-RANDOM-KEY" ]; then
    echo "❌ Error: SECRET_KEY not set in .env!"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "CHANGE-PASSWORD" ]; then
    echo "❌ Error: POSTGRES_PASSWORD not set in .env!"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git fetch origin main
git reset --hard origin/main

# Build images (no cache for clean build)
echo "📦 Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --no-cache

# Run migrations BEFORE restarting (using a temporary container)
echo "🗄️  Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend python manage.py migrate --noinput

# Rolling restart: backend first, then frontend, then nginx
echo "🔄 Rolling restart..."

# Restart backend
echo "  → Restarting backend..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps backend
sleep 10

# Wait for backend health
echo "  → Waiting for backend health..."
for i in $(seq 1 30); do
    if docker compose -f "$COMPOSE_FILE" exec -T backend python -c "
import urllib.request
try:
    urllib.request.urlopen('http://localhost:8000/api/v1/settings/')
    print('ok')
except:
    exit(1)
" 2>/dev/null; then
        echo "  ✅ Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "  ❌ Backend failed health check"
        docker compose -f "$COMPOSE_FILE" logs backend | tail -30
        exit 1
    fi
    sleep 5
done

# Restart frontend
echo "  → Restarting frontend..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps frontend
sleep 10

# Restart nginx last
echo "  → Restarting nginx..."
docker compose -f "$COMPOSE_FILE" up -d --no-deps nginx

# Final health check
echo ""
echo "🏥 Final health checks..."
sleep 5

HEALTH_OK=true

if curl -f -s -o /dev/null https://rahnavard.co/api/v1/settings/; then
    echo "  ✅ API is healthy"
else
    echo "  ⚠️  API health check failed"
    HEALTH_OK=false
fi

if curl -f -s -o /dev/null https://rahnavard.co; then
    echo "  ✅ Frontend is healthy"
else
    echo "  ⚠️  Frontend health check failed"
    HEALTH_OK=false
fi

# Show running containers
echo ""
echo "📊 Running containers:"
docker compose -f "$COMPOSE_FILE" ps

# Cleanup old images
echo ""
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

if [ "$HEALTH_OK" = true ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo "🌐 Website: https://rahnavard.co"
    echo "🔧 Admin: https://rahnavard.co/admin"
else
    echo ""
    echo "⚠️  Deployment completed with warnings. Check logs above."
    echo "🔧 Admin: https://rahnavard.co/admin"
fi
