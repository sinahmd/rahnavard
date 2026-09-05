#!/bin/bash
# =============================================================================
# prepare-merge.sh — Save local-only changes before merging to main
#
# This script:
#   1. Saves local-only file contents to .local-only-backup/
#   2. Reverts local-only files to their main branch versions
#   3. Shows you the next steps
#
# After merging to main and switching back to develop, run:
#   bash scripts/apply-local-only.sh
#
# Usage:
#   bash scripts/prepare-merge.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_ONLY_FILE="$REPO_ROOT/LOCAL_ONLY_FILES.txt"
BACKUP_DIR="$REPO_ROOT/.local-only-backup"

cd "$REPO_ROOT"

# Source the shared protected-file guard (auth-critical files must never be
# listed as local-only — see scripts/_local_only_guard.sh).
# shellcheck source=scripts/_local_only_guard.sh
source "$REPO_ROOT/scripts/_local_only_guard.sh"

# Verify we're on develop
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "develop" ]; then
    echo -e "${RED}ERROR: Must be on 'develop' branch. Currently on: $BRANCH${NC}"
    exit 1
fi

# Verify LOCAL_ONLY_FILES.txt exists
if [ ! -f "$LOCAL_ONLY_FILE" ]; then
    echo -e "${RED}ERROR: LOCAL_ONLY_FILES.txt not found!${NC}"
    exit 1
fi

# Abort if a protected production file sneaks into the list (settings.py etc.)
guard_local_only_file || exit 1

# Get list of local-only files
LOCAL_ONLY_FILES=$(grep -v '^#' "$LOCAL_ONLY_FILE" | grep -v '^\s*$' | sed 's/^[[:space:]]*//')

if [ -z "$LOCAL_ONLY_FILES" ]; then
    echo -e "${YELLOW}WARNING: LOCAL_ONLY_FILES.txt is empty.${NC}"
    exit 0
fi

echo ""
echo "============================================="
echo " 📦 Prepare for Merge to Main"
echo "============================================="
echo ""

# Step 1: Check which local-only files actually differ from main
CHANGED_FILES=()
UNTRACKED_FILES=()
while IFS= read -r f; do
    [ -z "$f" ] && continue
    if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
        # Tracked file — check if it differs from main
        if ! git diff --quiet "main" -- "$f" 2>/dev/null; then
            CHANGED_FILES+=("$f")
        fi
    elif [ -f "$f" ]; then
        # Untracked file on disk — save it too
        UNTRACKED_FILES+=("$f")
    fi
done <<< "$LOCAL_ONLY_FILES"

if [ ${#CHANGED_FILES[@]} -eq 0 ] && [ ${#UNTRACKED_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ No local-only changes detected. Nothing to save.${NC}"
    echo "   Safe to merge directly."
    echo ""
    exit 0
fi

echo -e "${CYAN}Local-only files with changes (vs main):${NC}"
for f in "${CHANGED_FILES[@]}"; do
    echo "   $f (tracked, differs from main)"
done
for f in "${UNTRACKED_FILES[@]}"; do
    echo "   $f (untracked)"
done
echo ""

# Step 2: Save file contents to backup directory
echo -e "${CYAN}Step 1: Saving local-only file contents...${NC}"
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
SAVED_COUNT=0

for f in "${CHANGED_FILES[@]}"; do
    BACKUP_PATH="$BACKUP_DIR/$f"
    mkdir -p "$(dirname "$BACKUP_PATH")"
    cp "$f" "$BACKUP_PATH"
    echo "   ✅ $f"
    SAVED_COUNT=$((SAVED_COUNT + 1))
done

for f in "${UNTRACKED_FILES[@]}"; do
    BACKUP_PATH="$BACKUP_DIR/$f"
    mkdir -p "$(dirname "$BACKUP_PATH")"
    cp "$f" "$BACKUP_PATH"
    echo "   ✅ $f (untracked)"
    SAVED_COUNT=$((SAVED_COUNT + 1))
done

echo -e "${GREEN}   Saved $SAVED_COUNT files to .local-only-backup/${NC}"
echo ""

# Step 3: Revert local-only files to main versions
echo -e "${CYAN}Step 2: Reverting local-only files to main versions...${NC}"
for f in "${CHANGED_FILES[@]}"; do
    if git checkout main -- "$f" 2>/dev/null; then
        echo "   ✅ $f"
    else
        # File is tracked on develop but not on main — delete it
        git rm -f "$f" 2>/dev/null && echo "   ✅ $f (removed, not on main)" || rm -f "$f" && echo "   ✅ $f (deleted, not on main)"
    fi
done

# Handle untracked files — delete them so they don't leak into the merge
for f in "${UNTRACKED_FILES[@]}"; do
    rm -f "$f"
    # Also remove empty parent directories
    rmdir "$(dirname "$f")" 2>/dev/null || true
    echo "   ✅ $f (deleted, not on main)"
done
echo ""

# Step 4: Show next steps
echo -e "${CYAN}Step 3: Commit the revert:${NC}"
echo "   git add -A"
echo "   git commit -m \"revert: prepare local-only files for production merge\""
echo ""
echo -e "${CYAN}Step 4: Merge to main:${NC}"
echo "   git checkout main"
echo "   git merge develop --no-edit"
echo "   git push origin main"
echo ""
echo -e "${CYAN}Step 5: Switch back to develop and restore local changes:${NC}"
echo "   git checkout develop"
echo "   git merge main --no-edit"
echo "   bash scripts/apply-local-only.sh"
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN} ✅ Ready to merge!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
