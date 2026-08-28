'use client'

import { useRef, useState, DragEvent } from 'react'
import OptimizedImage from '@/components/ui/OptimizedImage'

interface Props {
  label: string
  name: string
  value: File[]
  onChange: (files: File[]) => void
  existingUrls?: string[]
  onExistingRemove?: (index: number) => void
  required?: boolean
  helpText?: string
  error?: string
  accept?: string
}

/**
 * Multi-file gallery upload with drag & drop, preview, and reorder.
 * Used for car gallery / slider images.
 */
export default function GalleryUpload({
  label,
  name,
  value,
  onChange,
  existingUrls = [],
  onExistingRemove,
  required,
  helpText,
  error,
  accept = 'image/*',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    onChange([...value, ...newFiles])
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeNew = (index: number) => {
    const updated = value.filter((_, i) => i !== index)
    onChange(updated)
  }

  const totalCount = existingUrls.length + value.length

  return (
    <div>
      <label className="block text-sm font-bold mb-2">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
        {totalCount > 0 && (
          <span className="mr-2 text-xs font-normal text-gray bg-gray-100 px-2 py-0.5 rounded-full">
            {totalCount} تصویر
          </span>
        )}
      </label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-accent bg-accent/10'
            : error
              ? 'border-red-400 bg-red-50'
              : 'border-gray-300 hover:border-accent hover:bg-accent/5'
        }`}
      >
        <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-gray font-medium">
          تصاویر را بکشید و رها کنید یا <span className="text-accent-dark">انتخاب کنید</span>
        </p>
        <p className="text-xs text-gray mt-1">حداکثر ۱۰ تصویر — PNG, JPG, WebP</p>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          name={name}
        />
      </div>

      {/* Existing images preview */}
      {existingUrls.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray font-medium mb-2">تصاویر فعلی:</p>
          <div className="flex flex-wrap gap-3">
            {existingUrls.map((url, idx) => (
              <div key={`existing-${idx}`} className="relative group">
                <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`تصویر ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
                {onExistingRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onExistingRemove(idx)
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New files preview */}
      {value.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray font-medium mb-2">تصاویر جدید:</p>
          <div className="flex flex-wrap gap-3">
            {value.map((file, idx) => (
              <div key={`new-${idx}`} className="relative group">
                <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-accent/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeNew(idx)
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  ✕
                </button>
                <p className="text-[10px] text-gray mt-1 truncate w-24">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {helpText && (
        <p className="text-xs text-gray-500 mt-2">{helpText}</p>
      )}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}
