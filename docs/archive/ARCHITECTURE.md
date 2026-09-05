# ⚠️ SUPERSEDED — Historical Document

> **Do not rely on or follow this file.** It predates the senior refactor and
> describes the pre-refactor architecture — including the removed
> DRF-token/`localStorage` auth model and outdated endpoint paths.
>
> **Source of truth:** [`docs/SENIOR_REFACTOR_PLAN.md`](./docs/SENIOR_REFACTOR_PLAN.md)
> · Current status: [`README.md`](./README.md) · Workflow: [`DEVELOPMENT.md`](./DEVELOPMENT.md)

---

# Rahnavard Automotive — Architecture & Implementation Plan

## 1. Existing Design Analysis

### 1.1 Design Tokens (Extracted from index.html)

```css
:root {
  --bg: #fefcf5;
  --white: #ffffff;
  --dark: #1c1c1c;
  --gray: #6b6b68;
  --gray-light: #e9e6db;
  --accent: #FFCC04;
  --accent-dark: #e0b400;
  --radius: 14px;
  --shadow: 0 12px 32px rgba(28, 28, 28, 0.151);
  --shadow-sm: 0 4px 14px rgba(28, 28, 28, 0.095);
  --container: 1180px;
}
```

### 1.2 Typography

- **Primary Font**: Vazirmatn (Persian/Farsi) - Weights: 400, 500, 600, 700, 800, 900
- **Secondary Font**: Poppins (Latin) - Weights: 500, 600, 700, 800
- **Line Height**: 1.7 (body)

### 1.3 Sections Structure

1. **Header** (position: absolute, becomes fixed on scroll)
   - Logo (white, inverts on scroll)
   - Navigation (centered, white text)
   - Mobile hamburger menu
   - Scroll behavior: background changes, colors invert

2. **Hero Slider**
   - Aspect ratio: 1540/860 (desktop), 4/5 (mobile)
   - Max height: 100vh
   - 3 slides with fade transition (900ms)
   - Zoom-out animation (6000ms)
   - Navigation arrows (left/right)
   - Dots indicator
   - Autoplay: 6000ms interval
   - Gradient overlay

3. **Why Rahnavard Section**
   - Full viewport height (min-height: 100vh)
   - Decorative SVG background (ccchaos.svg)
   - 3 feature cards with staggered reveal animations
   - Centered content layout

4. **Cars Section**
   - 3-column grid (2 on tablet, 1 on mobile)
   - Car cards with:
     - Image container (4/3 aspect ratio)
     - Brand name (Poppins, uppercase)
     - Model name (Poppins, LTR)
     - CTA button
   - Hover effects: shadow, translateY, image scale

5. **Articles Section**
   - 3-column grid (1 on tablet/mobile)
   - Article cards with:
     - Thumbnail (160px height, gradient background)
     - Date (Persian format)
     - Title
     - Excerpt
     - Read more link with arrow

6. **Branches Section**
   - 2-column grid (1 on mobile)
   - Branch cards with:
     - Location icon
     - Branch name
     - Address
     - Phone number (LTR)
     - Map image/link

7. **Consultation Form**
   - Centered layout (max-width: 760px)
   - Fields: name, phone, subject, message
   - 2-column grid for name/phone (1 on mobile)
   - Success message (hidden by default)

8. **Footer**
   - 3-column grid (1 on mobile)
   - Logo, description
   - Quick links
   - Contact information
   - Copyright bar

### 1.4 Animations

- **Scroll Reveal**: fade-up, slide-left, slide-right, scale
- **Staggered delays**: 0ms, 100ms, 150ms, 200ms, 300ms, 400ms
- **Hero zoom**: scale(1.037) → scale(1) over 6000ms
- **Card hover**: translateY(-4px), shadow increase
- **Image hover**: scale(1.08) translateY(-6px)
- **Reduced motion**: All animations disabled

### 1.5 Responsive Breakpoints

- **Tablet**: max-width 900px
- **Mobile**: max-width 720px

### 1.6 Assets

- `logo.png` - Company logo
- `slider1.jpg`, `slider2.jpg`, `slider3.jpg`, `slider4.jpg` - Hero slides
- `car1-elantra.png`, `car2-k4.png`, `car3-corolla-cross.png`, `car4-corolla.png`, `car5-rav4.png` - Car images
- `location.jpg` - Branch map
- `ccchaos.svg` - Decorative background
- `sssplatter.svg` - Feature bullet icon

---

## 2. SEO Architecture (SEO-First Design)

### 2.1 URL Structure

