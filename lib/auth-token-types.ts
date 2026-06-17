/**
 * Shared auth token type definition.
 * Import this in both Node.js (auth-token.ts) and Edge (auth-token-edge.ts) runtimes.
 */
export interface AuthToken {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  iat: number;
  exp: number;
}
