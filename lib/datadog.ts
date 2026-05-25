/**
 * Datadog RUM (Real User Monitoring) Integration
 * Performance monitoring and user analytics
 * 
 * Docs: https://docs.datadoghq.com/real_user_monitoring/
 */

import { datadogRum } from "@datadog/browser-rum";

let isInitialized = false;

export function initDatadog() {
  if (isInitialized || typeof window === "undefined") return;
  
  const appId = process.env.NEXT_PUBLIC_DATADOG_APP_ID;
  const clientToken = process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN;
  
  if (!appId || !clientToken) {
    console.warn("Datadog App ID or Client Token not configured");
    return;
  }

  try {
    datadogRum.init({
      applicationId: appId,
      clientToken: clientToken,
      
      // Site configuration (US1, US3, US5, EU1, AP1)
      site: "datadoghq.com",
      
      // Service name
      service: "pdf-summarizer",
      
      // Environment
      env: process.env.NODE_ENV || "development",
      
      // Session replay
      sessionSampleRate: 10, // 10% of sessions
      
      // Performance tracking
      trackResources: true,
      trackLongTasks: true,
      
      // Privacy settings
      defaultPrivacyLevel: "mask-user-input",
    });

    // Start session replay recording
    datadogRum.startSessionReplayRecording();

    isInitialized = true;
    console.log("Datadog RUM initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Datadog RUM:", error);
  }
}

/**
 * Add custom user information
 */
export function setUser(user: {
  id: string;
  email?: string;
  name?: string;
  subscriptionStatus?: string;
}) {
  if (!isInitialized) return;
  
  datadogRum.setUser({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}

/**
 * Add global context
 */
export function setGlobalContext(context: Record<string, string | number | boolean>) {
  if (!isInitialized) return;
  
  datadogRum.setGlobalContext(context);
}

/**
 * Track errors manually
 */
export function trackError(error: Error, context?: Record<string, string | number | boolean>) {
  if (!isInitialized) return;
  
  datadogRum.addError(error, {
    source: "custom",
    ...context,
  });
}

/**
 * Get Datadog RUM instance for advanced usage
 */
export function getDatadogRum() {
  return datadogRum;
}

export default datadogRum;
