"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { useAuth } from "@/hooks/useAuth";

function GuestButtons({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-center gap-4">
      <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
        {t("common.signIn")}
      </Link>
      <Link href="/sign-up" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
        {t("common.signUp")}
      </Link>
    </div>
  );
}

export default function AuthButtonsClient() {
  const t = useTranslations();
  const { isLoaded, isSignedIn, user } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 bg-gray-100 animate-pulse rounded-lg" />
        <div className="h-9 w-20 bg-gray-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <GuestButtons t={t} />;
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        {t("nav.dashboard")}
      </Link>
      <div className="flex items-center gap-2">
        {user?.imageUrl ? (
          <Image src={user.imageUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
      </div>
    </div>
  );
}
