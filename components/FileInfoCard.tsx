"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";

interface FileInfoCardProps {
  filename: string;
  pageCount: number;
}

const FileInfoCard = memo(function FileInfoCard({ filename, pageCount }: FileInfoCardProps) {
  const t = useTranslations("upload");

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {filename}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pageCount} {t("pages")}
            </p>
          </div>
        </div>
        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
          {t("uploaded")}
        </span>
      </div>
    </div>
  );
});

export default FileInfoCard;