```
/                           → Home page
/cars                       → Cars listing
/cars/[slug]                → Car detail
/articles                   → Articles listing
/articles/[slug]            → Article detail
/about                      → About page
/contact                    → Contact page
/admin                      → Admin dashboard
/admin/cars                 → Cars management
/admin/cars/new             → New car
/admin/cars/[id]/edit       → Edit car
/admin/articles             → Articles management
/admin/articles/new         → New article
/admin/articles/[id]/edit   → Edit article
/admin/branches             → Branches management
/admin/inquiries            → Inquiries management
```

### 2.2 Slug Strategy

**Persian to Latin Transliteration:**
```
تویوتا راو۴ هیبرید → toyota-rav4-hybrid
هیوندای النترا → hyundai-elantra
راهنمای خرید خودروی هیبریدی → hybrid-car-buying-guide
```

**Slug Rules:**
- Unique across entity type
- Indexed in database
- URL-safe (lowercase, hyphens)
- Immutable by default
- Manual override allowed
- Auto-generated from title/name

### 2.3 Redirect Strategy

**Model: Redirect**
```python
class Redirect(models.Model):
    old_path = models.CharField(max_length=500, unique=True, db_index=True)
    new_path = models.CharField(max_length=500)
    status_code = models.IntegerField(default=301)  # 301 or 302
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**Behavior:**
- When slug changes, create redirect from old → new
- Prevent redirect loops (old_path ≠ new_path)
- Preserve historical URLs
- Check redirects before 404

### 2.4 Metadata Architecture

**Fallback Chain:**
```
SEO Title:
  → custom seo_title
  → generated title (e.g., "{brand} {model} | راهنورد خودرو")
  → default site title

Meta Description:
  → custom seo_description
  → excerpt / short_description
  → generated fallback
```

**Fields per entity:**
```python
seo_title = models.CharField(max_length=200, blank=True)
seo_description = models.TextField(blank=True)
og_title = models.CharField(max_length=200, blank=True)
og_description = models.TextField(blank=True)
og_image = models.ImageField(upload_to='og/', blank=True)
canonical_url = models.URLField(blank=True)
```

### 2.5 Canonical URLs

- Static pages: `https://rahnavard.co/cars`
- Dynamic pages: `https://rahnavard.co/cars/{slug}`
- Centralized SEO utility for URL generation
- Never hardcode in components

### 2.6 Sitemap Strategy

**Dynamic sitemap.xml includes:**
- `/` (home)
- `/cars` (listing)
- `/cars/{slug}` (each active car)
- `/articles` (listing)
- `/articles/{slug}` (each published article)
- `/about`
- `/contact`

**Excludes:**
- Inactive/unpublished cars
- Draft articles
- Admin pages
- Private pages

### 2.7 Robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://rahnavard.co/sitemap.xml
```

### 2.8 Structured Data (Schema.org)

**Home Page:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "راهنورد خودرو",
  "url": "https://rahnavard.co",
  "logo": "https://rahnavard.co/images/branding/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+98-911-210-0800",
    "contactType": "customer service"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "ساری",
    "addressRegion": "مازندران",
    "addressCountry": "IR"
  }
}
```

**Car Detail:**
```json
{
  "@context": "https://schema.org",
  "@type": "Car",
  "name": "تویوتا RAV4 هیبرید",
  "brand": {
    "@type": "Brand",
    "name": "Toyota"
  },
  "model": "RAV4 Hybrid",
  "image": "https://rahnavard.co/images/cars/toyota-rav4-hybrid.webp",
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock"
  }
}
```

