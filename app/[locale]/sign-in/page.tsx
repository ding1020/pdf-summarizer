"use client";

import { SignIn } from "@clerk/nextjs";
import { useParams } from "next/navigation";

export default function SignInPage() {
  const { locale } = useParams() as { locale: string };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <SignIn
        signUpUrl={`/${locale}/sign-up`}
        forceRedirectUrl={`/${locale}/dashboard`}
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
            card: "shadow-lg rounded-2xl",
            headerTitle: "text-xl font-bold",
            socialButtonsBlockButton:
              "border-gray-300 hover:bg-gray-50",
          },
        }}
      />
    </div>
  );
}
