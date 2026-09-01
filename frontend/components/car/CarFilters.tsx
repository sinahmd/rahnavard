'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FUEL_TYPE_LABELS, TRANSMISSION_LABELS } from '@/lib/carConstants'

export interface FilterOptions {
  brands: string[]
  body_types: string[]
  fuel_types: string[]
  transmissions: string[]
  min_year: number | null
  max_year: number | null
  min_price: number | null
  max_price: number | null
}

export interface FilterState {
  brand: string
  fuel_type: string
  transmission: string
  body_type: string
  min_year: string
  max_year: string
  min_price: string
  max_price: string
}

interface Props {
  options: FilterOptions
  filters: FilterState
  onChange: (filters: FilterState) => void
  resultCount: number
  isOpen: boolean
  onClose: () => void
}

function formatPriceLabel(price: number): string {
  if (price >= 1_000_000_000) {
    return `${(price / 1_000_000_000).toFixed(0)} میلیارد`
  }
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(0)} میلیون`
  }
  return new Intl.NumberFormat('fa-IR').format(price)
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[13px] font-bold text-dark mb-2.5">{title}</h3>
      {children}
    </div>
  )
}

function SelectFilter({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-[1.5px] border-gray-light rounded-lg px-3 py-2.5 text-[14px] bg-white text-dark outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export default function CarFilters({ options, filters, onChange, resultCount, isOpen, onClose }: Props) {
  const [localMinPrice, setLocalMinPrice] = useState(filters.min_price)
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.max_price)
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setLocalMinPrice(filters.min_price)
    setLocalMaxPrice(filters.max_price)
  }, [filters.min_price, filters.max_price])

  // Escape key closes mobile drawer
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Focus management: trap focus in drawer, return focus on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      // Focus the close button after transition
      const timer = setTimeout(() => {
        const closeBtn = drawerRef.current?.querySelector('button')
        closeBtn?.focus()
      }, 350)
      return () => clearTimeout(timer)
    } else {
      // Return focus to trigger button
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Debounce price range
  useEffect(() => {
    const t = setTimeout(() => {
      if (localMinPrice !== filters.min_price || localMaxPrice !== filters.max_price) {
        onChange({ ...filters, min_price: localMinPrice, max_price: localMaxPrice })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [localMinPrice, localMaxPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    (patch: Partial<FilterState>) => {
      onChange({ ...filters, ...patch, min_price: localMinPrice, max_price: localMaxPrice })
    },
    [filters, localMinPrice, localMaxPrice, onChange]
  )

  const activeCount = Object.values(filters).filter((v) => v !== '').length

  const yearOptions = (() => {
    if (!options.min_year || !options.max_year) return []
    const years: { value: string; label: string }[] = []
    for (let y = options.max_year; y >= options.min_year; y--) {
      years.push({ value: String(y), label: String(y) })
    }
    return years
  })()

  const handleClearAll = () => {
    onChange({ brand: '', fuel_type: '', transmission: '', body_type: '', min_year: '', max_year: '', min_price: '', max_price: '' })
    setLocalMinPrice('')
    setLocalMaxPrice('')
  }

  const filterContent = (
    <div className="space-y-0">
      {/* Result count + clear */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-light">
        <span className="text-[13px] text-gray">
          <span className="font-bold text-dark">{resultCount}</span> خودرو یافت شد
        </span>
        {activeCount > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[12px] text-red-500 hover:text-red-600 font-bold transition-colors"
          >
            پاک کردن همه ({activeCount})
          </button>
        )}
      </div>

      {/* Brand */}
      <FilterSection title="برند">
        <SelectFilter
          value={filters.brand}
          onChange={(v) => update({ brand: v })}
          options={options.brands.map((b) => ({ value: b, label: b }))}
          placeholder="همه برندها"
        />
      </FilterSection>

      {/* Body Type */}
      {options.body_types.length > 0 && (
        <FilterSection title="نوع بدنه">
          <SelectFilter
            value={filters.body_type}
            onChange={(v) => update({ body_type: v })}
            options={options.body_types.map((b) => ({ value: b, label: b }))}
            placeholder="همه انواع"
          />
        </FilterSection>
      )}

      {/* Fuel Type */}
      <FilterSection title="نوع سوخت">
        <SelectFilter
          value={filters.fuel_type}
          onChange={(v) => update({ fuel_type: v })}
          options={options.fuel_types.map((f) => ({ value: f, label: FUEL_TYPE_LABELS[f] || f }))}
          placeholder="همه انواع سوخت"
        />
      </FilterSection>

      {/* Transmission */}
      <FilterSection title="گیربکس">
        <SelectFilter
          value={filters.transmission}
          onChange={(v) => update({ transmission: v })}
          options={options.transmissions.map((t) => ({ value: t, label: TRANSMISSION_LABELS[t] || t }))}
          placeholder="همه گیربکس‌ها"
        />
      </FilterSection>

      {/* Year Range */}
      {yearOptions.length > 0 && (
        <FilterSection title="سال ساخت">
          <div className="flex gap-2">
            <select
              value={filters.min_year}
              onChange={(e) => update({ min_year: e.target.value })}
              className="flex-1 border-[1.5px] border-gray-light rounded-lg px-3 py-2.5 text-[14px] bg-white text-dark outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              <option value="">از</option>
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
            <select
              value={filters.max_year}
              onChange={(e) => update({ max_year: e.target.value })}
              className="flex-1 border-[1.5px] border-gray-light rounded-lg px-3 py-2.5 text-[14px] bg-white text-dark outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              <option value="">تا</option>
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>
        </FilterSection>
      )}

      {/* Price Range */}
      {options.min_price !== null && options.max_price !== null && (
        <FilterSection title="محدوده قیمت (تومان)">
          <div className="flex gap-2">
            <input
              type="number"
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
              placeholder={`از ${formatPriceLabel(options.min_price)}`}
              aria-label="حداقل قیمت"
              className="flex-1 border-[1.5px] border-gray-light rounded-lg px-3 py-2.5 text-[14px] bg-white text-dark outline-none focus:border-accent transition-colors"
            />
            <input
              type="number"
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
              placeholder={`تا ${formatPriceLabel(options.max_price)}`}
              aria-label="حداکثر قیمت"
              className="flex-1 border-[1.5px] border-gray-light rounded-lg px-3 py-2.5 text-[14px] bg-white text-dark outline-none focus:border-accent transition-colors"
            />
          </div>
        </FilterSection>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-[280px] shrink-0">
        <div className="bg-white rounded-[14px] shadow-card p-5 sticky top-28">
          <h2 className="text-[16px] font-extrabold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            فیلترها
          </h2>
          {filterContent}
        </div>
      </div>

      {/* Mobile drawer overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="فیلترهای جستجو"
        className={`fixed top-0 bottom-0 right-0 w-[85%] max-w-[360px] bg-white z-50 transition-transform duration-300 lg:hidden overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-light px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-[16px] font-extrabold text-dark flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            فیلترها
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="بستن فیلترها"
          >
            <svg className="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {filterContent}
        </div>

        {/* Apply button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-light px-5 py-4">
          <button
            onClick={onClose}
            className="w-full btn btn-primary py-3.5"
          >
            مشاهده نتایج
          </button>
        </div>
      </div>
    </>
  )
}
