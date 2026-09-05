/**
 * Admin empty-state message (plan §6.H). Rendered inside the list table
 * when the current page has no rows.
 */
export default function EmptyState({ message }: { message: string }) {
  return <p className="text-center text-gray-500">{message}</p>
}
