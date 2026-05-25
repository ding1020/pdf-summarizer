/**
 * LogRocket Integration
 * Session replay and analytics for web applications
 * 
 * Docs: https://docs.logrocket.com/
 */

import LogRocket from "logrocket";

let isInitialized = false;

export function initLogRocket() {
  if (isInitialized || typeof window === "undefined") return;
  
  const appId = process.env.NEXT_PUBLIC_LOGROCKET_ID;
  
  if (!appId) {
    console.warn("LogRocket App ID not configured");
    return;
  }

  try {
    LogRocket.init(appId, {
      // Network request capturing
      network: {
        isEnabled: true,
      },
    });

    isInitialized = true;
    console.log("LogRocket initialized successfully");
  } catch (error) {
    console.error("Failed to initialize LogRocket:", error);
  }
}

/**
 * Identify authenticated user for LogRocket
 */
export function identifyUser(userId: string, userInfo?: Record<string, string | number | boolean>) {
  if (!isInitialized) return;
  
  LogRocket.identify(userId, userInfo as Record<string, string>);
}

/**
 * Track custom events
 */
export function trackEvent(eventName: string, properties?: Record<string, string | number | boolean>) {
  if (!isInitialized) return;
  
  LogRocket.track(eventName, properties as Record<string, string>);
}

/**
 * Get LogRocket instance for advanced usage
 */