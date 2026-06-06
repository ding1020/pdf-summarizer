export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-96 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 bg-gray-100 rounded-lg w-32 animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-lg w-24 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-56 animate-pulse" />
            </div>
          </div>
          {/* Dropzone skeleton */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded w-48 mx-auto animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-32 mx-auto mt-2 animate-pulse" />
          </div>
        </div>

        {/* Tips skeleton */}
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
