export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-6xl mx-auto px-4 animate-pulse">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="h-10 w-64 bg-gray-200 rounded mx-auto mb-4" />
          <div className="h-6 w-96 bg-gray-200 rounded mx-auto" />
        </div>
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 space-y-6">
              <div className="h-8 w-32 bg-gray-200 rounded" />
              <div className="h-5 w-48 bg-gray-200 rounded" />
              <div className="h-12 w-28 bg-gray-200 rounded" />
              <div className="space-y-3">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-5 bg-gray-200 rounded w-full" />
                ))}
              </div>
              <div className="h-12 bg-gray-200 rounded-lg w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
