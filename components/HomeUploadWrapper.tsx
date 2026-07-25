"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/navigation";
import FileUpload from "@/components/FileUpload";

/**
 * Home page upload zone — renders a real FileUpload component
 * on the landing page so users can try without creating an account.
 * Guests get the preview experience; signed-in users get full functionality.
 */
export default function HomeUploadWrapper() {
  const t = useTranslations("home");
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {t("uploadTitle") || "Try It Now — Free"}
          </h2>
          <p className="text-lg text-gray-600">
            {isSignedIn
              ? t("uploadSubtitleSigned") || "Upload a PDF and get an AI summary instantly."
              : t("uploadSubtitleGuest") || "No sign-up required. Upload a PDF and see the magic."}
          </p>
        </div>

        <div className="bg-white border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl transition-colors">
          <FileUpload
            onUploadComplete={(result) => {
              if (result.documentId) {
                // For guests: after preview, prompt to sign up for full features
                if (!isSignedIn) {
                  // Show a brief delay then redirect to sign-up after preview
                }
              }
            }}
          />
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          {t("uploadHint") || "PDF files only · Max 20MB · Files are encrypted and auto-deleted after processing"}
        </p>
      </div>
    </section>
  );
}
