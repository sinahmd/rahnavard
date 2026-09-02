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
  { value: '', apiValue: '', label: 'پیشنهادی' },
  { value: '-created_at', apiValue: '-created_at', label: 'جدیدترین' },
  { value: 'price', apiValue: 'price', label: 'ارزان‌ترین' },
  { value: '-price', apiValue: '-price', label: 'گران‌ترین' },
  { value: '-year', apiValue: '-year', label: 'جدیدترین سال' },
] as const
