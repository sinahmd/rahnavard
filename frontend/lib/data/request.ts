/**
 * Shared server-only fetch helpers for the RSC data layer.
 *
 * Every lib/data fetcher talks to Django over `BACKEND_INTERNAL_URL` with
 * ISR-style revalidation and a timeout. `AbortSignal.timeout` is guarded
 * because some environments (e.g. jsdom in jest) ship an AbortSignal
 * without the static `timeout` method — production Node has it, and the
 * guard keeps the module testable without weakening production.
 *
 * Server-only: reads `BACKEND_INTERNAL_URL`; never runs in the browser and
 * never touches cookies/localStorage.
 */

import { backendInternalUrl } from './media'

export interface DataFetchOptions {
  /** Seconds for `next: { revalidate }` (ISR-style refresh). */
  revalidate?: number
  /** Timeout per attempt in ms. Default 8000. */
  timeoutMs?: number
  /** If false (default), failures resolve to `null`; if true, re-throw. */
  throwOnError?: boolean
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  return undefined
}

/** Single GET over the internal backend URL; resolves `null` on failure. */
export async function fetchDataJson<T>(
  path: string,
  options: DataFetchOptions = {}
): Promise<T | null> {
  const { revalidate, timeoutMs = 8000, throwOnError = false } = options
  try {
    const res = await fetch(`${backendInternalUrl()}${path}`, {
      next: revalidate ? { revalidate } : undefined,
      signal: timeoutSignal(timeoutMs),
    })
    if (!res.ok) {
      if (throwOnError) throw new Error(`GET ${path} failed with status ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (error) {
    if (throwOnError) throw error
    return null
  }
}

/**
 * GET with retry/backoff (3 attempts, 1s apart) for detail fetchers —
 * mirrors the previous inline retry in the detail pages.
 */
export async function fetchDataJsonWithRetry<T>(
  path: string,
  options: DataFetchOptions = {}
): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const data = await fetchDataJson<T>(path, options)
    if (data !== null) return data
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return null
}