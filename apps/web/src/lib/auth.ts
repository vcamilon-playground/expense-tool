import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'et_session';
const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET env var is not set');
    }
    // Dev-only fallback — avoids crashing when .env.local is missing the var
    return new TextEncoder().encode('dev-fallback-secret-set-AUTH_SECRET-in-env-local');
  }
  return new TextEncoder().encode(secret);
}

export function checkAuthSecret(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
    throw new Error('AUTH_SECRET env var is not set');
  }
}

export type SessionPayload = {
  sub: string; // user id
  username: string;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { sub: payload.sub as string, username: payload['username'] as string };
  } catch {
    return null;
  }
}
