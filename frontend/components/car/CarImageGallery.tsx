'use client'

import { useState } from 'react'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { apiUrl } from '@/lib/apiUrl'

interface Props {
  mainImage: string
  gallery: string[]
  persianName: string
}

function resolveMediaUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/media/')) return apiUrl(url)
  return url
}

export default function CarImageGallery({ mainImage, gallery, persianName }: Props) {
  const allImages = [mainImage, ...gallery].filter(Boolean).map(resolveMediaUrl)
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  if (allImages.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-gray-light rounded-[14px] flex items-center justify-center text-gray">
        <div className="text-center">
          <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">تصویری آپلود نشده</p>
        </div>
      </div>
    )
  }

  const activeImage = allImages[activeIndex]

  return (
    <>
      <div className="relative w-full aspect-[4/3] bg-white rounded-[14px] overflow-hidden cursor-zoom-in group" onClick={() => setZoomed(true)}>
        <OptimizedImage src={activeImage} alt={`${persianName} - تصویر ${activeIndex + 1}`} width={800} height={600} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" priority />
        {allImages.length > 1 && <div className="absolute bottom-3 left-3 bg-dark/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-medium">{activeIndex + 1} / {allImages.length}</div>}
        {allImages.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); setActiveIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1)) }} className="absolute top-1/2 right-3 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100" aria-label="تصویر قبلی">
              <svg className="w-5 h-5 text-dark rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setActiveIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1)) }} className="absolute top-1/2 left-3 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100" aria-label="تصویر بعدی">
              <svg className="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
        <div className="absolute top-3 left-3 bg-dark/50 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
        </div>
      </div>
      {allImages.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {allImages.map((url, idx) => (
            <button key={idx} type="button" onClick={() => setActiveIndex(idx)} className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${activeIndex === idx ? 'border-accent-dark shadow-md scale-105' : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'}`} aria-label={`تصویر ${idx + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${persianName} - تصویر ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {zoomed && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomed(false)} role="dialog" aria-label="تصویر تمام‌صفحه">
          <button type="button" onClick={() => setZoomed(false)} className="absolute top-4 left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10" aria-label="بستن">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {allImages.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActiveIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1)) }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10" aria-label="تصویر قبلی">
                <svg className="w-6 h-6 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActiveIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1)) }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10" aria-label="تصویر بعدی">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeImage} alt={`${persianName} - تصویر بزرگ`} className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          {allImages.length > 1 && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-dark/70 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">{activeIndex + 1} / {allImages.length}</div>}
        </div>
      )}
    </>
  )
}
