/**
 * Wire shape for Inquiry, mirroring InquirySerializer
 * (`backend/apps/inquiries/serializers.py`, `fields = "__all__"`).
 */

export interface Inquiry {
  id: number
  name: string
  phone: string
  subject: string
  message: string
  is_read: boolean
  is_contacted: boolean
  ip_address: string
  user_agent: string
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}
