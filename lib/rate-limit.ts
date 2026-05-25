/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API routes
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

// In-memory store (resets on server restart - suitable for serverless)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Track cleanup interval ID for cleanup
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

function getCleanupInterval() {
  // Return existing interval or create new one
  if (cleanupIntervalId === null) {
    // Only start cleanup in non-serverless environments (Node.js runtime)
    if (typeof globalThis !== 'undefined' && !process.env.VERCEL) {
      cleanupIntervalId = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
          if (entry.resetTime < now) {
            rateLimitStore.delete(key);
          }
        }
      }, 60000);
    }
  }
  return cleanupIntervalId;
}

// Initialize cleanup on module load (will be a no-op in serverless)
if (typeof globalThis !== 'undefined') {
  getCleanupInterval();
}

export function rateLimit(identifier: string, config: RateLimitConfig): { 
  success: boolean; 
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
  let entry = rateLimitStore.get(key);
  
  // Initialize or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;
  
  return {
    success,
    remaining,
    resetTime: entry.resetTime,
  };
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Stricter for free users: 20 requests per minute
  free: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
  // More generous for pro users: 60 requests per minute
  pro: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
  // Very strict for auth endpoints: 10 per minute
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  // Checkout: 5 per minute
  checkout: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },
};

// Helper to get client identifier (IP + userId if available)
export function getClientIdentifier(userId?: string | null, ip?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${ip || 'anonymous'}`;
}

// HTTP headers for rate limit response
export function getRateLimitHeaders(result: { remaining: number; resetTime: number }) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };
}
