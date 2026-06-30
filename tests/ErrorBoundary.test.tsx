import { describe, it, expect, vi } from 'vitest';

// Mock @/navigation to avoid next-intl routing issues in vitest
vi.mock('@/navigation', () => ({
  Link: ({ children, className }: Record<string, unknown>) => null,
}));

describe('ErrorBoundary Component', () => {
  it('should be importable', async () => {
    const { default: ErrorBoundary } = await import('../components/ErrorBoundary');
    expect(ErrorBoundary).toBeDefined();
  });

  it('should be a valid React component class', async () => {
    const { default: ErrorBoundary } = await import('../components/ErrorBoundary');
    // React class component extends Component, so it's a function
    expect(typeof ErrorBoundary).toBe('function');
  });
});
