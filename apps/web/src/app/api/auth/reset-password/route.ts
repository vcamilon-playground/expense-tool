import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { hashResetToken } from '@/lib/reset-token';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, reset_token_expires_at')
      .eq('reset_token_hash', hashResetToken(token))
      .single();

    if (!user || !user.reset_token_expires_at || new Date(user.reset_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const { error } = await supabase
      .from('users')
      .update({ password_hash, reset_token_hash: null, reset_token_expires_at: null })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
