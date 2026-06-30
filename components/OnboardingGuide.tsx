"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, ArrowRight } from "lucide-react";

const STORAGE_KEY = "pdfsum_onboarding_dismissed_v2";

interface OnboardingGuideProps {
  /** If true, show the guide */
  visible: boolean;
}

export default function OnboardingGuide({ visible }: OnboardingGuideProps) {
  const t = useTranslations("onboarding");
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) return;
    // Don't show if already dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") return;
    } catch {
      // localStorage unavailable
    }
    // Delay initial show for natural feel
    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!show) return null;

  const steps = [
    {
      icon: (
        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      title: t("step1Title") || "Upload Your PDF",
      desc: t("step1Desc") || "Drag & drop any PDF document — reports, contracts, research papers. We support files up to 50MB.",
    },
    {
      icon: (
        <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: t("step2Title") || "AI Analysis",
      desc: t("step2Desc") || "Our AI reads and understands your document. It extracts key points, generates summaries, and identifies important insights automatically.",
    },
    {
      icon: (
        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
      title: t("step3Title") || "Get Your Summary",
      desc: t("step3Desc") || "Download your summary as PDF or Word. Export charts, share via link, or copy to clipboard. All in one click.",
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} />

      {/* Card */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 mb-4 sm:mb-0 p-6 z-10 animate-in slide-in-from-bottom-4 duration-300">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-blue-600" : i < step ? "w-4 bg-blue-300" : "w-4 bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-5">{current.icon}</div>

        {/* Text */}
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
          {current.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center text-sm leading-relaxed mb-8">
          {current.desc}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium"
            >
              {t("back") || "Back"}
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-1.5"
          >
            {step === steps.length - 1
              ? (t("gotIt") || "Got It!")
              : (t("next") || "Next")}
            {step < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
