/**
 * Shared auth token type definition.
 * Import this in both Node.js (auth-token.ts) and Edge (auth-token-edge.ts) runtimes.
 *
 * The `ver` field is used for token revocation: it must match the user's
 * `tokenVersion` in the database. Incrementing `tokenVersion` invalidates
 * all previously-issued tokens.
 */
export interface AuthToken {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  iat: number;
  exp: number;
  ver?: number; // Token version — must match User.tokenVersion for revocation
}
