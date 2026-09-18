import type { ErrorEvent } from '@sentry/nextjs'

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  delete event.request
  delete event.user
  delete event.breadcrumbs
  delete event.extra
  for (const exception of event.exception?.values ?? []) {
    for (const frame of exception.stacktrace?.frames ?? []) {
      delete frame.vars
    }
  }
  return event
}
