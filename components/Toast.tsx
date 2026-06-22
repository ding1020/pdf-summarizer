"use client";

import { useToast, type ToastType } from "@/hooks/useToast";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap: Record<ToastType, string> = {
  success: "border-green-500 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200",
  error: "border-red-500 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200",
  info: "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
  warning: "border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200",
};

const iconColorMap: Record<ToastType, string> = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-amber-600 dark:text-amber-400",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 p-4 shadow-lg animate-slide-in ${colorMap[toast.type]}`}
            role="alert"
          >
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColorMap[toast.type]}`} />
            <p className="text-sm font-medium flex-1 break-words">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
