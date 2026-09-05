#!/bin/bash
# =============================================================================
# scan-secrets.sh — CI secret-scan guard (tracked files only)
#
# Scans files that git actually tracks (git grep — never ignored local files)
# for common secret formats. Prints ONLY matching file paths + the rule that
# matched — never the matched content — and exits 1 if anything is found.
#
# Purpose-built to avoid false positives:
#   - runs on tracked files only via `git grep` (never on ignored local files),
#   - matches secret *formats* (private-key headers, token prefixes, high-
#     entropy assignment values), not the mere presence of a variable NAME
#     (docs legitimately mention SECRET_KEY, API_KEY, etc.),
#   - `.env.example` files are allowed by the path guard below (only a bare
#     `.env` / `.env.*` without `.example` is flagged).
#
# Usage:
#   bash scripts/scan-secrets.sh      # exit 0 = clean, 1 = secrets found
# =============================================================================

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

FOUND=0

# report <file> <rule> — print a path + rule, never content
report() {
    echo "  ❌ $1  (rule: $2)"
    FOUND=1
}

# git grep over tracked files; -I skips binary files. Only file names printed.
scan_tracked() {
    local rule="$1"
    local pattern="$2"
    local hits
    # -l = list files only, -I = ignore binary, -E = extended regex
    hits=$(git grep -lIE -- "$pattern" 2>/dev/null)
    if [ -n "$hits" ]; then
        while IFS= read -r f; do
            [ -z "$f" ] && continue
            report "$f" "$rule"
        done <<< "$hits"
    fi
}

# Rule 1: private key headers (PEM / OpenSSH / PKCS) — format check only.
scan_tracked "private-key-header" '-----BEGIN [A-Z ]*PRIVATE KEY-----'

# Rule 2: known credential/token prefixes (high-signal formats).
scan_tracked "credential-prefix: aws-access-key" 'AKIA[0-9A-Z]{16}'
scan_tracked "credential-prefix: github-token" 'gh[pousr]_[A-Za-z0-9]{30,}'
scan_tracked "credential-prefix: github-fine-grained-pat" 'github_pat_[A-Za-z0-9_]{20,}'
scan_tracked "credential-prefix: slack-token" 'xox[baprs]-[A-Za-z0-9-]{10,}'
scan_tracked "credential-prefix: stripe-live-key" 'sk_live_[0-9a-zA-Z]{16,}'
scan_tracked "credential-prefix: openai-key" 'sk-[A-Za-z0-9]{20,}'
scan_tracked "credential-prefix: google-api-key" 'AIza[0-9A-Za-z_-]{35}'

# Rule 3: assignment of a long high-entropy value to a known secret key name.
# The 32+ char value must LOOK random — real secret material is mixed-case
# and/or contains digits/symbols. All-lowercase dashed placeholders
# (dev-secret-key-change-in-production) and documented examples are ignored.
ASSIGNMENT_RE='(SECRET_KEY|DJANGO_SECRET_KEY|POSTGRES_PASSWORD|DB_PASSWORD|API_KEY|ACCESS_TOKEN|AUTH_TOKEN)[[:space:]]*[=:][[:space:]]*[[:punct:]]?[A-Za-z0-9+/_=.-]{32,}'
# A placeholder value is all lowercase/digits with dashes and NO uppercase,
# e.g. dev-secret-key-change-in-production or test-secret-key-for-ci-123.
PLACEHOLDER_VALUE_RE='^[a-z0-9-]{32,}$'
# Real random value has at least one uppercase letter AND one digit/symbol.
ENTROPY_RE='[A-Z].*[0-9+/_=.-]|[0-9+/_=.-].*[A-Z]'
hits=$(git grep -lIE -- "$ASSIGNMENT_RE" 2>/dev/null)
if [ -n "$hits" ]; then
    while IFS= read -r f; do
        [ -z "$f" ] && continue
        case "$f" in
            *.env.example|*example*) continue ;;
        esac
        # Analyse the matched value in memory only — never print it.
        matched=$(git grep -ohIE -- "$ASSIGNMENT_RE" -- "$f" 2>/dev/null | head -1)
        # Extract everything after the last = or :
        value=$(printf '%s' "$matched" | sed -E 's/.*[=:][[:space:]]*//; s/^[[:punct:]]//')
        if printf '%s' "$value" | grep -qE "$PLACEHOLDER_VALUE_RE"; then
            continue  # dev/test placeholder, not a real secret
        fi
        if ! printf '%s' "$value" | grep -qE "$ENTROPY_RE"; then
            continue  # no mixed-case/digit evidence → example, not a secret
        fi
        report "$f" "secret-assignment"
    done <<< "$hits"
fi

# Rule 4: forbidden tracked file *names* (bare env files, key stores).
# A bare `.env` / `.env.local` must never be tracked; `.env.example` is fine.
while IFS= read -r f; do
    [ -z "$f" ] && continue
    if echo "$f" | grep -qE '(^|/)(\.env|\.env\.[^.]*|\.env\.local|\.pem|\.key|\.p12|\.pfx|id_[re]sa)$'; then
        # allow the documented .env.example files
        case "$f" in
            *.env.example) continue ;;
        esac
        report "$f" "forbidden-filename"
    fi
done < <(git ls-files)

if [ "$FOUND" -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Secret scan FAILED — see the file paths above (contents intentionally not printed).${NC}"
    echo "   Remove the secret and rotate it if it was ever exposed. Do not commit real credentials."
    exit 1
fi

echo -e "${GREEN}✅ Secret scan passed — no tracked file matches a known secret format.${NC}"
exit 0
