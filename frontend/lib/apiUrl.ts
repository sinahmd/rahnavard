export function apiUrl(path: string): string {
  if (typeof window !== 'undefined') return path
  const backend = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'
  if (path.startsWith('/api/')) return `${backend}${path}`
  return path
}
