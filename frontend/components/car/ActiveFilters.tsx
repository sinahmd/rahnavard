'use client'

import { FilterState } from './CarFilters'
import { FUEL_TYPE_LABELS, TRANSMISSION_LABELS } from '@/lib/carConstants'

interface Props {
  filters: FilterState
  onChange: (filters: FilterState) => void
  search: string
  onSearchChange: (s: string) => void
}

function formatPrice(price: string): string {
  const num = parseInt(price, 10)
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(0)} میلیارد تومان`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)} میلیون تومان`
  return `${new Intl.NumberFormat('fa-IR').format(num)} تومان`
}

interface ChipProps {
  label: string
  onRemove: () => void
}

function Chip({ label, onRemove }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 text-accent-dark text-[13px] font-bold rounded-lg transition-colors hover:bg-accent/25">
      {label}
      <button
        onClick={onRemove}
        className="w-4 h-4 rounded-full bg-accent-dark/20 hover:bg-accent-dark/40 flex items-center justify-center transition-colors"
        aria-label={`حذف ${label}`}
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}

export default function ActiveFilters({ filters, onChange, search, onSearchChange }: Props) {
  const chips: { key: string; label: string; clear: () => void }[] = []

  if (search) {
    chips.push({ key: 'search', label: `جستجو: ${search}`, clear: () => onSearchChange('') })
  }
  if (filters.brand) {
    chips.push({ key: 'brand', label: filters.brand, clear: () => onChange({ ...filters, brand: '' }) })
  }
  if (filters.body_type) {
    chips.push({ key: 'body_type', label: filters.body_type, clear: () => onChange({ ...filters, body_type: '' }) })
  }
  if (filters.fuel_type) {
    chips.push({ key: 'fuel_type', label: FUEL_TYPE_LABELS[filters.fuel_type] || filters.fuel_type, clear: () => onChange({ ...filters, fuel_type: '' }) })
  }
  if (filters.transmission) {
    chips.push({ key: 'transmission', label: TRANSMISSION_LABELS[filters.transmission] || filters.transmission, clear: () => onChange({ ...filters, transmission: '' }) })
  }
  if (filters.min_year) {
    chips.push({ key: 'min_year', label: `از سال ${filters.min_year}`, clear: () => onChange({ ...filters, min_year: '' }) })
  }
  if (filters.max_year) {
    chips.push({ key: 'max_year', label: `تا سال ${filters.max_year}`, clear: () => onChange({ ...filters, max_year: '' }) })
  }
  if (filters.min_price) {
    chips.push({ key: 'min_price', label: `حداقل ${formatPrice(filters.min_price)}`, clear: () => onChange({ ...filters, min_price: '' }) })
  }
  if (filters.max_price) {
    chips.push({ key: 'max_price', label: `حداکثر ${formatPrice(filters.max_price)}`, clear: () => onChange({ ...filters, max_price: '' }) })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onRemove={chip.clear} />
      ))}
      {chips.length > 1 && (
        <button
          onClick={() => {
            onSearchChange('')
            onChange({ brand: '', fuel_type: '', transmission: '', body_type: '', min_year: '', max_year: '', min_price: '', max_price: '' })
          }}
          className="text-[12px] text-red-500 hover:text-red-600 font-bold transition-colors mr-1"
        >
          پاک کردن همه
        </button>
      )}
    </div>
  )
}
