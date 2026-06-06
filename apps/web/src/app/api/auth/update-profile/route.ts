import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { first_name, last_name, birth_date, profile_picture_url, accent_color, theme } = await req.json();

    const patch: Record<string, unknown> = {};
    if (first_name !== undefined) patch.first_name = first_name.trim();
    if (last_name !== undefined) patch.last_name = last_name.trim();
    if (birth_date !== undefined) patch.birth_date = birth_date || null;
    if (profile_picture_url !== undefined) patch.profile_picture_url = profile_picture_url || null;
    if (accent_color !== undefined) patch.accent_color = accent_color;
    if (theme !== undefined) patch.theme = theme;

    const { data: user, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', payload.sub)
      .select('id, username, first_name, last_name, profile_picture_url, birth_date, accent_color, theme')
      .single();

    if (error || !user) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
