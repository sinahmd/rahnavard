import type { ErrorEvent } from '@sentry/nextjs'
import { scrubSentryEvent } from '../sentry'

describe('Sentry privacy', () => {
  it('preserves errors while removing request data and local variables', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: 'Synthetic failure',
      request: { data: { password: 'private' }, headers: { Cookie: 'private' } },
      user: { email: 'private@example.test' },
      extra: { phone: 'private' },
      breadcrumbs: [{ message: 'private' }],
      exception: { values: [{ type: 'Error', value: 'Synthetic failure', stacktrace: {
        frames: [{ filename: 'app.ts', lineno: 42, vars: { password: 'private' } }],
      } }] },
    }
    const result = scrubSentryEvent(event)
    expect(result.message).toBe('Synthetic failure')
    expect(result.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({ filename: 'app.ts', lineno: 42 })
    expect(JSON.stringify(result)).not.toContain('private')
  })

  it('keeps ordinary events', () => {
    expect(scrubSentryEvent({ type: undefined, message: 'Synthetic failure' })).toEqual({ type: undefined, message: 'Synthetic failure' })
  })
})
