#!/bin/bash
# Backup script for Rahnavard Automotive
# Run this regularly via cron

set -e

BACKUP_DIR="/var/backups/rahnavard"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/var/www/rahnavard"

echo "💾 Starting backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "🗄️  Backing up database..."
cd $PROJECT_DIR
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U rahnavard_user rahnavard | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup media files
echo "📁 Backing up media files..."
tar -czf $BACKUP_DIR/media_$DATE.tar.gz -C $PROJECT_DIR media/

# Backup .env file
echo "📝 Backing up configuration..."
cp $PROJECT_DIR/.env $BACKUP_DIR/env_$DATE.backup

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete

# Calculate backup size
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)

echo ""
echo "✅ Backup completed!"
echo "📁 Backup location: $BACKUP_DIR"
echo "💾 Total backup size: $BACKUP_SIZE"
echo ""
echo "📋 Backups created:"
ls -lh $BACKUP_DIR/*$DATE*
