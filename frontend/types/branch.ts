/**
 * Wire shapes for the Branch domain, mirroring the backend serializers
 * (`backend/apps/branches/serializers.py`).
 */

/** BranchSerializer — public list/detail rows (`/api/v1/branches/`). */
export interface Branch {
  id: number
  name: string
  address: string
  phone: string
  map_url: string
  map_image: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  display_order: number
}

/** BranchAdminSerializer — admin rows (`/api/v1/admin/branches/`). */
export interface BranchAdmin extends Branch {
  is_deleted: boolean
  deleted_at: string | null
}
