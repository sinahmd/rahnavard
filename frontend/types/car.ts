/**
 * Wire shapes for the Car domain, mirroring the backend serializers
 * (`backend/apps/cars/serializers.py`):
 * - `CarListItem`  — CarListSerializer (public list endpoint)
 * - `CarDetail`    — CarDetailSerializer (public detail endpoint)
 * - `CarAdmin`     — CarAdminSerializer (admin CRUD endpoints)
 */

/** CarListSerializer — public list rows (`/api/v1/cars/`). */
export interface CarListItem {
  id: number
  brand: string
  model: string
  persian_name: string
  slug: string
  year: number
  fuel_type: string
  fuel_type_display: string
  transmission: string
  transmission_display: string
  price: string | null
  body_type: string | null
  engine: string | null
  main_image: string | null
  is_featured: boolean
  display_order: number
  created_at: string
}

/** CarDetailSerializer — public detail (`/api/v1/cars/{slug}/`). */
export interface CarDetail {
  id: number
  brand: string
  model: string
  persian_name: string
  slug: string
  description: string
  year: number
  fuel_type: string
  fuel_type_display: string
  transmission: string
  transmission_display: string
  engine: string | null
  price: string | null
  main_image: string | null
  gallery: string[]
  manufacturer: string | null
  body_type: string | null
  color: string | null
  technical_description: string
  catalog_file: string | null
  is_active: boolean
  is_featured: boolean
  seo_title: string
  seo_description: string
  og_image: string | null
  created_at: string
  updated_at: string
}

/** CarAdminSerializer — admin rows (`/api/v1/admin/cars/`). */
export interface CarAdmin {
  id: number
  brand: string
  model: string
  persian_name: string
  slug: string
  description: string
  year: number
  fuel_type: string
  transmission: string
  engine: string | null
  price: string | null
  main_image: string | null
  gallery: string[]
  manufacturer: string | null
  body_type: string | null
  color: string | null
  technical_description: string
  catalog_file: string | null
  is_active: boolean
  is_featured: boolean
  display_order: number
  is_deleted: boolean
  deleted_at: string | null
  seo_title: string
  seo_description: string
  og_image: string | null
  created_at: string
  updated_at: string
}
