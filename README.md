# Rahnavard Automotive (راهنورد خودرو)

A full-stack web application for Rahnavard Automotive, a car import company.

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling

### Backend
- **Django 4.2** with Django REST Framework
- **PostgreSQL 16** database
- **Gunicorn** WSGI server

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** reverse proxy (production)

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd rahnavard
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start the application:
```bash
docker compose up --build
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1/
- Django Admin: http://localhost:8000/admin/

5. Create a superuser for Django Admin:
```bash
docker compose exec backend python manage.py createsuperuser
```

6. Run migrations:
```bash
docker compose exec backend python manage.py migrate
```

### Local Development (without Docker)

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Project Structure

```
rahnavard/
├── frontend/                 # Next.js application
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── public/               # Static assets
│   └── ...
├── backend/                  # Django application
│   ├── apps/                 # Django apps
│   │   ├── core/             # Core functionality
│   │   ├── cars/             # Cars management
│   │   ├── articles/         # Articles management
│   │   ├── branches/         # Branches management
│   │   └── inquiries/        # Inquiry form
│   ├── config/               # Django settings
│   └── ...
├── nginx/                    # Nginx configuration
├── docker-compose.yml        # Development Docker Compose
├── docker-compose.prod.yml   # Production Docker Compose
└── ...
```

## API Endpoints

### Public API
- `GET /api/v1/cars/` - List active cars
- `GET /api/v1/cars/{slug}/` - Car detail
- `GET /api/v1/articles/` - List published articles
- `GET /api/v1/articles/{slug}/` - Article detail
- `GET /api/v1/branches/` - List active branches
- `POST /api/v1/inquiries/` - Submit inquiry form
- `GET /api/v1/settings/` - Public site settings

### Admin API
- `GET/POST /api/v1/admin/cars/` - Cars management
- `GET/PUT/DELETE /api/v1/admin/cars/{id}/` - Car detail management
- `GET/POST /api/v1/admin/articles/` - Articles management
- `GET/PUT/DELETE /api/v1/admin/articles/{id}/` - Article detail management
- `GET/POST /api/v1/admin/branches/` - Branches management
- `GET /api/v1/admin/inquiries/` - Inquiries list
- `PATCH /api/v1/admin/inquiries/{id}/` - Update inquiry status

## Frontend Routes

- `/` - Home page
- `/cars` - Cars listing
- `/cars/[slug]` - Car detail
- `/articles` - Articles listing
- `/articles/[slug]` - Article detail
- `/admin` - Custom admin dashboard (coming soon)

## SEO Features

- Dynamic metadata with `generateMetadata()`
- Automatic sitemap.xml generation
- robots.txt configuration
- Schema.org structured data
- Open Graph metadata
- Canonical URLs
- Persian/Farsi language support
- RTL layout

## Production Deployment

1. Update environment variables in `.env`:
```bash
DEBUG=0
SECRET_KEY=<strong-secret-key>
ALLOWED_HOSTS=rahnavard.co,www.rahnavard.co
DATABASE_URL=postgres://user:password@postgres:5432/rahnavard
```

2. Build and start production containers:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

3. Run migrations:
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

4. Create superuser:
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

5. Place SSL certificates in `nginx/ssl/`:
- `fullchain.pem`
- `privkey.pem`

## Environment Variables

### Frontend
- `NEXT_PUBLIC_SITE_URL` - Site URL (e.g., https://rahnavard.co)
- `NEXT_PUBLIC_API_URL` - API URL (e.g., http://backend:8000/api/v1)

### Backend
- `DEBUG` - Debug mode (0 or 1)
- `SECRET_KEY` - Django secret key
- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `DATABASE_URL` - PostgreSQL connection URL
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of CORS origins
- `CSRF_TRUSTED_ORIGINS` - Comma-separated list of CSRF trusted origins

## License

Proprietary - Rahnavard Automotive
