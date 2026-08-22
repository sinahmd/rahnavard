#!/bin/bash
# Restore script for Rahnavard Automotive
# Use this to restore from backup

set -e

BACKUP_DIR="/var/backups/rahnavard"
PROJECT_DIR="/var/www/rahnavard"

echo "🔄 Starting restore process..."

# List available backups
echo ""
echo "📋 Available backups:"
ls -lh $BACKUP_DIR/

echo ""
read -p "Enter the backup date (YYYYMMDD_HHMMSS): " BACKUP_DATE

# Verify backup files exist
if [ ! -f "$BACKUP_DIR/db_$BACKUP_DATE.sql.gz" ]; then
    echo "❌ Database backup not found!"
    exit 1
fi

# Confirm restore
echo ""
echo "⚠️  WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Stop services
echo "🛑 Stopping services..."
cd $PROJECT_DIR
docker compose -f docker-compose.prod.yml down

# Start only postgres
echo "🚀 Starting PostgreSQL..."
docker compose -f docker-compose.prod.yml up -d postgres
sleep 5

# Restore database
echo "🗄️  Restoring database..."
gunzip -c $BACKUP_DIR/db_$BACKUP_DATE.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U rahnavard_user -d rahnavard

# Restore media files
if [ -f "$BACKUP_DIR/media_$BACKUP_DATE.tar.gz" ]; then
    echo "📁 Restoring media files..."
    tar -xzf $BACKUP_DIR/media_$BACKUP_DATE.tar.gz -C $PROJECT_DIR
fi

# Start all services
echo "🚀 Starting all services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Running health checks..."
if curl -f -s http://localhost:8000/api/v1/settings/ > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed"
fi

echo ""
echo "✅ Restore completed!"
echo "🌐 Website: https://rahnavard.co"
