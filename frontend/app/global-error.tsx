'use client'

import { useEffect } from 'react'
import { captureException } from '@sentry/nextjs'

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { captureException(error) }, [error])

  return (
    <html lang="fa" dir="rtl">
      <body>
        <h1>خطایی رخ داد</h1>
        <button onClick={reset}>تلاش مجدد</button>
      </body>
    </html>
  )
}
