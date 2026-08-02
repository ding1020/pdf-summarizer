import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/en"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
