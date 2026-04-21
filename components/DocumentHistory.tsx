"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Document {
  id: string;
  filename: string;
  fileSize: number;
  pageCount: number;
  status: string;
  summary: string | null;
  createdAt: string;
}

export default function DocumentHistory() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== id));
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No documents yet. Upload your first PDF above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Document History</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Document List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`
                p-4 rounded-lg border cursor-pointer transition-colors
                ${selectedDoc?.id === doc.id 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-gray-300"
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{doc.filename}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {doc.pageCount} pages • {formatFileSize(doc.fileSize)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(doc.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      doc.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : doc.status === "processing"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {doc.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                    disabled={deleting === doc.id}
                    className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                  >
                    {deleting === doc.id ? (
                      <div className="animate-spin h-4 w-4 border-b-2 border-red-500 rounded-full"></div>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Document Preview */}
        <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
          {selectedDoc ? (
            <div>
              <h3 className="font-semibold mb-2">{selectedDoc.filename}</h3>
              {selectedDoc.summary ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{selectedDoc.summary}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  {selectedDoc.status === "processing"
                    ? "Generating summary..."
                    : "No summary available"}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center">Select a document to view summary</p>
          )}
        </div>
      </div>
    </div>
  );
}
