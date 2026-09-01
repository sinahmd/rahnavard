#!/bin/bash
# =============================================================================
# apply-local-only.sh — Restore local-only changes after merging main
#
# Run this AFTER:
#   1. You merged develop → main (with local-only changes reverted)
#   2. You switched back to develop
#   3. You merged main into develop
#
# This script finds the most recent local-only stash and applies it.
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

# Find the most recent local-only stash
STASH_LIST=$(git stash list | grep "local-only-" | head -1)

if [ -z "$STASH_LIST" ]; then
    echo -e "${YELLOW}No local-only stash found.${NC}"
    echo ""
    echo "If you haven't run prepare-merge.sh yet, the stash doesn't exist."
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

# Extract stash reference
STASH_REF=$(echo "$STASH_LIST" | cut -d: -f1)
echo -e "${CYAN}Found stash: $STASH_LIST${NC}"
echo ""

# Apply the stash
echo -e "${CYAN}Applying local-only changes...${NC}"
if git stash pop "$STASH_REF" 2>/dev/null; then
    echo -e "${GREEN}   ✅ Local-only changes restored!${NC}"
else
    echo -e "${YELLOW}   ⚠️  Stash pop had conflicts. Attempting force apply...${NC}"
    # If pop fails (e.g., due to merge conflicts from main changes),
    # try to apply without removing from stash
    if git stash apply "$STASH_REF" 2>/dev/null; then
        echo -e "${GREEN}   ✅ Changes applied (stash preserved for safety).${NC}"
        echo -e "${YELLOW}   Resolve any conflicts, then delete stash: git stash drop $STASH_REF${NC}"
    else
        echo -e "${RED}   ❌ Could not apply stash. Manual intervention needed.${NC}"
        echo ""
        echo "Stash contents:"
        git stash show -p "$STASH_REF" | head -100
        echo ""
        echo "Try: git stash apply $STASH_REF"
        echo "Or manually re-apply changes from LOCAL_ONLY_FILES.txt"
        exit 1
    fi
fi

echo ""

# Verify key files
echo -e "${CYAN}Verifying key local-only files...${NC}"

# Check apiUrl.ts has client-side logic
if grep -q "window.location.hostname" frontend/lib/apiUrl.ts 2>/dev/null; then
    echo "   ✅ apiUrl.ts — client-side URL rewriting present"
else
    echo -e "   ${YELLOW}⚠️  apiUrl.ts — missing client-side URL rewriting${NC}"
fi

# Check Dockerfile has Arvan mirror removed
if grep -q "^#.*npm config set registry" frontend/Dockerfile 2>/dev/null; then
    echo "   ✅ Dockerfile — Arvan mirror commented out"
elif grep -q "npm config set registry" frontend/Dockerfile 2>/dev/null; then
    echo -e "   ${YELLOW}⚠️  Dockerfile — Arvan mirror still active (will cause 403 outside Iran)${NC}"
else
    echo "   ✅ Dockerfile — no npm mirror configured"
fi

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN} ✅ Local dev environment restored!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Run 'docker compose up --build' to start local development."
echo ""
