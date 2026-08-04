"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Extract CSRF token from browser cookie for POST requests */
function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("__csrf_token="))
    ?.split("=")[1];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const mountedRef = useRef(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (mountedRef.current) {
        setUser(data.signedIn ? data.user : null);
      }
    } catch {
      if (mountedRef.current) {
        setUser(null);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoaded(true);
      }
    }
  }, []);

  // Initial auth check - run once on mount
  // Inline async function avoids ESLint react-hooks/set-state-in-effect warning
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;

    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (mounted) {
          setUser(data.signedIn ? data.user : null);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoaded(true);
        }
      }
    }

    loadUser();
    return () => {
      mounted = false;
      mountedRef.current = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchUser();
        return { success: true };
      }
      return { success: false, error: data.error || "Sign in failed" };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  }, [fetchUser]);

  const signUp = useCallback(async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await res.json();
      if (data.success) {
        // If auto sign-in succeeded (cookie set by server), refresh user state
        if (data.autoSignedIn) {
          await fetchUser();
        } else {
          // Fallback: try manual sign-in
          const csrfToken2 = getCsrfToken();
          const signInRes = await fetch("/api/auth/sign-in", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(csrfToken2 ? { "X-CSRF-Token": csrfToken2 } : {}),
            },
            body: JSON.stringify({ email, password }),
          });
          const signInData = await signInRes.json();
          if (signInData.success) {
            await fetchUser();
          }
        }
        return { success: true };
      }
      return { success: false, error: data.error || "Sign up failed" };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    try {
      const csrfToken = getCsrfToken();
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
      });
    } catch {
      // Even if sign-out API fails, clear local state
    }
    if (mountedRef.current) {
      setUser(null);
      setIsLoaded(true);
    }
    router.push("/");
  }, [router]);

  const refresh = useCallback(async () => {
    if (mountedRef.current) {
      setIsLoaded(false);
    }
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn: !!user,
        signIn,
        signUp,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
