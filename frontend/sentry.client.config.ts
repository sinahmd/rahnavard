import * as Sentry from '@sentry/nextjs'
import { scrubSentryEvent } from './lib/sentry'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubSentryEvent,
    beforeBreadcrumb: () => null,
  })
}
