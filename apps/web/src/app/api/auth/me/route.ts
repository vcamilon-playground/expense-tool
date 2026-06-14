import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const payload = await verifySession(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 401 });

  // Try with preference columns first; fall back to basic query if migration hasn't been run yet
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, email, first_name, last_name, profile_picture_url, birth_date, accent_color, theme')
    .eq('id', payload.sub)
    .single();

  if (!user) {
    const { data: basicUser, error: basicError } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, profile_picture_url, birth_date')
      .eq('id', payload.sub)
      .single();
    if (basicError || !basicUser) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: basicUser });
  }

  if (error) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({ user });
}
