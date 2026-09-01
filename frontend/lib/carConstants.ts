export const FUEL_TYPE_LABELS: Record<string, string> = {
  gasoline: 'بنزینی',
  diesel: 'دیزلی',
  hybrid: 'هیبریدی',
  electric: 'الکتریکی',
}

export const TRANSMISSION_LABELS: Record<string, string> = {
  automatic: 'اتوماتیک',
  manual: 'دستی',
}

export const SORT_OPTIONS = [
  { value: '', label: 'پیشنهادی' },
  { value: '-created_at', label: 'جدیدترین' },
  { value: 'price', label: 'ارزان‌ترین' },
  { value: '-price', label: 'گران‌ترین' },
  { value: '-year', label: 'جدیدترین سال' },
] as const
