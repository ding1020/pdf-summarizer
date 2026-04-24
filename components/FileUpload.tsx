"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import ReactMarkdown from "react-markdown";

interface FileUploadProps {
  onUploadComplete?: (data: {
    documentId: string;
    filename: string;
    content: string;
    pageCount: number;
  }) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    documentId: string;
    filename: string;
    content: string;
    pageCount: number;
  } | null>(null);
  const [summary, setSummary] = useState<string>("");

  const generateSummary = async (documentId: string, content: string) => {
    setIsSummarizing(true);
    setSummary("");

    try {
      const response = await fetch("/api/summarize/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate summary");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to read stream");
      }

      let fullSummary = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullSummary += parsed.content;
                setSummary(fullSummary);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Save summary to database
      await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, content }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setIsSummarizing(false);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      setError(null);
      setResult(null);
      setSummary("");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        const uploadResult = {
          documentId: data.documentId,
          filename: data.filename,
          content: data.content,
          pageCount: data.pageCount,
        };

        setResult(uploadResult);
        onUploadComplete?.(uploadResult);

        // Automatically generate summary
        await generateSummary(data.documentId, data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isUploading || isSummarizing,
  });

  return (
    <div className="w-full space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive 
            ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100" 
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
          }
          ${isUploading || isSummarizing ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-700">Processing PDF...</p>
            <p className="text-sm text-gray-500 mt-1">Extracting text content</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-blue-600">Drop your PDF here!</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">
              Click or drag PDF file here
            </p>
            <p className="text-sm text-gray-500">
              Maximum file size: 20MB
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Only PDF format supported
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{result.filename}</p>
                  <p className="text-sm text-gray-500">{result.pageCount} pages</p>
                </div>
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Uploaded</span>
            </div>
          </div>

          {/* AI Summary */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-blue-900">AI Summary</h3>
              </div>
              {isSummarizing && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </div>
              )}
            </div>
            
            {summary ? (
              <div className="prose prose-blue max-w-none bg-white rounded-lg p-4 border border-blue-100">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-8">
                {isSummarizing ? (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-blue-700 font-medium">Analyzing document...</p>
                    <p className="text-blue-500 text-sm mt-1">This may take a few seconds</p>
                  </div>
                ) : (
                  <p className="text-gray-500">Summary will appear here</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
