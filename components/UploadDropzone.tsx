"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";

interface UploadDropzoneProps {
  isUploading: boolean;
  isSummarizing: boolean;
  isDragActive: boolean;
  getRootProps: (props?: Record<string, unknown>) => DropzoneRootProps;
  getInputProps: (props?: Record<string, unknown>) => DropzoneInputProps;
  disabled: boolean;
}

const UploadDropzone = memo(function UploadDropzone({
  isUploading,
  isSummarizing,
  isDragActive,
  getRootProps,
  getInputProps,
  disabled,
}: UploadDropzoneProps) {
  const t = useTranslations("upload");

  return (
    <div
      {...getRootProps()}
      role="button"
      tabIndex={0}
      aria-label={t("dragDrop")}
      aria-describedby="upload-hint"
      className={`
        border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer
        transition-all duration-200
        ${isDragActive 
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950 ring-4 ring-blue-100 dark:ring-blue-900" 
          : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} aria-label={t("dragDrop")} />
      
      {isUploading ? (
        <div className="flex flex-col items-center" role="status" aria-live="polite">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t("processing")}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("extracting")}</p>
        </div>
      ) : isDragActive ? (
        <div className="flex flex-col items-center" role="status" aria-live="assertive">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{t("dropHere")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-500" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t("dragDrop")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400" id="upload-hint">
            {t("maxSize")}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("onlyPdf")}
          </div>
        </div>
      )}
    </div>
  );
});

export default UploadDropzone;
