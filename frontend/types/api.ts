/**
 * Shared wire-level API contracts.
 *
 * DRF list endpoints return a paginated envelope; non-2xx responses are
 * normalized by `lib/api/http.ts` into `ApiError`.
 */

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/**
 * Normalized error envelope produced by `lib/api/http.ts` from DRF error
 * bodies (`detail` / `non_field_errors` / `{field: [errors]}`).
 */
export interface ApiError {
  message: string
  /** Server field errors keyed by field name (first message per field). */
  fieldErrors: Record<string, string>
  /** HTTP status of the failing response. */
  status: number
}
