"use client";

import dynamic from "next/dynamic";

// Dynamic import with ssr:false to prevent Clerk SSR incompatibility with Next.js 15
const SignUpPageContent = dynamic(
  () => import("./SignUpContent"),
  { ssr: false, loading: () => <SignUpFallback /> }
);

export default function SignUpPage() {
  return <SignUpPageContent />;
}

function SignUpFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading sign-up...</p>
      </div>
    </div>
  );
}
