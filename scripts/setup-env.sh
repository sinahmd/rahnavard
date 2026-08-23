#!/bin/bash
# Production .env setup script for Arvan Cloud server
# Run from /var/www/rahnavard on the server
set -e

if [ -f .env ]; then
  echo "⚠️  .env already exists! Skipping."
  echo "   To recreate: rm .env && bash scripts/setup-env.sh"
  exit 0
fi

echo "🔧 Generating production environment..."

# Generate secure values
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
DB_PASS=$(openssl rand -base64 24 | tr -d '=+/' | head -c 32)

cat > .env << EOF
# === PostgreSQL ===
POSTGRES_DB=rahnavard
POSTGRES_USER=rahnavard_user
POSTGRES_PASSWORD=${DB_PASS}

# === Django Backend ===
DEBUG=0
SECRET_KEY=${SECRET_KEY}
ALLOWED_HOSTS=rahnavard.co,www.rahnavard.co,backend
DATABASE_URL=postgres://rahnavard_user:${DB_PASS}@postgres:5432/rahnavard
CORS_ALLOWED_ORIGINS=https://rahnavard.co,https://www.rahnavard.co
CSRF_TRUSTED_ORIGINS=https://rahnavard.co,https://www.rahnavard.co

# === Next.js Frontend ===
NEXT_PUBLIC_SITE_URL=https://rahnavard.co
NEXT_PUBLIC_API_URL=/api/v1
EOF

chmod 600 .env

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Save these values somewhere safe:"
echo "   Database Password: ${DB_PASS}"
echo "   Secret Key: ${SECRET_KEY}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
