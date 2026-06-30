import { describe, it, expect } from 'vitest';
import {
  uploadSchema,
  summarizeSchema,
  logEntrySchema,
  userUpdateSchema,
  paginationSchema,
  documentQuerySchema,
} from '../lib/schemas';

describe('Upload Schema', () => {
  it('should accept a valid PDF file', () => {
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    });
    const result = uploadSchema.safeParse({ file });
    expect(result.success).toBe(true);
  });

  it('should reject non-PDF files', () => {
    const file = new File(['test content'], 'test.txt', {
      type: 'text/plain',
    });
    const result = uploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
  });

  it('should reject files larger than 20MB', () => {
    const largeContent = new Array(21 * 1024 * 1024).join('x');
    const file = new File([largeContent], 'large.pdf', {
      type: 'application/pdf',
    });
    const result = uploadSchema.safeParse({ file });
    expect(result.success).toBe(false);
  });
});

describe('Summarize Schema', () => {
  it('should accept valid summarize input', () => {
    const input = {
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Test document content',
    };
    const result = summarizeSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should use default provider and language', () => {
    const input = {
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Test document content',
    };
    const result = summarizeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('deepseek');
      expect(result.data.language).toBe('multilingual');
    }
  });

  it('should reject invalid document ID', () => {
    const input = {
      documentId: 'not-a-uuid',
      content: 'Test content',
    };
    const result = summarizeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept empty content (content is optional)', () => {
    const input = {
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
    };
    const result = summarizeSchema.safeParse(input);
    // content is optional — empty string is valid
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider', () => {
    const input = {
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Test content',
      provider: 'invalid',
    };
    const result = summarizeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('Log Entry Schema', () => {
  it('should accept valid log entry', () => {
    const input = {
      message: 'Test log message',
    };
    const result = logEntrySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should set default values', () => {
    const input = {
      message: 'Test log message',
    };
    const result = logEntrySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.level).toBe('info');
      expect(result.data.context).toEqual({});
    }
  });

  it('should reject empty message', () => {
    const input = {
      message: '',
    };
    const result = logEntrySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept valid levels', () => {
    const levels = ['debug', 'info', 'warn', 'error'];
    for (const level of levels) {
      const result = logEntrySchema.safeParse({
        message: 'Test',
        level,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('User Update Schema', () => {
  it('should accept valid email', () => {
    const result = userUpdateSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = userUpdateSchema.safeParse({
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid subscription status', () => {
    const result = userUpdateSchema.safeParse({
      subscriptionStatus: 'pro',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid subscription status', () => {
    const result = userUpdateSchema.safeParse({
      subscriptionStatus: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('Pagination Schema', () => {
  it('should use default values', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should coerce string numbers', () => {
    const result = paginationSchema.safeParse({
      page: '2',
      limit: '50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should reject negative page', () => {
    const result = paginationSchema.safeParse({
      page: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit over 100', () => {
    const result = paginationSchema.safeParse({
      limit: 150,
    });
    expect(result.success).toBe(false);
  });
});

describe('Document Query Schema', () => {
  it('should accept valid status filter', () => {
    const result = documentQuerySchema.safeParse({
      status: 'completed',
    });
    expect(result.success).toBe(true);
  });

  it('should accept combined pagination and filter', () => {
    const result = documentQuerySchema.safeParse({
      page: 2,
      limit: 10,
      status: 'processing',
    });
    expect(result.success).toBe(true);
  });
});
