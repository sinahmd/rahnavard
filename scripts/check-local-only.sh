#!/bin/bash
# =============================================================================
# check-local-only.sh — Pre-merge validation
#
# Run this BEFORE merging develop to main (or before pushing a PR to main).
# It checks if any local-only files have been modified in the diff.
#
# Usage:
#   bash scripts/check-local-only.sh              # Check develop vs main
#   bash scripts/check-local-only.sh HEAD~3       # Check last 3 commits
#   bash scripts/check-local-only.sh main..develop # Check explicit range
#
# Exit codes:
#   0 = All clear, safe to merge
#   1 = Local-only files found in diff — DO NOT MERGE
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_ONLY_FILE="$REPO_ROOT/LOCAL_ONLY_FILES.txt"

# Determine the diff range
if [ -n "$1" ]; then
    DIFF_RANGE="$1"
else
    # Default: check develop vs main
    if git rev-parse --verify main >/dev/null 2>&1; then
        DIFF_RANGE="main..develop"
    else
        echo -e "${RED}ERROR: Cannot determine diff range.${NC}"
        echo "Usage: $0 [commit-range]"
        exit 1
    fi
fi

echo ""
echo "============================================="
echo " 🔍 Local-Only Files Check"
echo " Diff range: $DIFF_RANGE"
echo "============================================="
echo ""

# Check if LOCAL_ONLY_FILES.txt exists
if [ ! -f "$LOCAL_ONLY_FILE" ]; then
    echo -e "${RED}ERROR: $LOCAL_ONLY_FILES.txt not found!${NC}"
    echo "Create it with the list of local-only files."
    exit 1
fi

# Get list of local-only files (skip comments and empty lines)
LOCAL_ONLY_FILES=$(grep -v '^#' "$LOCAL_ONLY_FILE" | grep -v '^\s*$' | sed 's/^[[:space:]]*//')

if [ -z "$LOCAL_ONLY_FILES" ]; then
    echo -e "${YELLOW}WARNING: LOCAL_ONLY_FILES.txt is empty.${NC}"
    echo "No local-only files to check."
    exit 0
fi

# Get changed files in the diff
CHANGED_FILES=$(git diff --name-only "$DIFF_RANGE" 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${GREEN}✅ No files changed in this range.${NC}"
    exit 0
fi

# Check each local-only file
VIOLATIONS=()
SAFE_CHANGES=0

while IFS= read -r local_file; do
    [ -z "$local_file" ] && continue
    if echo "$CHANGED_FILES" | grep -qxF "$local_file"; then
        VIOLATIONS+=("$local_file")
    fi
done <<< "$LOCAL_ONLY_FILES"

# Count safe changes (files changed but not local-only)
TOTAL_CHANGED=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
SAFE_CHANGES=$((TOTAL_CHANGED - ${#VIOLATIONS[@]}))

echo "Changed files: $TOTAL_CHANGED"
echo "Safe to merge: $SAFE_CHANGES"
echo "Local-only violations: ${#VIOLATIONS[@]}"
echo ""

if [ ${#VIOLATIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CLEAR — No local-only files in this diff.${NC}"
    echo -e "${GREEN}   Safe to merge to main.${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ STOP — Local-only files detected in diff:${NC}"
    echo ""
    for v in "${VIOLATIONS[@]}"; do
        echo -e "   ${RED}✗ $v${NC}"
    done
    echo ""
    echo -e "${YELLOW}These files exist ONLY on develop for local Docker dev.${NC}"
    echo -e "${YELLOW}They must be REVERTED before merging to main.${NC}"
    echo ""
    echo "To fix:"
    echo "  1. Revert each file to its main version:"
    for v in "${VIOLATIONS[@]}"; do
        echo "     git checkout main -- $v"
    done
    echo "  2. Commit the revert"
    echo "  3. Merge to main"
    echo "  4. Re-apply local-only changes on develop"
    echo ""
    echo "Or run the full merge workflow:"
    echo "  See DEVELOPMENT.md Section 7: Full Merge Workflow"
    echo ""
    exit 1
fi
