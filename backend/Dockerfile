FROM python:3.14-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies.
# The DEV image installs requirements-dev.txt (pytest etc.) so Docker is the
# supported test environment. Production uses Dockerfile.prod, which stays on
# requirements.txt only — dev/test dependencies never ship to production.
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

# Copy project files
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Expose port
EXPOSE 8000

# Run the application
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
