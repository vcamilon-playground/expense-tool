import { createHash, randomBytes } from 'crypto';

// Password-reset token helpers. Kept out of lib/auth.ts because that module is
// imported by the edge middleware, which cannot bundle node:crypto.

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// High-entropy URL-safe token sent in the reset link.
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

// Deterministic hash stored in the DB so we can look a token up directly
// (unsalted SHA-256 is fine for a single-use, short-lived, high-entropy token).
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
