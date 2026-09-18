import * as Sentry from '@sentry/nextjs'
import { scrubSentryEvent } from './lib/sentry'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE,
    environment: process.env.SENTRY_ENVIRONMENT || 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubSentryEvent,
    beforeBreadcrumb: () => null,
  })
}
