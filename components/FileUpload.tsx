"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/useToast";
import UploadDropzone from "./UploadDropzone";
import FileInfoCard from "./FileInfoCard";
import SummaryDisplay from "./SummaryDisplay";
import ErrorMessage from "./ErrorMessage";

// Constants
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE_DISPLAY = "20MB";

interface FileUploadProps {
  onUploadComplete?: (data: {
    documentId: string;
    filename: string;
    content: string;
    pageCount: number;
  }) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const t = useTranslations("upload");
  const toast = useToast();
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
  const [copied, setCopied] = useState(false);
  const [sharingDocumentId, setSharingDocumentId] = useState<string | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Client-side file validation
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE_DISPLAY} limit`;
    }
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return t("onlyPdfError");
    }
    return null;
  }, [t]);

  // Generate summary (stream for signed-in, direct for guests)
  const generateSummary = useCallback(async (documentId: string, content: string, isGuest: boolean) => {
    if (!isMountedRef.current) return;
    
    setIsSummarizing(true);
    setSummary("");

    // For guests, the streaming endpoint requires auth — fall back to non-streaming
    if (isGuest) {
      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, content }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t("summarizeFailed"));
        if (isMountedRef.current) {
          setSummary(data.summary);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : t("summarizeFailed"));
        }
      } finally {
        if (isMountedRef.current) setIsSummarizing(false);
      }
      return;
    }

    // Signed-in user: use streaming SSE for real-time display
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/summarize/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, documentId }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("summarizeFailed"));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error(t("streamFailed"));
      }

      let fullSummary = "";
      let partialLine = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const rawText = partialLine + decoder.decode(value);
        const lines = rawText.split("\n");
        partialLine = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content && isMountedRef.current) {
                fullSummary += parsed.content;
                setSummary(fullSummary);
              }
            } catch {
              // Parse errors expected on partial chunks
            }
          }
        }
      }

      // Save summary to database (pass stream result, no re-call to AI)
      try {
        await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            content: content.slice(0, 100),
            streamSummary: fullSummary,
          }),
        });
      } catch {
        // Non-critical: summary already shown, DB save is best-effort
      }

      // Notify other components that usage count has changed
      window.dispatchEvent(new CustomEvent("usage-refresh"));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : t("summarizeFailed"));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSummarizing(false);
      }
      abortControllerRef.current = null;
    }
  }, [t]);

  // Cancel in-flight summary
  const cancelSummary = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsSummarizing(false);
    setSummary("");
  }, []);

  // Copy summary to clipboard
  const handleCopy = useCallback(async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silent fallback
    }
  }, [summary]);

  // Download summary as Markdown
  const handleDownload = useCallback(() => {
    if (!summary || !result) return;
    const blob = new Blob([summary], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.filename.replace(/\.pdf$/i, "")}-summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [summary, result]);

  // Toggle sharing for a document
  const handleShare = useCallback(async () => {
    if (!result?.documentId) return;
    setSharingDocumentId(result.documentId);
    try {
      const response = await fetch(`/api/documents/${result.documentId}/share`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success(t("shareEnabled"));
      }
    } catch {
      // silent
    } finally {
      setSharingDocumentId(null);
    }
  }, [result, t]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

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
          throw new Error(data.error || t("uploadFailed"));
        }

        const uploadResult = {
          documentId: data.documentId,
          filename: data.filename,
          content: data.content,
          pageCount: data.pageCount,
        };

        setResult(uploadResult);
        onUploadComplete?.(uploadResult);

        const summaryContent = data.isGuest ? data.content : (data.content || "");
        const summaryDocId = data.isGuest ? data.documentId : (data.documentId || "");
        await generateSummary(summaryDocId, summaryContent, data.isGuest ?? false);
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Upload failed");
        }
      } finally {
        if (isMountedRef.current) setIsUploading(false);
      }
    },
    [onUploadComplete, validateFile, generateSummary, t]
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
      <UploadDropzone
        isUploading={isUploading}
        isSummarizing={isSummarizing}
        isDragActive={isDragActive}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        disabled={isUploading || isSummarizing}
      />

      {/* Error Message */}
      <ErrorMessage error={error} />

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <FileInfoCard filename={result.filename} pageCount={result.pageCount} />

          <SummaryDisplay
            summary={summary}
            isSummarizing={isSummarizing}
            copied={copied}
            filename={result.filename}
            pageCount={result.pageCount}
            documentId={result.documentId}
            sharingDocumentId={sharingDocumentId}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onShare={handleShare}
            onCancel={cancelSummary}
          />
        </div>
      )}
    </div>
  );
}
