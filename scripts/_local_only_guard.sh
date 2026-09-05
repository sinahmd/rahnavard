#!/bin/bash
# =============================================================================
# _local_only_guard.sh — shared protected-file guard for the local-only scripts
#
# Sourced by prepare-merge.sh, apply-local-only.sh and check-local-only.sh.
# AUTH-CRITICAL / production-path files must never be treated as "local-only":
# reverting them before a develop → main merge would silently drop security
# config (settings.py carries the Phase-2 session-auth + CSRF settings).
# =============================================================================

# Files that must NEVER appear in LOCAL_ONLY_FILES.txt (or in a backup meant
# to be re-applied over them). When any listed path is found, the calling
# script aborts with a non-zero exit before doing anything destructive.
#
# Pattern syntax: extended regex matched against each local-only file path.
PROTECTED_PATTERNS=(
    '^backend/config/settings\.py$'   # auth-critical Django settings
    '^docker-compose\.prod\.yml$'     # production compose must not be local-only
    '^nginx/nginx\.conf$'             # production nginx (CSP, routing)
    '^frontend/Dockerfile\.prod$'     # production frontend image
    '^backend/Dockerfile\.prod$'      # production backend image
    '^backend/entrypoint\.sh$'        # production backend entrypoint (migrate)
    '^\.github/workflows/'            # CI/CD definitions
)

# Check a newline-delimited list of file paths (stdin) against the guard.
# Exits 1 (and prints the offending path) if any protected path is listed.
check_protected_paths() {
    local line
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        case "$line" in \#*) continue ;; esac
        for pat in "${PROTECTED_PATTERNS[@]}"; do
            if echo "$line" | grep -qE "$pat"; then
                echo "❌ ERROR: '$line' is a protected production file and must NOT be local-only." >&2
                echo "   It carries auth-critical config (or is part of the production deploy path)." >&2
                echo "   Remove it from LOCAL_ONLY_FILES.txt — do not work around this guard." >&2
                exit 1
            fi
        done
    done
}

# Guard the actual LOCAL_ONLY_FILES.txt file on disk.
guard_local_only_file() {
    if [ ! -f "$LOCAL_ONLY_FILE" ]; then
        return 0
    fi
    check_protected_paths < <(grep -v '^#' "$LOCAL_ONLY_FILE" | grep -v '^[[:space:]]*$' | sed 's/^[[:space:]]*//')
}
