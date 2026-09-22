# Rahnavard Automotive - Deployment Guide for Arvan Cloud

## Prerequisites

- Arvan Cloud server with Ubuntu 22.04+
- Domain `rahnavard.co` pointed to your server IP
- SSH access to the server
- GitHub repository with the code

## Step 1: Server Setup (One-time)

SSH into your Arvan Cloud server and run:

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/sinahmd/rahnavard/main/scripts/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

Or manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Create project directory
sudo mkdir -p /var/www/rahnavard
sudo chown -R $USER:$USER /var/www/rahnavard

# Clone repository
cd /var/www/rahnavard
git clone https://github.com/sinahmd/rahnavard.git .

# Copy and edit environment file
cp .env.production .env
nano .env  # Edit with your production values
```

## Step 2: Configure Environment Variables

Edit `/var/www/rahnavard/.env`:

```bash
# Django
DEBUG=0
SECRET_KEY=<generate-a-strong-random-key>
ALLOWED_HOSTS=rahnavard.co,www.rahnavard.co,backend
DATABASE_URL=postgres://rahnavard_user:<your-password>@postgres:5432/rahnavard
CORS_ALLOWED_ORIGINS=https://rahnavard.co,https://www.rahnavard.co
CSRF_TRUSTED_ORIGINS=https://rahnavard.co,https://www.rahnavard.co

# Next.js
NEXT_PUBLIC_SITE_URL=https://rahnavard.co
NEXT_PUBLIC_API_URL=https://rahnavard.co/api/v1

# PostgreSQL
POSTGRES_DB=rahnavard
POSTGRES_USER=rahnavard_user
POSTGRES_PASSWORD=<your-password>
```

Generate a secret key:
```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Step 3: Deploy the Application

