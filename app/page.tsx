import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered PDF Summaries
            <br />
            <span className="text-blue-600">in Seconds</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload any PDF and get instant AI-generated summaries. 
            Extract key insights without reading the entire document.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 text-lg font-medium rounded-lg hover:bg-gray-50 transition"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Get summaries in seconds, not hours. Our AI processes your documents instantly.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
            <p className="text-gray-600">Your documents are processed securely and never shared with third parties.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Free to Start</h3>
            <p className="text-gray-600">Get 5 free summaries every day. No credit card required.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center bg-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to save time?</h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Join thousands of professionals who use PDF Summary to extract insights faster.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-4 bg-white text-blue-600 text-lg font-medium rounded-lg hover:bg-blue-50 transition"
          >
            Start Free Today
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500">
          <p>&copy; 2024 PDF Summary. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/pricing" className="hover:text-gray-700">Pricing</Link>
            <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-700">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
