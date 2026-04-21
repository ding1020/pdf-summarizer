"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import FileUpload from "@/components/FileUpload";
import DocumentHistory from "@/components/DocumentHistory";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-600">Sign in to access your dashboard and upload PDFs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "User"}
            </h1>
            <p className="text-gray-600 mt-1">
              Upload PDF documents and get AI-powered summaries instantly.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Free tier: 5 summaries/day
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Upload PDF</h2>
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        {/* History Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <DocumentHistory key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
