export default function SignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded mx-auto mb-6" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg w-full" />
          <div className="h-12 bg-gray-200 rounded-lg w-full" />
          <div className="h-10 bg-gray-200 rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
}
