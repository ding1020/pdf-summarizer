"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "pdfsum_onboarded";
const STEPS = [
  {
    icon: (
      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    titleKey: "onboarding.step1Title",
    descKey: "onboarding.step1Desc",
  },
  {
    icon: (
      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    titleKey: "onboarding.step2Title",
    descKey: "onboarding.step2Desc",
  },
  {
    icon: (
      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    titleKey: "onboarding.step3Title",
    descKey: "onboarding.step3Desc",
  },
];

export default function OnboardingGuide({ onComplete }: { onComplete?: () => void }) {
  const t = useTranslations("dashboard");
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setFadeOut(true);
    setTimeout(() => {
      setShow(false);
      localStorage.setItem(STORAGE_KEY, "true");
      onComplete?.();
    }, 300);
  };

  // Close on Escape key
  useEffect(() => {
    if (!show || fadeOut) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [show, fadeOut]);

  const nextStep = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!show) return null;

  const current = STEPS[step];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.guideTitle")}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center animate-in zoom-in-95 duration-300">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-blue-600" : i < step ? "w-4 bg-blue-300" : "w-4 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-5">{current.icon}</div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {t(current.titleKey)}
        </h3>

        {/* Description */}
        <p className="text-gray-600 mb-8">{t(current.descKey)}</p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={dismiss}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t("skip")}
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {step === STEPS.length - 1 ? t("getStarted") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}
