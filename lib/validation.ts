import { z, ZodSchema, ZodError } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: NextResponse } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const error = formatZodError(result.error);
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Format Zod error into a readable object
 */
export function formatZodError(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });

  return formatted;
}

/**
 * Validate and parse query parameters
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  params: URLSearchParams
): { success: true; data: T } | { success: false; error: NextResponse } {
  const rawData = Object.fromEntries(params.entries());
  const result = schema.safeParse(rawData);

  if (!result.success) {
    const error = formatZodError(result.error);
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid query parameters', details: error },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Create a validated API handler wrapper
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (data: T) => Promise<NextResponse>
) {
  return async (body: unknown): Promise<NextResponse> => {
    const result = validateBody(schema, body);

    if (!result.success) {
      return result.error;
    }

    return handler(result.data);
  };
}
