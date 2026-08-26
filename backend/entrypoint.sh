#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL..."

# Wait for postgres to be ready
while ! python -c "
import os, psycopg2
try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL', ''))
    conn.close()
    print('✅ PostgreSQL is ready')
except Exception as e:
    print(f'PostgreSQL not ready: {e}')
    exit(1)
" 2>/dev/null; do
    sleep 2
done

echo "🗄️  Running migrations..."
python manage.py migrate --noinput

echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# If a command is passed (e.g. "python manage.py migrate"), run it and exit
# Don't start Gunicorn — it's only needed for the long-running container
if [ "$#" -gt 0 ]; then
    exec "$@"
fi

echo "🚀 Starting Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
