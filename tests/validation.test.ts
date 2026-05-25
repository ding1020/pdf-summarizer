import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  formatZodError,
} from '../lib/validation';

const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().positive(),
});

// Query schema that accepts strings (URL params are always strings)
const querySchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().positive(),
});

describe('validateBody', () => {
  it('should return success with valid data', () => {
    const result = validateBody(testSchema, {
      name: 'John',
      age: 25,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: 'John',
        age: 25,
      });
    }
  });

  it('should return error response for invalid data', () => {
    const result = validateBody(testSchema, {
      name: '',
      age: -5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const response = result.error;
      expect(response.status).toBe(400);
    }
  });

  it('should format Zod errors correctly', async () => {
    const result = validateBody(testSchema, {
      name: '',
      age: -5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const response = await result.error.json();
      expect(response.error).toBe('Validation failed');
      expect(response.details).toBeDefined();
    }
  });
});

describe('validateQuery', () => {
  it('should validate query parameters with coercion', () => {
    const params = new URLSearchParams({
      name: 'John',
      age: '25',
    });

    const result = validateQuery(querySchema, params);
    expect(result.success).toBe(true);
  });

  it('should reject invalid query parameters', () => {
    const params = new URLSearchParams({
      name: '',
      age: '-5',
    });

    const result = validateQuery(querySchema, params);
    expect(result.success).toBe(false);
  });
});

describe('formatZodError', () => {
  it('should format Zod errors into readable object', () => {
    const result = testSchema.safeParse({
      name: '',
      age: -5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted.name).toBeDefined();
      expect(formatted.age).toBeDefined();
    }
  });

  it('should handle nested paths', () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string().min(1, 'Name is required'),
      }),
    });

    const result = nestedSchema.safeParse({
      user: { name: '' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted['user.name']).toBeDefined();
    }
  });
});
