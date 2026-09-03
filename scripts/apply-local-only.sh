#!/bin/bash
# =============================================================================
# apply-local-only.sh — Restore local-only changes after merging main
#
# Run this AFTER:
#   1. You merged develop → main (with local-only changes reverted)
#   2. You switched back to develop
#   3. You merged main into develop
#
# This script restores local-only files from .local-only-backup/
#
# Usage:
#   bash scripts/apply-local-only.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$REPO_ROOT/.local-only-backup"

cd "$REPO_ROOT"

# Verify we're on develop
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "develop" ]; then
    echo -e "${RED}ERROR: Must be on 'develop' branch. Currently on: $BRANCH${NC}"
    exit 1
fi

echo ""
echo "============================================="
echo " 🔄 Apply Local-Only Changes"
echo "============================================="
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}No backup directory found (.local-only-backup/).${NC}"
    echo ""
    echo "If you haven't run prepare-merge.sh yet, the backup doesn't exist."
    echo "You may need to manually re-apply local-only changes."
    echo ""
    echo "Files that need local-only versions:"
    if [ -f "LOCAL_ONLY_FILES.txt" ]; then
        grep -v '^#' LOCAL_ONLY_FILES.txt | grep -v '^\s*$' | sed 's/^[[:space:]]*//' | while read -r f; do
            echo "   $f"
        done
    fi
    exit 0
fi

# Find all backed up files
BACKUP_FILES=()
while IFS= read -r f; do
    [ -z "$f" ] && continue
    BACKUP_FILES+=("$f")
done < <(cd "$BACKUP_DIR" && find . -type f | sed 's|^\./||')

if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}Backup directory is empty.${NC}"
    exit 0
fi

echo -e "${CYAN}Found ${#BACKUP_FILES[@]} backed up files:${NC}"
echo ""

# Step 1: Restore files from backup
echo -e "${CYAN}Restoring local-only files...${NC}"
RESTORED=0

for f in "${BACKUP_FILES[@]}"; do
    BACKUP_PATH="$BACKUP_DIR/$f"
    if [ -f "$BACKUP_PATH" ]; then
        mkdir -p "$(dirname "$f")"
        cp "$BACKUP_PATH" "$f"
        echo "   ✅ $f"
        RESTORED=$((RESTORED + 1))
    fi
done

echo -e "${GREEN}   Restored $RESTORED files${NC}"
echo ""

# Step 2: Clean up backup directory
echo -e "${CYAN}Cleaning up backup...${NC}"
rm -rf "$BACKUP_DIR"
echo -e "${GREEN}   ✅ .local-only-backup/ removed${NC}"
echo ""

# Step 3: Verify key files
echo -e "${CYAN}Verifying key local-only files...${NC}"

# Check Dockerfile has Arvan mirror commented out
if grep -q "^#.*npm config set registry" frontend/Dockerfile 2>/dev/null; then
    echo "   ✅ Dockerfile — Arvan mirror commented out"
elif grep -q "npm config set registry" frontend/Dockerfile 2>/dev/null; then
    echo -e "   ${YELLOW}⚠️  Dockerfile — Arvan mirror still active (will cause 403 outside Iran)${NC}"
else
    echo "   ✅ Dockerfile — no npm mirror configured"
fi

# Check docker-compose has nginx
if grep -q "nginx" docker-compose.yml 2>/dev/null; then
    echo "   ✅ docker-compose.yml — nginx proxy present"
else
    echo -e "   ${YELLOW}⚠️  docker-compose.yml — missing nginx proxy${NC}"
fi

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN} ✅ Local dev environment restored!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Run 'docker compose up --build' to start local development."
echo ""
