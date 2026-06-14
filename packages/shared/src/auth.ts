// Auth helpers shared between the web client (form validation) and the
// server routes (register / login / password reset) so both agree on what a
// valid email is and how it is normalized.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 254 && EMAIL_RE.test(normalized);
}

// An identifier typed into the login field is treated as an email only when it
// contains an "@"; otherwise it is looked up as a username.
export function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@');
}
