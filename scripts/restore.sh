#!/bin/bash
# Restore only new-format, checksum-verified sets. Never source a saved .env.
set -euo pipefail
umask 077
PROJECT_DIR="${PROJECT_DIR:-/var/www/rahnavard}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/rahnavard}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$PROJECT_DIR" == /* && "$BACKUP_DIR" == /* && "$BACKUP_DIR" != / ]] || die 'Project/backup paths must be absolute; backup path cannot be /.'
[[ "$COMPOSE_FILE" == /* ]] || COMPOSE_FILE="$PROJECT_DIR/$COMPOSE_FILE"
[[ -f "$COMPOSE_FILE" && -d "$BACKUP_DIR" ]] || die 'Compose file or backup directory missing.'
command -v flock >/dev/null || die 'flock is required.'
command -v python3 >/dev/null || die 'python3 is required for archive safety validation.'
BACKUP_DIR=$(realpath -- "$BACKUP_DIR")
exec 9>"$BACKUP_DIR/.backup.lock"
flock -n 9 || die 'Backup or restore already running.'
compose() { docker compose --project-directory "$PROJECT_DIR" -f "$COMPOSE_FILE" "$@"; }
printf 'Available sets:\n'
for DIR in "$BACKUP_DIR"/rahnavard_*; do
    [[ -d "$DIR" && ! -L "$DIR" ]] && printf '  %s\n' "${DIR##*/}"
done
read -r -p 'Enter set name (rahnavard_YYYYMMDD_HHMMSS): ' SET
[[ "$SET" =~ ^rahnavard_[0-9]{8}_[0-9]{6}$ ]] || die 'Invalid set name.'
SOURCE="$BACKUP_DIR/$SET"
[[ -d "$SOURCE" && ! -L "$SOURCE" ]] || die 'Set not found or symlink refused.'
for FILE in db.sql.gz media.tar.gz env.backup COMPLETE manifest.sha256; do
    [[ -f "$SOURCE/$FILE" && ! -L "$SOURCE/$FILE" ]] || die "Missing or unsafe file: $FILE"
done
# Pin the exact manifest file list: no missing entries or arbitrary paths accepted.
(
    cd "$SOURCE"
    [[ "$(sha256sum db.sql.gz media.tar.gz env.backup COMPLETE)" == "$(<manifest.sha256)" ]] || die 'Manifest mismatch; NOTHING restored.'
    sha256sum -c manifest.sha256
)
[[ $(<"$SOURCE/COMPLETE") == rahnavard-backup-v1 ]] || die 'Unsupported backup format.'
gzip -t "$SOURCE/db.sql.gz" "$SOURCE/media.tar.gz"
tar -tzf "$SOURCE/media.tar.gz" >/dev/null
# Refuse traversal, links and device entries before touching any service or data.
python3 - "$SOURCE/media.tar.gz" <<'PY'
import pathlib
import sys
import tarfile
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    for member in archive:
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or not (member.isfile() or member.isdir()):
            sys.exit('Unsafe media archive member; NOTHING restored.')
PY
printf '\nWARNING: This replaces database objects in the dump and ALL media files.\n'
printf 'Saved env.backup is retained for MANUAL recovery; current .env is NOT overwritten.\n'
read -r -p 'Are you sure you want to continue? (yes/no): ' CONFIRM
[[ "$CONFIRM" == yes ]] || { printf 'Restore cancelled.\n'; exit 0; }
# Keep PostgreSQL and the actual named volumes; take application writers offline.
# On any failure, leave services stopped for operator recovery, not half-live.
trap 'printf "Restore failed; application services may be stopped. Inspect before restarting.\n" >&2' ERR
compose stop nginx frontend backend
compose up -d postgres
READY=false
for ((ATTEMPT=0; ATTEMPT<30; ATTEMPT++)); do
    if compose exec -T postgres sh -c 'pg_isready --username="${POSTGRES_USER:?}" --dbname="${POSTGRES_DB:?}"'; then
        READY=true
        break
    fi
    sleep 2
done
[[ "$READY" == true ]] || die 'PostgreSQL readiness timed out.'
gzip -dc "$SOURCE/db.sql.gz" | compose exec -T postgres sh -c 'exec psql -X --set=ON_ERROR_STOP=1 --single-transaction --username="${POSTGRES_USER:?}" --dbname="${POSTGRES_DB:?}"'
# A one-off backend container mounts the SAME media volume; bypass its entrypoint.
compose run --rm --no-deps -T --entrypoint sh backend -c 'set -eu; find /app/media -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; exec tar --no-same-owner -xzf - -C /app/media' < "$SOURCE/media.tar.gz"
compose up -d
printf 'Restore completed. Verify application health and data before reopening traffic.\n'
