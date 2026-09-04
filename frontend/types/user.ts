/**
 * Wire shape for the admin user, mirroring UserSerializer
 * (`backend/apps/accounts/serializers.py`).
 */

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
  is_active: boolean
  date_joined: string
}
