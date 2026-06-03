export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded w-96 mt-2 animate-pulse"></div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse"></div>
            <div>
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded w-56 mt-1 animate-pulse"></div>
            </div>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 animate-pulse"></div>
            <div className="h-5 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