SSL is handled by Arvan Cloud (free Let's Encrypt certificate that auto-renews). No server-side SSL setup needed.

```bash
cd /var/www/rahnavard

# Build and start services
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Create superuser for admin
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Collect static files
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## Step 4: Verify Deployment

```bash
# Check if services are running
docker compose -f docker-compose.prod.yml ps

# Check backend health
curl http://localhost:8000/api/v1/settings/

# Check frontend
curl http://localhost:3000

# Check nginx
curl http://localhost
```

Visit:
- Website: https://rahnavard.co
- Admin: https://rahnavard.co/admin

## GitHub Actions CI/CD Setup

### 1. Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `SERVER_HOST`: Your Arvan Cloud server IP
- `SERVER_USER`: SSH username (usually `root` or your user)
- `DEPLOY_SSH_KEY`: Your SSH private key

### 2. Generate SSH Key (if needed)

On your local machine:
```bash
ssh-keygen -t ed25519 -C "github-deploy"
```

Add the public key to your server:
```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server-ip
```

Add the private key content to GitHub secret `DEPLOY_SSH_KEY`.

### 3. Push to Deploy

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

The GitHub Action will automatically:
1. Lint and check the code
2. Build the application
3. Deploy to your Arvan Cloud server

## Manual Deployment

If you need to deploy manually:

```bash
# On your server
cd /var/www/rahnavard
./scripts/deploy.sh
```

## Backup and Restore

Both scripts run on the **Docker host**, not inside a container, and they share
one `flock` lock — a backup and a restore can never overlap.
`scripts/test_backup.py` exercises both against stubbed `docker`/`ssh`/`rsync`
on Linux, touching no real stack, remote host or user data.

Host requirements: `bash`, Docker Compose, `flock`, GNU coreutils/tar, `gzip`;
plus `python3` for restore's archive-safety check and `rsync`/`ssh` for offsite.
Backups contain the project `.env`, so keep the destination private (the script
sets `umask 077` and `0600` files).

| Variable | Default | Purpose |
|----------|---------|---------|
| `PROJECT_DIR` | `/var/www/rahnavard` | Repo root owning the compose file and `.env` |
| `BACKUP_DIR` | `/var/backups/rahnavard` | Destination; must be absolute and never `/` |
| `COMPOSE_FILE` | `docker-compose.prod.yml` | Relative paths resolve against `PROJECT_DIR` |
| `OFFSITE_HOST` | *(unset)* | `[user@]hostname` for the offsite copy |
| `OFFSITE_DIR` | *(unset)* | Absolute non-root remote path |

The offsite pair needs a key-based login (`BatchMode=yes`,
`StrictHostKeyChecking=yes`) and a trusted `known_hosts` entry on the host.

### Create Backup

```bash
cd /var/www/rahnavard
./scripts/backup.sh
```

What it does:

1. Takes the exclusive lock and stages into `$BACKUP_DIR/.staging.XXXXXXXX`.
2. Dumps the database by exec'ing `pg_dump` **inside the postgres container**
   (credentials are read there from `POSTGRES_USER`/`POSTGRES_DB`; the project
   `.env` is never sourced into the shell), then tars `/app/media` from the
   backend container.
3. Copies `.env` alongside as `env.backup`, then proves integrity: `gzip -t`,
   `tar -tzf`, and a `sha256sum` manifest of all four files which it verifies
   immediately.
4. Writes the `COMPLETE` marker (`rahnavard-backup-v1`) and renames the staging
   directory into place atomically — an interrupted run leaves a `.staging.*`
   directory behind, never a half-finished set.
5. With `OFFSITE_HOST`/`OFFSITE_DIR` set, uploads into a `.<set>.partial`
   directory and renames it only after `sha256sum -c` passes on the remote.
   Without both variables it prints an explicit `LOCAL-ONLY` line.
6. Retains 30 days: only sets named `rahnavard_YYYYMMDD_HHMMSS` that carry the
   versioned marker **and** whose manifest still verifies exactly are deleted.
   Legacy, partial, symlinked and unrelated files are never touched.

A backup is a directory, not an archive:

```
/var/backups/rahnavard/rahnavard_20260918_030000/
├── db.sql.gz        # pg_dump --clean --if-exists --no-owner --no-acl
├── media.tar.gz     # /app/media
├── env.backup       # the .env in effect at backup time
├── COMPLETE         # format marker (rahnavard-backup-v1)
└── manifest.sha256  # checksums of the four files above
```

The dump and the media tar are taken **live** and are not a cross-volume
snapshot (the script says so on stdout). Quiesce writes first if you need a
tighter point-in-time pair.

### Automate It

`scripts/rahnavard-backup.cron` is a **template — nothing installs it for you**.
It runs daily at 03:00 in the server timezone. Review the paths and user, make
sure cron mail / non-zero exits reach a mailbox someone reads, then install it
explicitly:

```bash
sudo cp /var/www/rahnavard/scripts/rahnavard-backup.cron /etc/cron.d/rahnavard-backup
sudo chown root:root /etc/cron.d/rahnavard-backup
sudo chmod 644 /etc/cron.d/rahnavard-backup
```

### Restore from Backup

```bash
cd /var/www/rahnavard
./scripts/restore.sh
```

The script lists the available sets, asks for the set name
(`rahnavard_YYYYMMDD_HHMMSS`), verifies the manifest and format marker, then
requires a literal `yes` before touching anything.

A restore **replaces database objects from the dump and every file in the media
volume**. It refuses symlinks, a missing or extra manifest entry, an unknown
format, and any media archive containing absolute paths, `..`, or entries that
are not files/directories. It then stops `nginx`/`frontend`/`backend`, waits for
`pg_isready`, loads the dump with `psql --single-transaction
--set=ON_ERROR_STOP=1`, extracts media into the same volume, and brings the
stack back up. On failure the application services are left **stopped** for
manual recovery rather than half-live.

`env.backup` is retained for **manual** recovery — the current `.env` is never
overwritten. Verify health and data before reopening traffic, and redeploy the
images that match the restored database.

> Restores only accept the versioned `rahnavard-backup-v1` layout. Sets written
> by the pre-2026-09 `backup.sh` (a bare `db.sql.gz` + `media.tar.gz` with no
> manifest) are not recognized — restore those by hand.

## Monitoring

### Sentry error reporting

Create a Django project and a Next.js project in Sentry. On the server, set
`SENTRY_BACKEND_DSN` to the Django DSN and both `SENTRY_FRONTEND_DSN` and
`NEXT_PUBLIC_SENTRY_DSN` to the Next.js DSN in the root `.env` file. Leave these
empty to disable reporting. Set `SENTRY_ENVIRONMENT=production`.

Deploy normally through the develop-to-main PR process. The deployment script
exports the checked-out git SHA as `SENTRY_RELEASE`; production Compose passes
it to both servers and embeds it into the browser bundle. Browser DSN/release
changes require an image rebuild, not just a restart. For manual Compose builds,
export `SENTRY_RELEASE=$(git rev-parse HEAD)` before building and starting services.
`quick-deploy.sh --no-build` cannot update the already embedded browser release.

Browser reporting uses the SDK's same-origin `/monitoring-tunnel`, preserving
`connect-src 'self'`. This built-in tunnel supports Sentry-hosted ingest DSNs;
self-hosted Sentry needs a separately reviewed transport configuration. No source
maps are uploaded and no Sentry auth token is needed or baked into images.
Request data, user context, breadcrumbs, extra context and stack-frame locals
are excluded; do not include personal data in exception messages or custom tags.
Tracing, profiling and session replay are not enabled.

After activation, verify synthetic browser, Next.js server and Django errors in
the intended projects, check their release SHA and inspect the payload for PII.
Do not add a public crash endpoint. Local tests intercept delivery and are not
proof that the external Sentry projects receive events.

### External uptime alerts

In UptimeRobot, create an HTTPS monitor for
`https://rahnavard.co/api/v1/settings/`, with a five-minute interval and the
owner's verified email alert contact. Confirm a successful check and delivery
of a test notification without deliberately taking production offline.
A settings-endpoint monitor checks the API; it does not establish frontend
rendering health. Account setup and live notification verification are manual
activation steps, not completed by deployment of the code.

There is no alerting on backup completion: a failed cron run is visible only
through its mail / non-zero exit, which is why that output must be routed to a
monitored mailbox when installing the cron template (see Backup and Restore).

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build
```

### Database issues
```bash
# Access database
docker compose -f docker-compose.prod.yml exec postgres psql -U rahnavard_user -d rahnavard

# Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### SSL issues

SSL terminates at the Arvan Cloud edge — there is no certbot/Let's
Encrypt on the server. If HTTPS is broken, check the Arvan console
(certificate status, origin settings) and that the origin still serves
plain HTTP on port 80.

## Admin Dashboard

After deployment, access the admin dashboard:

1. Go to https://rahnavard.co/admin
2. Login with your superuser credentials
3. You can manage:
   - Site settings (logo, contact info, section titles)
   - Hero slides
   - Cars (add, edit, delete, feature)
   - Articles (add, edit, publish)
   - Branches
   - Inquiries
   - Why features

## Content Management

All content is now manageable from the admin dashboard:

1. **Site Settings**: Logo, phone, address, section titles, footer text
2. **Hero Slides**: Upload images, set alt text, reorder
3. **Cars**: Full CRUD with images, SEO fields
4. **Articles**: Full CRUD with rich content, publishing workflow
5. **Branches**: Add/edit branches with map links
6. **Inquiries**: View and manage customer inquiries

## Support

For issues or questions:
- Check the logs: `docker compose -f docker-compose.prod.yml logs`
- Review this documentation
- Check GitHub Issues
