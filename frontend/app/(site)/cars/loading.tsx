export default function CarsLoading() {
  return (
    <main className="pt-32 pb-20">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">محصولات</span>
          <h1 className="section-title">خودروهای ما</h1>
          <p>مجموعه‌ای از خودروهای وارداتی راهنورد خودرو، آماده تحویل با گارانتی رسمی.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[14px] p-7 pb-6 shadow-card text-center flex flex-col items-center h-full animate-pulse"
            >
              <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl mb-[18px]" />
              <div className="flex-1 flex flex-col items-center justify-start w-full gap-3">
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-5 w-28 bg-gray-100 rounded" />
              </div>
              <div className="h-10 w-full bg-gray-100 rounded-lg mt-[22px]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
