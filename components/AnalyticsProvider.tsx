"use client";

import { useEffect } from "react";
import { initLogRocket, identifyUser } from "@/lib/logrocket";
import { initDatadog, setUser } from "@/lib/datadog";

interface AnalyticsProviderProps {
  userId?: string;
  userInfo?: {
    email?: string;
    name?: string;
    subscriptionStatus?: string;
    createdAt?: Date;
  };
}

export default function AnalyticsProvider({ 
  userId, 
  userInfo 
}: AnalyticsProviderProps) {
  useEffect(() => {
    // Initialize analytics services
    initLogRocket();
    initDatadog();
  }, []);

  // Identify user when they log in
  useEffect(() => {
    if (userId && userInfo) {
      const userData: Record<string, string> = {};
      if (userInfo.email) userData.email = userInfo.email;
      if (userInfo.name) userData.name = userInfo.name;
      if (userInfo.subscriptionStatus) userData.subscriptionStatus = userInfo.subscriptionStatus;
      
      identifyUser(userId, userData);
      setUser({
        id: userId,
        email: userInfo.email,
        name: userInfo.name,
        subscriptionStatus: userInfo.subscriptionStatus,
      });
    }
  }, [userId, userInfo]);

  return null;
}
