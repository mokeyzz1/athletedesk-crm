export default function Loading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex-shrink-0 h-16 md:h-[92px] flex items-center justify-between px-4 md:px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded"></div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 px-4 md:px-6 py-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded border border-gray-200 p-4">
              <div className="h-3 w-20 bg-gray-200 rounded mb-3"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Cards row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded border border-gray-200 p-4">
              <div className="h-4 w-28 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