**Article:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "راهنمای خرید خودروی هیبریدی",
  "image": "https://rahnavard.co/images/articles/hybrid-car-buying-guide.webp",
  "datePublished": "2025-08-03",
  "author": {
    "@type": "Organization",
    "name": "راهنورد خودرو"
  }
}
```

---

## 3. Database Models

### 3.1 Car Model

```python
class Car(models.Model):
    # Core fields
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, db_index=True, allow_unicode=True)
    description = models.TextField(blank=True)
    year = models.IntegerField()
    fuel_type = models.CharField(max_length=50)  # gasoline, hybrid, electric
    transmission = models.CharField(max_length=50)  # automatic, manual
    engine = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=15, decimal_places=0, null=True, blank=True)
    
    # Images
    main_image = models.ImageField(upload_to='cars/')
    gallery = models.JSONField(default=list)  # Array of image paths
    
    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    
    # SEO
    seo_title = models.CharField(max_length=200, blank=True)
    seo_description = models.TextField(blank=True)
    og_image = models.ImageField(upload_to='og/cars/', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', '-created_at']
```

### 3.2 Article Model

```python
class Article(models.Model):
    title = models.CharField(max_length=300)
    slug = models.SlugField(unique=True, db_index=True, allow_unicode=True)
    excerpt = models.TextField(blank=True)
    content = models.TextField()  # Rich text / Markdown
    cover_image = models.ImageField(upload_to='articles/')
    
    # Status
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    
    # SEO
    seo_title = models.CharField(max_length=200, blank=True)
    seo_description = models.TextField(blank=True)
    og_image = models.ImageField(upload_to='og/articles/', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-published_at']
```

### 3.3 Branch Model

```python
class Branch(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    map_url = models.URLField()
    map_image = models.ImageField(upload_to='branches/')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['display_order']
```

### 3.4 Inquiry Model

```python
class Inquiry(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    subject = models.CharField(max_length=300, blank=True)
    message = models.TextField(blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    is_contacted = models.BooleanField(default=False)
    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Inquiries'
```

### 3.5 Redirect Model

```python
class Redirect(models.Model):
    old_path = models.CharField(max_length=500, unique=True, db_index=True)
    new_path = models.CharField(max_length=500)
    status_code = models.IntegerField(default=301)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Redirects'
```

### 3.6 SiteSettings Model (Singleton)

```python
class SiteSettings(models.Model):
    site_name = models.CharField(max_length=200, default='راهنورد خودرو')
    site_description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='branding/')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    
    # Social
    instagram = models.URLField(blank=True)
    telegram = models.URLField(blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    
    # SEO defaults
    default_seo_title = models.CharField(max_length=200, blank=True)
    default_seo_description = models.TextField(blank=True)
    default_og_image = models.ImageField(upload_to='og/', blank=True)
    
    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
```

---

## 4. API Endpoints

### 4.1 Public API (v1)

```
GET  /api/v1/cars/                    → List active cars (featured on home)
GET  /api/v1/cars/{slug}/             → Car detail
GET  /api/v1/articles/                → List published articles
GET  /api/v1/articles/{slug}/         → Article detail
GET  /api/v1/branches/                → List active branches
POST /api/v1/inquiries/               → Submit inquiry form
GET  /api/v1/settings/                → Public site settings
```

### 4.2 Admin API (v1)

```
GET    /api/v1/admin/cars/            → List all cars
POST   /api/v1/admin/cars/            → Create car
GET    /api/v1/admin/cars/{id}/       → Car detail
PUT    /api/v1/admin/cars/{id}/       → Update car
DELETE /api/v1/admin/cars/{id}/       → Delete car

GET    /api/v1/admin/articles/        → List all articles
POST   /api/v1/admin/articles/        → Create article
GET    /api/v1/admin/articles/{id}/   → Article detail
PUT    /api/v1/admin/articles/{id}/   → Update article
DELETE /api/v1/admin/articles/{id}/   → Delete article

GET    /api/v1/admin/branches/        → List branches
POST   /api/v1/admin/branches/        → Create branch
PUT    /api/v1/admin/branches/{id}/   → Update branch
DELETE /api/v1/admin/branches/{id}/   → Delete branch

GET    /api/v1/admin/inquiries/       → List inquiries
PATCH  /api/v1/admin/inquiries/{id}/  → Update inquiry status

GET    /api/v1/admin/redirects/       → List redirects
POST   /api/v1/admin/redirects/       → Create redirect
DELETE /api/v1/admin/redirects/{id}/  → Delete redirect

GET    /api/v1/admin/settings/        → Get site settings
PUT    /api/v1/admin/settings/        → Update site settings

GET    /api/v1/admin/dashboard/       → Dashboard stats
```

---

## 5. Frontend Architecture

### 5.1 Next.js App Router Structure

```
app/
├── layout.tsx                    → Root layout (RTL, fonts, metadata)
├── page.tsx                      → Home page (Server Component)
├── cars/
│   ├── page.tsx                  → Cars listing (Server Component)
│   └── [slug]/
│       └── page.tsx              → Car detail (Server Component)
├── articles/
│   ├── page.tsx                  → Articles listing (Server Component)
│   └── [slug]/
│       └── page.tsx              → Article detail (Server Component)
├── about/
│   └── page.tsx                  → About page (Server Component)
├── contact/
│   └── page.tsx                  → Contact page (Server Component)
├── admin/
│   ├── layout.tsx                → Admin layout (Client Component)
│   ├── page.tsx                  → Dashboard
│   ├── cars/
│   │   ├── page.tsx              → Cars list
│   │   ├── new/
│   │   │   └── page.tsx          → New car form
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx      → Edit car form
│   ├── articles/
│   │   ├── page.tsx              → Articles list
│   │   ├── new/
│   │   │   └── page.tsx          → New article form
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx      → Edit article form
│   ├── branches/
│   │   └── page.tsx              → Branches management
│   ├── inquiries/
│   │   └── page.tsx              → Inquiries management
│   └── settings/
│       └── page.tsx              → Site settings
├── sitemap.ts                    → Dynamic sitemap
├── robots.ts                     → Robots.txt
└── not-found.tsx                 → 404 page
```

### 5.2 Components Structure

```
components/
├── layout/
│   ├── Header.tsx                → Header with scroll behavior (Client)
│   ├── DesktopNav.tsx            → Desktop navigation (Server)
│   ├── MobileNav.tsx             → Mobile navigation (Client)
│   └── Footer.tsx                → Footer (Server)
├── home/
│   ├── HeroSlider.tsx            → Hero slider (Client)
│   ├── WhyRahnavard.tsx          → Why section (Server + Client for animations)
│   ├── FeaturedCars.tsx          → Featured cars (Server)
│   ├── LatestArticles.tsx        → Latest articles (Server)
│   ├── Branches.tsx              → Branches section (Server)
│   └── ConsultationForm.tsx      → Form (Client)
├── cars/
│   ├── CarCard.tsx               → Car card (Server)
│   ├── CarGrid.tsx               → Cars grid (Server)
│   └── CarDetail.tsx             → Car detail (Server)
├── articles/
│   ├── ArticleCard.tsx           → Article card (Server)
│   ├── ArticleGrid.tsx           → Articles grid (Server)
│   └── ArticleContent.tsx        → Article content (Server)
├── ui/
│   ├── Button.tsx                → Button component
│   ├── Input.tsx                 → Form input
│   ├── Textarea.tsx              → Form textarea
│   └── LoadingSpinner.tsx        → Loading indicator
├── seo/
│   ├── JsonLd.tsx                → Structured data component
│   └── Breadcrumbs.tsx           → Breadcrumbs component
└── admin/
    ├── AdminSidebar.tsx          → Admin sidebar (Client)
    ├── AdminHeader.tsx           → Admin header (Client)
    ├── DashboardStats.tsx        → Dashboard statistics
    ├── CarForm.tsx               → Car create/edit form
    ├── ArticleForm.tsx           → Article create/edit form
    ├── SeoPreview.tsx            → Google search preview
    └── ImageUpload.tsx           → Image upload component
```

### 5.3 Server vs Client Components

**Server Components (default):**
- All page components
- Layout components (except admin)
- Header (scroll behavior handled via CSS or minimal client)
- Footer
- Car cards, article cards
- Static content sections

**Client Components ("use client"):**
- HeroSlider (state, autoplay, interactions)
- MobileNav (toggle state)
- ConsultationForm (form state, submission)
- Admin layout and all admin components
- Scroll reveal animations (IntersectionObserver)
- Any component using useState, useEffect, event handlers

### 5.4 Rendering Strategy

| Route | Strategy | Reason |
|-------|----------|--------|
| `/` | SSR | SEO-critical, dynamic content from API |
| `/cars` | SSR | SEO listing page |
| `/cars/[slug]` | SSG + ISR | Static generation with revalidation |
| `/articles` | SSR | SEO listing page |
| `/articles/[slug]` | SSG + ISR | Static generation with revalidation |
| `/about` | SSG | Mostly static |
| `/contact` | SSG | Mostly static |
| `/admin/*` | CSR | Not SEO-critical, dynamic |

---

## 6. Image Architecture

### 6.1 Directory Structure

```
public/images/
├── branding/
│   ├── logo.png
│   └── logo-white.png
├── hero/
│   ├── slide-1.webp
│   ├── slide-2.webp
│   └── slide-3.webp
├── cars/
│   ├── hyundai-elantra.webp
│   ├── kia-k4.webp
│   ├── toyota-rav4-hybrid.webp
│   ├── toyota-corolla-cross-hybrid.webp
│   └── toyota-corolla-hybrid.webp
├── articles/
│   └── (dynamically uploaded)
├── branches/
│   └── sari-location.webp
└── decorative/
    ├── ccchaos.svg
    └── sssplatter.svg
```

### 6.2 Image Optimization Rules

- Convert all JPG/PNG to WebP (quality: 80-85 for photos, lossless for graphics)
- Use `next/image` for all images
- Define explicit width/height to prevent CLS
- Hero images: `priority` for first slide, lazy load others
- Car images: lazy load, responsive sizes
- Branch maps: lazy load
- Meaningful alt text from database

### 6.3 Next/Image Configuration

```tsx
<Image
  src="/images/cars/toyota-rav4-hybrid.webp"
  alt="تویوتا RAV4 هیبرید - راهنورد خودرو"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  loading="lazy"
/>
```

---

## 7. Docker Architecture

### 7.1 Services

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
      - NEXT_PUBLIC_SITE_URL=http://localhost:3000

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres]
    environment:
      - DEBUG=1
      - DATABASE_URL=postgres://user:pass@postgres:5432/rahnavard
      - SECRET_KEY=dev-secret-key
      - ALLOWED_HOSTS=localhost,backend
      - CORS_ALLOWED_ORIGINS=http://localhost:3000
      - CSRF_TRUSTED_ORIGINS=http://localhost:3000

  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      - POSTGRES_DB=rahnavard
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 7.2 Production Architecture

```
Internet
   ↓
Nginx (reverse proxy)
   ├── /api/* → Django (gunicorn)
   ├── /admin/* → Django (gunicorn)
   ├── /_next/static/* → Static files
   └── /* → Next.js (standalone)
                  ↓
              Django API
                  ↓
              PostgreSQL
```

---

## 8. Implementation Order

### Phase 1: Foundation
1. Initialize Next.js project with TypeScript
2. Initialize Django project with DRF
3. Set up Docker Compose
4. Configure PostgreSQL
5. Create design system (CSS variables, fonts)

### Phase 2: Backend
6. Create Django models
7. Run migrations
8. Create API serializers
9. Create API views
10. Configure admin panel
11. Create slug generation utility
12. Create redirect middleware

### Phase 3: Frontend - Design System
13. Set up Tailwind with design tokens
14. Create global styles
15. Implement font loading
16. Create base UI components

### Phase 4: Frontend - Home Page
17. Implement Header component
18. Implement Hero Slider
19. Implement Why Rahnavard section
20. Implement Featured Cars section
21. Implement Latest Articles section
22. Implement Branches section
23. Implement Consultation Form
24. Implement Footer

### Phase 5: Frontend - Dynamic Pages
25. Implement Cars listing page
26. Implement Car detail page
27. Implement Articles listing page
28. Implement Article detail page

### Phase 6: SEO
29. Implement generateMetadata for all routes
30. Create sitemap.xml
31. Create robots.txt
32. Add structured data
33. Implement canonical URLs

### Phase 7: Admin Panel
34. Create admin layout
35. Implement dashboard
36. Implement car management
37. Implement article management
38. Implement branch management
39. Implement inquiry management
40. Implement SEO preview

### Phase 8: Image Optimization
41. Convert images to WebP
42. Organize into directory structure
43. Implement next/image throughout
44. Add lazy loading

### Phase 9: Quality Assurance
45. Visual comparison with original HTML
46. Responsive testing (desktop, tablet, mobile)
47. SEO validation
48. Performance audit
49. Accessibility check
50. Build validation

---

## 9. Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SITE_URL=https://rahnavard.co
NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
```

### Backend (.env)
```bash
DEBUG=0
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=rahnavard.co,www.rahnavard.co,localhost
DATABASE_URL=postgres://user:password@postgres:5432/rahnavard
CORS_ALLOWED_ORIGINS=https://rahnavard.co
CSRF_TRUSTED_ORIGINS=https://rahnavard.co
```

---

## 10. Definition of Done Checklist

- [ ] Home page matches original HTML design (pixel-perfect)
- [ ] Next.js production build succeeds
- [ ] Django API functional
- [ ] PostgreSQL connected
- [ ] Django Admin accessible
- [ ] Custom Admin Panel functional
- [ ] Cars are dynamic (CRUD)
- [ ] Articles are dynamic (CRUD)
- [ ] Branches are dynamic (CRUD)
- [ ] Consultation form submits to API
- [ ] SSR/CSR boundaries correct
- [ ] SEO metadata on all pages
- [ ] Dynamic metadata for cars/articles
- [ ] Sitemap.xml generated
- [ ] Robots.txt configured
- [ ] Docker development works
- [ ] Docker production build works
- [ ] .env.example exists
- [ ] README complete
- [ ] No secrets in repository
- [ ] Desktop responsive ✓
- [ ] Tablet responsive ✓
- [ ] Mobile responsive ✓
- [ ] Slugs are SEO-friendly
- [ ] Slug redirects work
- [ ] Images optimized (WebP)
- [ ] Admin CRUD functional
- [ ] Structured data valid
- [ ] No unnecessary dependencies
