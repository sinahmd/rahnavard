/**
 * API URL helper.
 *
 * In production, nginx proxies /api/* to the backend, so relative URLs work.
 * This minimal version simply returns the path as-is.
 *
 * On develop, this file is replaced with a version that resolves to
 * http://localhost:8000 for local Docker dev (see LOCAL_ONLY_FILES.txt).
 */
export function apiUrl(path: string): string {
  return path
}
