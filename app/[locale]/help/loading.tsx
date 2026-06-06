export default function HelpLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded mx-auto mb-8" />
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 space-y-3">
              <div className="h-6 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
