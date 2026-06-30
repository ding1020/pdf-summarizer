"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";

interface ErrorMessageProps {
  error: string | null;
}

const ErrorMessage = memo(function ErrorMessage({ error }: ErrorMessageProps) {
  const t = useTranslations("upload");

  if (!error) return null;

  return (
    <div
      role="alert"
      className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-3"
    >
      <svg
        className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p className="font-medium text-red-800 dark:text-red-300">
          {t("errorTitle")}
        </p>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    </div>
  );
});

export default ErrorMessage;
