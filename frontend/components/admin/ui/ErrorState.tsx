/**
 * Admin error banner (plan §6.H). role="alert" announces load/action
 * failures to assistive tech; the optional retry re-runs the failed call.
 * Shared by AdminListPage, AdminForm, and the dashboard.
 */
export default function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
      {message}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mr-3 underline font-bold hover:text-red-900"
        >
          تلاش مجدد
        </button>
      )}
    </div>
  )
}
