# ⚠️ SUPERSEDED — Historical Document

> **Do not rely on or follow this file.** It predates the senior refactor and
> describes the pre-refactor architecture — including the removed
> DRF-token/`localStorage` auth model and outdated endpoint paths.
>
> **Source of truth:** [`docs/SENIOR_REFACTOR_PLAN.md`](./docs/SENIOR_REFACTOR_PLAN.md)
> · Current status: [`README.md`](./README.md) · Workflow: [`DEVELOPMENT.md`](./DEVELOPMENT.md)

---

# Step-by-Step Deployment Roadmap

## STEP 1: Push to GitHub

```bash
cd C:\Users\msi\Downloads\ra
git add .
git commit -m "Production ready - all critical bugs fixed"
git push origin main
```

---

## STEP 2: Setup GitHub Secrets

Go to: https://github.com/sinahmd/rahnavard/settings/secrets/actions

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | Your Arvan server IP |
| `SERVER_USER` | `root` |
| `DEPLOY_SSH_KEY` | Your SSH private key |

---

## STEP 3: Setup Arvan Server (One-time)

```bash
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# Clone repo
mkdir -p /var/www/rahnavard
cd /var/www/rahnavard
git clone https://github.com/sinahmd/rahnavard.git .

# Create .env
cp .env.production .env
nano .env
```

Fill in .env with real values. Generate SECRET_KEY:
```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## STEP 4: Deploy

SSL is handled by Arvan Cloud (free Let's Encrypt, auto-renews). No server SSL setup needed.

```bash
cd /var/www/rahnavard
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The deploy script will:
1. Pull latest code
2. Build Docker images
3. Run migrations
4. Rolling restart (no downtime)
5. Health checks

---

## STEP 6: Create Admin User

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

---

## STEP 7: Add Content

Go to https://rahnavard.co/admin and add:
1. Site Settings (logo, phone, address)
2. Hero Slides (upload images)
3. Why Features (3 items)
4. Cars (with images)
5. Articles
6. Branches

---

## Future Deploys

Just push to main:
```bash
git push origin main
```

GitHub Actions handles the rest automatically.

---

## Troubleshooting

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Full rebuild
docker compose -f docker-compose.prod.yml up -d --build

# Check database
docker compose -f docker-compose.prod.yml exec postgres psql -U rahnavard_user -d rahnavard
```
