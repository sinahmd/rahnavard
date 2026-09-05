#!/bin/bash
# Quick Deploy Script for Rahnavard Automotive
# Run this on the server to deploy without GitHub Actions
#
# Usage:
#   ./scripts/quick-deploy.sh              # Full deploy (pull + build + restart)
#   ./scripts/quick-deploy.sh --no-build   # Skip Docker build (just restart)
#   ./scripts/quick-deploy.sh --pull-only  # Only pull code, don't restart

set -e

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_DIR="/var/www/rahnavard"

cd "$PROJECT_DIR"

# Parse arguments
SKIP_BUILD=false
PULL_ONLY=false

for arg in "$@"; do
  case $arg in
    --no-build)
      SKIP_BUILD=true
      ;;
    --pull-only)
      PULL_ONLY=true
      ;;
    --help)
      echo "Usage: ./scripts/quick-deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --no-build   Skip Docker image build (just restart)"
      echo "  --pull-only  Only pull code, don't restart services"
      echo "  --help       Show this help message"
      exit 0
      ;;
  esac
done

echo "=========================================="
echo "🚀 Quick Deploy - Rahnavard Automotive"
echo "=========================================="

# Step 1: Pull latest code
echo ""
echo "📥 Pulling latest code..."
git fetch --depth 1 origin main
git reset --hard origin/main
echo "✅ Code updated to $(git rev-parse --short HEAD)"

if [ "$PULL_ONLY" = true ]; then
  echo ""
  echo "✅ Pull complete. Run with --no-build to restart without rebuilding."
  exit 0
fi

# Step 2: Build Docker images
if [ "$SKIP_BUILD" = false ]; then
  echo ""
  echo "📦 Building Docker images..."
  docker compose -f $COMPOSE_FILE build --no-cache
  echo "✅ Build complete"
else
  echo ""
  echo "⏭️  Skipping build (--no-build flag)"
fi

# Step 3: Run migrations (idempotent, explicit) BEFORE the new code serves
echo ""
echo "🗄️  Running migrations..."
docker compose -f $COMPOSE_FILE run --rm --no-deps backend python manage.py migrate --noinput
echo "✅ Migrations complete"

# Step 4: Rolling start (NO blind down) — recreate changed containers, bounce
# nginx last so it re-resolves upstream IPs, then health-gate.
echo ""
echo "🔄 Starting services..."
docker compose -f $COMPOSE_FILE up -d --remove-orphans backend
echo "🏥 Waiting for backend health..."
BACKEND_OK=false
for i in $(seq 1 12); do
  if docker compose -f $COMPOSE_FILE exec -T backend python -c "
import urllib.request
try:
    urllib.request.urlopen('http://localhost:8000/api/v1/settings/', timeout=3)
    print('ok')
except Exception:
    exit(1)
" > /dev/null 2>&1; then
    BACKEND_OK=true
    echo "✅ Backend healthy"
    break
  fi
  echo "   ...waiting ($i/12)"
  sleep 5
done
if [ "$BACKEND_OK" != "true" ]; then
  echo "❌ Backend health check failed"
  docker compose -f $COMPOSE_FILE logs --tail=40 backend
  exit 1
fi

docker compose -f $COMPOSE_FILE up -d --remove-orphans frontend
docker compose -f $COMPOSE_FILE up -d --force-recreate --no-deps nginx
echo "✅ Services started"

# Step 5: End-to-end health through nginx
echo ""
echo "🏥 End-to-end health check..."
SITE_OK=false
for i in $(seq 1 12); do
  if curl -sf http://localhost/api/v1/settings/ > /dev/null 2>&1; then
    SITE_OK=true
    echo "✅ Site healthy"
    break
  fi
  echo "   ...waiting ($i/12)"
  sleep 5
done
if [ "$SITE_OK" != "true" ]; then
  echo "❌ Site health check failed"
  docker compose -f $COMPOSE_FILE logs --tail=40 nginx backend
  exit 1
fi

echo ""
echo "📊 Container status:"
docker compose -f $COMPOSE_FILE ps

echo ""
echo "=========================================="
echo "✅ Deploy complete!"
echo "🌐 https://rahnavard.co"
echo "🔧 https://rahnavard.co/admin"
echo "=========================================="
