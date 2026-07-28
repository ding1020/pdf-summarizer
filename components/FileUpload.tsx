"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/navigation";
import { useToast } from "@/hooks/useToast";
import UploadDropzone from "./UploadDropzone";
import FileInfoCard from "./FileInfoCard";
import SummaryDisplay from "./SummaryDisplay";
import ErrorMessage from "./ErrorMessage";
import { UploadSkeleton, SummarySkeleton } from "./Skeleton";
import { trackPdfUpload, trackSummaryCompleted } from "@/lib/analytics";

// Constants
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE_DISPLAY = "20MB";

// CSRF: read cookie set by middleware, send it as a header on every POST.
// (The middleware sets __csrf_token on all page GETs — see middleware.ts.)
function getCsrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("__csrf_token="))
    ?.split("=")[1];
  return token ? { "X-CSRF-Token": token } : {};
}

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
  const locale = useLocale();
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
  const [isPro, setIsPro] = useState(false);

  const router = useRouter();

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch Pro status on mount
  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => {
        if (isMountedRef.current && data.isPro) setIsPro(true);
      })
      .catch(() => {});
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
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
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
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
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
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          body: JSON.stringify({
            documentId,
            content: content.slice(0, 100),
            streamSummary: fullSummary,
          }),
        });
      } catch {
        // Non-critical: summary already shown, DB save is best-effort
      }

      // Analytics: track summary completed
      trackSummaryCompleted("ai", "stream", locale, isPro);

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

  // Download summary as Markdown (Pro feature)
  const handleDownload = useCallback(() => {
    if (!summary || !result) return;

    // Non-Pro users get redirected to pricing
    if (!isPro) {
      router.push("/pricing");
      return;
    }

    // Build formatted Markdown with metadata
    const date = new Date().toISOString().split("T")[0];
    const header = [
      `# PDF Summary`,
      ``,
      `**Source:** ${result.filename}`,
      `**Generated:** ${date}`,
      `**Tool:** [PDFSum](https://www.pdfsum.com)`,
      ``,
      `---`,
      ``,
    ].join("\n");
    const footer = `\n\n---\n\n*Generated by [PDFSum](https://www.pdfsum.com)*\n`;
    const markdown = `${header}${summary}${footer}`;

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.filename.replace(/\.pdf$/i, "")}-summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [summary, result, isPro, router]);

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

      // Analytics: track upload initiated
      trackPdfUpload(file.size, locale);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            ...getCsrfHeaders(),
          },
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

      {/* Upload loading skeleton */}
      {isUploading && !result && <UploadSkeleton />}

      {/* Summarizing skeleton (show while waiting, before summary arrives) */}
      {isSummarizing && result && !summary && (
        <div className="space-y-6">
          <FileInfoCard filename={result.filename} pageCount={result.pageCount} />
          <SummarySkeleton />
        </div>
      )}

      {/* Error Message */}
      <ErrorMessage error={error} />

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Avoid double-rendering FileInfoCard when showing skeleton during summarize */}
          {(!isSummarizing || summary) && (
            <FileInfoCard filename={result.filename} pageCount={result.pageCount} />
          )}

          <SummaryDisplay
            summary={summary}
            isSummarizing={isSummarizing}
            copied={copied}
            documentId={result.documentId}
            sharingDocumentId={sharingDocumentId}
            isPro={isPro}
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
