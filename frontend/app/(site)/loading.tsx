export default function SiteLoading() {
  return (
    <main id="main-content" className="pt-32 pb-20">
      <div className="wrap">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[14px] overflow-hidden shadow-card animate-pulse"
              role="status"
              aria-label="در حال بارگذاری"
            >
              <div className="w-full aspect-[4/3] bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mx-auto" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}