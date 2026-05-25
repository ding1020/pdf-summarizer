import { describe, it, expect } from 'vitest';
import { RATE_LIMITS, getClientIdentifier, rateLimit } from '../lib/rate-limit';

describe('Rate Limit', () => {
  describe('RATE_LIMITS', () => {
    it('should have free tier limits', () => {
      expect(RATE_LIMITS.free).toBeDefined();
      expect(RATE_LIMITS.free.windowMs).toBe(60000); // 1 minute
      expect(RATE_LIMITS.free.maxRequests).toBe(20);
    });

    it('should have pro tier limits', () => {
      expect(RATE_LIMITS.pro).toBeDefined();
      expect(RATE_LIMITS.pro.windowMs).toBe(60000); // 1 minute
      expect(RATE_LIMITS.pro.maxRequests).toBe(60);
    });

    it('should have auth tier limits', () => {
      expect(RATE_LIMITS.auth).toBeDefined();
      expect(RATE_LIMITS.auth.maxRequests).toBe(10);
    });

    it('should have checkout tier limits', () => {
      expect(RATE_LIMITS.checkout).toBeDefined();
      expect(RATE_LIMITS.checkout.maxRequests).toBe(5);
    });
  });

  describe('getClientIdentifier', () => {
    it('should generate identifier from userId', () => {
      const identifier = getClientIdentifier('user-123');
      expect(identifier).toBe('user:user-123');
    });

    it('should include IP when userId is not provided', () => {
      const identifier = getClientIdentifier(undefined, '192.168.1.1');
      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should handle null userId', () => {
      const identifier = getClientIdentifier(null, '192.168.1.1');
      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should handle anonymous users', () => {
      const identifier = getClientIdentifier();
      expect(identifier).toBe('ip:anonymous');
    });
  });

  describe('rateLimit', () => {
    it('should allow requests within limit', () => {
      const result = rateLimit('test-user', RATE_LIMITS.free);

      expect(result.success).toBe(true);
      expect(result.remaining).toBeLessThan(RATE_LIMITS.free.maxRequests);
    });

    it('should return resetTime in the future', () => {
      const result = rateLimit('test-user', RATE_LIMITS.free);

      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });
});
