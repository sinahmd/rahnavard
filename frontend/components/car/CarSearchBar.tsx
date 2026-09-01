'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function CarSearchBar({ value, onChange }: Props) {
  const [localValue, setLocalValue] = useState(value)

  // Sync from parent (URL state) → local
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounce: push to parent after 350ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [localValue]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  return (
    <div className="relative">
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="جستجوی خودرو برند، مدل، نام فارسی..."
        aria-label="جستجوی خودرو"
        className="w-full pr-12 pl-10 py-3.5 rounded-xl border-[1.5px] border-gray-light bg-white text-[15px] font-vazir text-dark outline-none transition-colors focus:border-accent placeholder:text-gray/50"
        dir="rtl"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          aria-label="پاک کردن جستجو"
        >
          <svg className="w-3.5 h-3.5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
