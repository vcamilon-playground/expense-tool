import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isValidEmail, normalizeEmail } from '@expense/shared';
import { supabase } from '@/lib/supabase';
import { signSession, checkAuthSecret, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Validate server config before any DB writes so we never create
    // a user that cannot be issued a session token.
    checkAuthSecret();

    const { username, email, password, first_name, last_name, birth_date, profile_picture_url } =
      await req.json();

    if (!username || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Username, password, first name, and last name are required' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters: letters, numbers, underscores only' },
        { status: 400 },
      );
    }

    // Email is optional, but when present it must be valid and unique.
    const cleanEmail = email ? normalizeEmail(email) : null;
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', clean)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    if (cleanEmail) {
      const { data: emailTaken } = await supabase
        .from('users')
        .select('id')
        .ilike('email', cleanEmail)
        .single();
      if (emailTaken) {
        return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
      }
    }

    const password_hash = await bcrypt.hash(password, 12);

    const insertRow = {
      username: clean,
      email: cleanEmail,
      password_hash,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      birth_date: birth_date || null,
      profile_picture_url: profile_picture_url || null,
    };
    const selectCols = 'id, username, email, first_name, last_name, profile_picture_url, birth_date';

    let { data: user, error } = await supabase
      .from('users')
      .insert(insertRow)
      .select(selectCols)
      .single();

    // Fall back gracefully if the email migration has not been run yet.
    if (error) {
      const { email: _droppedEmail, ...withoutEmail } = insertRow;
      ({ data: user, error } = await supabase
        .from('users')
        .insert(withoutEmail)
        .select('id, username, first_name, last_name, profile_picture_url, birth_date')
        .single());
    }

    if (error || !user) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Seed default categories for this new user via the Postgres function
    await supabase.rpc('seed_default_categories', { p_user_id: user.id });

    const token = await signSession({ sub: user.id, username: user.username });

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
