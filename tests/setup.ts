import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @clerk/nextjs
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-id' })),
  currentUser: vi.fn(() => Promise.resolve({
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
}));

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-id' })),
  currentUser: vi.fn(() => Promise.resolve({
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
  clerkClient: vi.fn(() => Promise.resolve({
    users: {
      createUser: vi.fn(() => Promise.resolve({ id: 'test-user-id' })),
    },
    signInTokens: {
      create: vi.fn(() => Promise.resolve({ token: 'test-token' })),
    },
  })),
  clerkMiddleware: vi.fn((handler: any) => handler),
}));

// Mock auth hook
vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      imageUrl: null,
    },
    isLoaded: true,
    isSignedIn: true,
    signIn: vi.fn(() => Promise.resolve({ success: true })),
    signUp: vi.fn(() => Promise.resolve({ success: true })),
    signOut: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
