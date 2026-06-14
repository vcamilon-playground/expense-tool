import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { looksLikeEmail, normalizeEmail } from '@expense/shared';
import { supabase } from '@/lib/supabase';
import { signSession, checkAuthSecret, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    checkAuthSecret();
    const body = await req.json();
    // `identifier` accepts a username or an email; `username` is kept for
    // backward compatibility with older clients.
    const identifier: string = (body.identifier ?? body.username ?? '').trim();
    const password: string = body.password;
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username or email and password are required' },
        { status: 400 },
      );
    }

    const cols = 'id, username, first_name, last_name, profile_picture_url, birth_date, password_hash';
    const query = looksLikeEmail(identifier)
      ? supabase.from('users').select(cols).ilike('email', normalizeEmail(identifier))
      : supabase.from('users').select(cols).eq('username', identifier.toLowerCase());

    const { data: user, error } = await query.single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await signSession({ sub: user.id, username: user.username });

    const { password_hash: _, ...safeUser } = user;
    const response = NextResponse.json({ user: safeUser });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
