/**
 * Redis Client Configuration
 * Used for production rate limiting and caching
 */

import Redis from "ioredis";

let redisClient: Redis | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

export async function getRedisClient(): Promise<Redis | null> {
  // Check if Redis is enabled
  if (process.env.REDIS_ENABLED !== "true") {
    return null;
  }

  // Return existing connection
  if (redisClient) {
    return redisClient;
  }

  // Prevent multiple simultaneous connection attempts
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.warn("Redis connection attempts exhausted, skipping");
    return null;
  }

  connectionAttempts++;

  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    // Test connection
    await redisClient.ping();
    console.log("Redis connected successfully");

    // Handle connection events
    redisClient.on("error", (error: Error) => {
      console.error("Redis error:", error);
    });

    redisClient.on("close", () => {
      console.log("Redis connection closed");
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    redisClient = null;
    return null;
  }
}

// Lazy getter for backward compatibility
export const redis = {
  async getClient() {
    return getRedisClient();
  },
  
  async ping(): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;
    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  },
  
  async get(key: string): Promise<string | null> {
    const client = await getRedisClient();
    if (!client) return null;
    return client.get(key);
  },
  
  async set(key: string, value: string, ttlMs?: number): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;
    if (ttlMs) {
      await client.set(key, value, "PX", ttlMs);
    } else {
      await client.set(key, value);
    }
    return true;
  },
  
  async del(key: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;
    await client.del(key);
    return true;
  },

  // Rate limiting specific methods
  async zadd(key: string, score: number, member: string): Promise<number> {
    const client = await getRedisClient();
    if (!client) return 0;
    return client.zadd(key, score, member);
  },

  async zcard(key: string): Promise<number> {
    const client = await getRedisClient();
    if (!client) return 0;
    return client.zcard(key);
  },

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const client = await getRedisClient();
    if (!client) return 0;
    return client.zremrangebyscore(key, min, max);
  },

  async pexpire(key: string, milliseconds: number): Promise<number> {
    const client = await getRedisClient();
    if (!client) return 0;
    return client.pexpire(key, milliseconds);
  },

  async pipeline() {
    const client = await getRedisClient();
    if (!client) return null;
    return client.pipeline();
  },
};

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log("Redis connection closed gracefully");
  }
}
