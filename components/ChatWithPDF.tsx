"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/navigation";
import ReactMarkdown from "react-markdown";
import { trackEvent } from "@/lib/analytics";

// CSRF: same pattern as FileUpload
function getCsrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("__csrf_token="))
    ?.split("=")[1];
  return token ? { "X-CSRF-Token": token } : {};
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatWithPDFProps {
  content: string;
  documentId: string;
  isPro: boolean;
}

const MAX_HISTORY = 6; // Send last 6 messages as context

export default function ChatWithPDF({ content, documentId, isPro }: ChatWithPDFProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const suggestedQuestions = [
    t("suggestions.topic"),
    t("suggestions.keyPoints"),
    t("suggestions.methodology"),
    t("suggestions.conclusion"),
  ];

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isStreaming) return;

      // Pro gate
      if (!isPro) {
        trackEvent("chat_paywall_shown", { locale });
        router.push("/pricing");
        return;
      }

      // Clear previous error
      setError(null);

      // Add user message immediately
      const userMsg: ChatMessage = { role: "user", content: question.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");

      // Add empty assistant message for streaming
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setIsStreaming(true);

      // Track event
      trackEvent("chat_question_asked", { locale, isPro });

      // Build history (exclude current question + empty assistant placeholder)
      const history = newMessages.slice(-MAX_HISTORY).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          body: JSON.stringify({
            content,
            documentId,
            question: question.trim(),
            history,
            language: locale,
          }),
          signal: abortController.signal,
        });

        if (response.status === 402) {
          // Pro required
          if (mountedRef.current) {
            setError(t("proRequired"));
            // Remove the empty assistant message
            setMessages((prev) => prev.slice(0, -1));
          }
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || t("error"));
        }

        // Read SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error(t("streamError"));

        let fullResponse = "";
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
                if (parsed.content && mountedRef.current) {
                  fullResponse += parsed.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: fullResponse,
                    };
                    return updated;
                  });
                }
              } catch {
                // Partial JSON — expected
              }
            }
          }
        }

        // Track completion
        trackEvent("chat_answer_completed", {
          locale,
          isPro,
          provider: response.headers.get("X-Provider") || "unknown",
          searchMode: response.headers.get("X-Search-Mode") || "unknown",
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : t("error"));
          // Remove the empty assistant message
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        }
      } finally {
        if (mountedRef.current) {
          setIsStreaming(false);
        }
        abortRef.current = null;
      }
    },
    [content, documentId, isPro, isStreaming, messages, locale, router, t],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  const handleSuggestion = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              {t("title")}
              {!isPro && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-600 text-white rounded">PRO</span>
              )}
            </h3>
            <p className="text-xs text-purple-600 dark:text-purple-400">{t("subtitle")}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            {t("clear")}
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="max-h-96 min-h-[120px] overflow-y-auto space-y-3 mb-3 pr-1"
      >
        {messages.length === 0 ? (
          // Suggested questions when no messages
          <div className="py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t("tryAsking")}</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(q)}
                  className="px-3 py-1.5 text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Chat messages
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {msg.content ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isPro ? t("inputPlaceholder") : t("upgradePrompt")}
          disabled={isStreaming}
          rows={1}
          className="flex-1 resize-none px-3 py-2 text-sm rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50"
          style={{ minHeight: "38px", maxHeight: "120px" }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming || (!isPro && false)}
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={t("send")}
        >
          {isStreaming ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Pro hint for free users */}
      {!isPro && (
        <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
          {t("proHint")}{" "}
          <button
            onClick={() => router.push("/pricing")}
            className="font-semibold underline hover:text-purple-700 dark:hover:text-purple-300"
          >
            {t("upgradeLink")}
          </button>
        </p>
      )}
    </div>
  );
}
