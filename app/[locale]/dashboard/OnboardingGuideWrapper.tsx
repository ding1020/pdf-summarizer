"use client";

import { useAuth } from "@/hooks/useAuth";
import OnboardingGuide from "@/components/OnboardingGuide";

export default function OnboardingGuideWrapper() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  return <OnboardingGuide visible={!!isSignedIn} />;
}
