#!/bin/bash
# Run on the Docker host. See rahnavard-backup.cron for an uninstalled template.
set -euo pipefail
umask 077

PROJECT_DIR="${PROJECT_DIR:-/var/www/rahnavard}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/rahnavard}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
OFFSITE_HOST="${OFFSITE_HOST:-}"
OFFSITE_DIR="${OFFSITE_DIR:-}"
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$PROJECT_DIR" == /* && "$BACKUP_DIR" == /* && "$BACKUP_DIR" != / ]] || die 'Project/backup paths must be absolute; backup path cannot be /.'
[[ "$COMPOSE_FILE" == /* ]] || COMPOSE_FILE="$PROJECT_DIR/$COMPOSE_FILE"
[[ -f "$COMPOSE_FILE" && -f "$PROJECT_DIR/.env" ]] || die 'Compose file and project .env are required.'
# Remote paths enter an SSH shell: deliberately accept only a narrow alphabet.
if [[ -n "$OFFSITE_HOST$OFFSITE_DIR" ]]; then
    [[ "$OFFSITE_HOST" =~ ^([a-zA-Z0-9_][a-zA-Z0-9_.-]*@)?[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || die 'Invalid OFFSITE_HOST (expected [user@]hostname).'
    [[ "$OFFSITE_DIR" =~ ^/[a-zA-Z0-9_/-]+$ && "$OFFSITE_DIR" != / ]] || die 'OFFSITE_DIR must be an absolute non-root path using letters, digits, _, - and /.'
    command -v rsync >/dev/null || die 'rsync is required for offsite backup.'
    command -v ssh >/dev/null || die 'ssh is required for offsite backup.'
fi
command -v flock >/dev/null || die 'flock is required.'
mkdir -p -- "$BACKUP_DIR"
BACKUP_DIR=$(realpath -- "$BACKUP_DIR")
exec 9>"$BACKUP_DIR/.backup.lock"
flock -n 9 || die 'Backup or restore already running.'
compose() { docker compose --project-directory "$PROJECT_DIR" -f "$COMPOSE_FILE" "$@"; }

SET="rahnavard_$(date +%Y%m%d_%H%M%S)"
FINAL="$BACKUP_DIR/$SET"
[[ ! -e "$FINAL" ]] || die 'A set with this timestamp already exists.'
STAGE=$(mktemp -d "$BACKUP_DIR/.staging.XXXXXXXX")
trap 'if [[ -n "$STAGE" ]]; then rm -rf -- "$STAGE"; fi' EXIT
printf 'Creating %s (live backup; DB and media are not a cross-volume snapshot).\n' "$SET"
# Resolve credentials INSIDE the running postgres container, never source .env.
compose exec -T postgres sh -c 'exec pg_dump --clean --if-exists --no-owner --no-acl --username="${POSTGRES_USER:?}" --dbname="${POSTGRES_DB:?}"' | gzip > "$STAGE/db.sql.gz"
compose exec -T backend tar -czf - -C /app/media . > "$STAGE/media.tar.gz"
cp -- "$PROJECT_DIR/.env" "$STAGE/env.backup"
chmod 600 "$STAGE/env.backup"
gzip -t "$STAGE/db.sql.gz" "$STAGE/media.tar.gz"
tar -tzf "$STAGE/media.tar.gz" >/dev/null
printf 'rahnavard-backup-v1\n' > "$STAGE/COMPLETE"
(
    cd "$STAGE"
    sha256sum db.sql.gz media.tar.gz env.backup COMPLETE > manifest.sha256
    sha256sum -c manifest.sha256
)
# Staging and destination share a filesystem. Never merge into an existing set.
mv -T -- "$STAGE" "$FINAL"
STAGE=''
printf 'Local backup complete: %s\n' "$FINAL"

if [[ -n "$OFFSITE_HOST" ]]; then
    # Upload privately into a separate directory; publish only after checksums pass.
    REMOTE_STAGE="$OFFSITE_DIR/.$SET.partial"
    REMOTE_FINAL="$OFFSITE_DIR/$SET"
    SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
    ssh "${SSH_OPTS[@]}" "$OFFSITE_HOST" "umask 077; mkdir -p '$OFFSITE_DIR' && test ! -e '$REMOTE_FINAL' && mkdir '$REMOTE_STAGE'"
    rsync -a --chmod=D700,F600 -e 'ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15' -- "$FINAL/" "$OFFSITE_HOST:$REMOTE_STAGE/"
    ssh "${SSH_OPTS[@]}" "$OFFSITE_HOST" "cd '$REMOTE_STAGE' && sha256sum -c manifest.sha256 && mv -T '$REMOTE_STAGE' '$REMOTE_FINAL'"
    printf 'Offsite copy verified: %s:%s\n' "$OFFSITE_HOST" "$REMOTE_FINAL"
else
    printf 'LOCAL-ONLY: OFFSITE_HOST/OFFSITE_DIR are not configured.\n'
fi

# Retain 30 days, only our complete, intact sets. Offsite failure skips retention.
# Do not remove unrelated files, legacy backups, partial sets, or symlinks.
CUTOFF=$(( $(date +%s) - 30 * 86400 ))
for OLD in "$BACKUP_DIR"/rahnavard_*; do
    [[ -d "$OLD" && ! -L "$OLD" && "$OLD" != "$FINAL" ]] || continue
    [[ "${OLD##*/}" =~ ^rahnavard_[0-9]{8}_[0-9]{6}$ ]] || continue
    [[ $(stat -c %Y -- "$OLD") -lt "$CUTOFF" ]] || continue
    VALID=true
    for FILE in db.sql.gz media.tar.gz env.backup COMPLETE manifest.sha256; do
        [[ -f "$OLD/$FILE" && ! -L "$OLD/$FILE" ]] || VALID=false
    done
    [[ "$VALID" == true ]] || continue
    [[ $(<"$OLD/COMPLETE") == rahnavard-backup-v1 ]] || continue
    # Exact manifest comparison pins the filenames as well as their checksums.
    if (cd "$OLD" && [[ "$(sha256sum db.sql.gz media.tar.gz env.backup COMPLETE)" == "$(<manifest.sha256)" ]]); then
        rm -rf -- "$OLD"
        printf 'Expired complete set: %s\n' "${OLD##*/}"
    fi
done
