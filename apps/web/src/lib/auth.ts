import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'et_session';
const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET env var is not set');
  return new TextEncoder().encode(secret);
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
