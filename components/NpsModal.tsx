"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

interface NpsModalProps {
  /** The user's current total usage count — passed from parent */
  usageCount: number;
}

const NPS_THRESHOLD = 7;
const STORAGE_KEY = "pdfsum_nps_shown";

/**
 * NPS (Net Promoter Score) modal that appears after the user
 * completes their 7th summary. Asks "How likely are you to recommend us?"
 * on a 1–10 scale, then sends the result to /api/feedback.
 *
 * Shows once per browser (localStorage key prevents repeat).
 */
export default function NpsModal({ usageCount }: NpsModalProps) {
  const { isSignedIn } = useAuth();
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  // Show dialog when threshold is crossed and not yet shown
  const checkAndShow = useCallback(() => {
    if (usageCount < NPS_THRESHOLD) return;
    if (!isSignedIn) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    setVisible(true);
  }, [usageCount, isSignedIn]);

  useEffect(() => {
    queueMicrotask(() => {
      checkAndShow();
    });
  }, [checkAndShow]);

  const handleSubmit = async () => {
    if (score === null || sending) return;
    setSending(true);

    const isPromoter = score >= 9;
    const isDetractor = score <= 6;
    const segment = isPromoter ? "promoter" : isDetractor ? "detractor" : "passive";

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "general",
          message: `NPS Score: ${score}/10 (${segment}) — after ${usageCount} summaries`,
        }),
      });
    } catch {
      // Silent fail
    }

    setSubmitted(true);
    setSending(false);

    // Close after 3 seconds
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, "true");
    }, 3000);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8">
        {!submitted ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              How likely are you to recommend PDFSum?
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Your feedback helps us improve the product.
            </p>

            {/* Score buttons */}
            <div className="flex justify-between gap-1 mb-6">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    score === n
                      ? "bg-blue-600 text-white shadow-lg scale-110"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-xs text-gray-500 mb-6 px-1">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setVisible(false);
                  localStorage.setItem(STORAGE_KEY, "true");
                }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Maybe later
              </button>
              <button
                onClick={handleSubmit}
                disabled={score === null || sending}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-all"
              >
                {sending ? "Sending..." : "Submit"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Thank you!</h3>
            <p className="text-sm text-gray-500">Your feedback helps us improve PDFSum.</p>
          </div>
        )}
      </div>
    </div>
  );
}
