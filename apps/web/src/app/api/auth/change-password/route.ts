import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { current_password, new_password } = await req.json();
    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', payload.sub)
      .single();

    if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

    const password_hash = await bcrypt.hash(new_password, 12);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', payload.sub);

    if (updateError) return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
