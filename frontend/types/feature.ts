/**
 * Wire shape for WhyFeature ("why Rahnavard" feature cards), mirroring
 * WhyFeatureSerializer (`backend/apps/core/serializers.py`).
 */

export interface WhyFeature {
  id: number
  title: string
  description: string
  icon: string | null
  is_active: boolean
  display_order: number
}
