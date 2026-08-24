'use client'

import { useState, useRef, useCallback, useEffect, DragEvent } from 'react'

const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

interface ImageUploadProps {
  name: string
  label: string
  value: File | null
  onChange: (file: File | null) => void
  existingUrl?: string | null
  required?: boolean
  helpText?: string
  error?: string
}

function validateFile(file: File): string | null {
  // Check size
  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return `حجم فایل (${sizeMB} MB) از حد مجاز (${MAX_SIZE_MB} MB) بیشتر است.`
  }

  // Check MIME type (some browsers may not set this)
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return 'فرمت فایل پشتیبانی نمی‌شود. فرمت‌های مجاز: jpg، png، webp'
  }

  // Check extension
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'فرمت فایل پشتیبانی نمی‌شود. فرمت‌های مجاز: jpg، png، webp'
  }

  return null
}

export default function ImageUpload({
  name,
  label,
  value,
  onChange,
  existingUrl,
  required = false,
  helpText,
  error,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Clear preview when existingUrl changes (e.g., switching between items)
  useEffect(() => {
    setPreview(null)
    setValidationError(null)
  }, [existingUrl])

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        onChange(null)
        setPreview(null)
        setValidationError(null)
        return
      }

      const err = validateFile(file)
      if (err) {
        setValidationError(err)
        onChange(null)
        setPreview(null)
        return
      }

      setValidationError(null)
      onChange(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    },
    [onChange]
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0] || null
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null
      handleFile(file)
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setPreview(null)
    setValidationError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onChange])

  const displayUrl = preview || existingUrl
  const showPreview = !!displayUrl
  const displayError = validationError || error

  return (
    <div>
      <label className="block text-sm font-bold mb-2">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${showPreview ? 'p-0 border-solid' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
        />

        {showPreview ? (
          <div className="relative">
            <img
              src={preview || existingUrl || ''}
              alt={label}
              className="w-full max-h-48 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="bg-white/90 text-dark px-3 py-1 rounded text-sm font-bold">
                تغییر تصویر
              </span>
            </div>
            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="absolute top-2 left-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
              aria-label="حذف تصویر"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 mb-1">
              تصویر را بکشید و رها کنید یا کلیک کنید
            </p>
            <p className="text-xs text-gray-400">
              حداکثر {MAX_SIZE_MB}MB — فرمت‌ها: jpg، png، webp
            </p>
          </div>
        )}
      </div>

      {/* File info when selected */}
      {value && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            {value.name} ({(value.size / 1024).toFixed(0)} KB)
          </span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-red-500 hover:text-red-600"
          >
            حذف
          </button>
        </div>
      )}

      {/* Help text */}
      {helpText && !displayError && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}

      {/* Error */}
      {displayError && (
        <p className="text-red-500 text-sm mt-1">{displayError}</p>
      )}
    </div>
  )
}
