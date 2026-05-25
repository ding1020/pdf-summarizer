"use client";

import { useEffect, useState } from "react";

interface AnalyticsWrapperProps {
  userId: string | null;
}

export default function AnalyticsWrapper({ userId }: AnalyticsWrapperProps) {
  const [userInfo, setUserInfo] = useState<{
    email?: string;
    name?: string;
    subscriptionStatus?: string;
    createdAt?: Date;
  } | null>(null);

  const [AnalyticsProvider, setAnalyticsProvider] = useState<React.ComponentType<{
    userId?: string;
    userInfo?: {
      email?: string;
      name?: string;
      subscriptionStatus?: string;
      createdAt?: Date;
    };
  }> | null>(null);

  useEffect(() => {
    // Fetch user info if userId is provided
    async function fetchUserInfo() {
      if (!userId) {
        setUserInfo(null);
        return;
      }

      try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUserInfo({
            email: data.email,
            name: data.name,
            subscriptionStatus: data.subscriptionStatus,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
          });
        }
      } catch {
        // Ignore errors in demo mode
      }
    }

    fetchUserInfo();
  }, [userId]);

  useEffect(() => {
    // Dynamic import AnalyticsProvider
    import("./AnalyticsProvider").then((module) => {
      setAnalyticsProvider(() => module.default);
    }).catch(() => {
      // Analytics not available, continue without it
    });
  }, []);

  if (!AnalyticsProvider) {
    return null;
  }

  return (
    <AnalyticsProvider
      userId={userId || undefined}
      userInfo={userInfo || undefined}
    />
  );
}
