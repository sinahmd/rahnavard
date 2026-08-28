'use client'

import { useState, useRef, useCallback, useEffect, DragEvent } from 'react'

const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

interface FileUploadProps {
  name: string
  label: string
  value: File | null
  onChange: (file: File | null) => void
  existingUrl?: string | null
  existingFileName?: string | null
  required?: boolean
  helpText?: string
  error?: string
  accept?: string
}

function validateFile(file: File, accept?: string): string | null {
  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return `حجم فایل (${sizeMB} MB) از حد مجاز (${MAX_SIZE_MB} MB) بیشتر است.`
  }

  if (accept) {
    const acceptedTypes = accept.split(',').map((t) => t.trim())
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    const matchesType = acceptedTypes.some((t) => {
      if (t.startsWith('.')) return ext === t.toLowerCase()
      if (t.includes('*')) {
        const base = t.split('/')[0]
        return file.type.startsWith(base)
      }
      return file.type === t
    })
    if (!matchesType) {
      return `فرمت فایل پشتیبانی نمی‌شود. فرمت‌های مجاز: ${acceptedTypes.join('، ')}`
    }
  }

  return null
}

export default function FileUpload({
  name,
  label,
  value,
  onChange,
  existingUrl,
  existingFileName,
  required = false,
  helpText,
  error,
  accept = '.pdf',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValidationError(null)
  }, [existingUrl])

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        onChange(null)
        setValidationError(null)
        return
      }

      const err = validateFile(file, accept)
      if (err) {
        setValidationError(err)
        onChange(null)
        return
      }

      setValidationError(null)
      onChange(file)
    },
    [onChange, accept]
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
    setValidationError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onChange])

  const hasExisting = !!existingUrl && !value
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
          border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {hasExisting ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-dark">{existingFileName || 'فایل موجود'}</p>
                <a
                  href={existingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-dark hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  مشاهده فایل
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="text-red-500 hover:text-red-600 text-sm"
            >
              حذف
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 mb-1">
              فایل را بکشید و رها کنید یا کلیک کنید
            </p>
            <p className="text-xs text-gray-400">
              حداکثر {MAX_SIZE_MB}MB
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
