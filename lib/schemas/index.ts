import { z } from 'zod';

// Upload validation schema
export const uploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'File is required' })
    .refine((file) => file.type === 'application/pdf', {
      message: 'Only PDF files are allowed',
    })
    .refine((file) => file.size <= 20 * 1024 * 1024, {
      message: 'File size must be less than 20MB',
    }),
});

export type UploadInput = z.infer<typeof uploadSchema>;

// Summarize validation schema
export const summarizeSchema = z.object({
  documentId: z
    .string()
    .uuid({ message: 'Invalid document ID' }),
  content: z
    .string()
    .min(1, { message: 'Content is required' })
    .max(100000, { message: 'Content too long' }),
  provider: z
    .enum(['deepseek', 'groq', 'siliconflow'])
    .optional()
    .default('deepseek'),
  language: z
    .enum(['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'multilingual'])
    .optional()
    .default('multilingual'),
});

export type SummarizeInput = z.infer<typeof summarizeSchema>;

// Log entry validation schema
export const logEntrySchema = z.object({
  timestamp: z.string().datetime().optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),
  message: z.string().min(1, { message: 'Message is required' }),
  context: z.record(z.unknown()).optional().default({}),
});

export type LogEntryInput = z.infer<typeof logEntrySchema>;

// User update validation schema
export const userUpdateSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }).optional(),
  subscriptionStatus: z.enum(['free', 'pro', 'enterprise']).optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// Pagination query schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// Document query schema
export const documentQuerySchema = paginationSchema.extend({
  status: z.enum(['processing', 'completed', 'failed']).optional(),
});

export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;

// Feedback submission schema
export const feedbackSchema = z.object({
  category: z
    .enum(['general', 'bug', 'feature', 'billing'], {
      message: 'Category must be one of: general, bug, feature, billing',
    })
    .optional()
    .default('general'),
  message: z
    .string()
    .min(10, { message: 'Message must be at least 10 characters' })
    .max(2000, { message: 'Message must be under 2000 characters' }),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

// Health check response schema
export const healthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
  services: z.object({
    database: z.boolean(),
    redis: z.boolean(),
    ai: z.boolean(),
  }),
  uptime: z.number(),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
