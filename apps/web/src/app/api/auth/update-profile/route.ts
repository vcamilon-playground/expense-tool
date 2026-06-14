import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isValidEmail, normalizeEmail } from '@expense/shared';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { first_name, last_name, birth_date, profile_picture_url, accent_color, theme, email } =
      await req.json();

    // Core profile fields — always exist in the schema.
    const corePatch: Record<string, unknown> = {};
    if (first_name !== undefined) corePatch.first_name = first_name.trim();
    if (last_name !== undefined) corePatch.last_name = last_name.trim();
    if (birth_date !== undefined) corePatch.birth_date = birth_date || null;
    if (profile_picture_url !== undefined) corePatch.profile_picture_url = profile_picture_url || null;

    // Migrated columns — only exist once the matching migration has been run,
    // so they share the graceful fallback below.
    const appearancePatch: Record<string, unknown> = {};
    if (accent_color !== undefined) appearancePatch.accent_color = accent_color;
    if (theme !== undefined) appearancePatch.theme = theme;

    if (email !== undefined) {
      // Coalesce empty/whitespace-only input to null so we never store "".
      const cleanEmail = email ? normalizeEmail(email) || null : null;
      if (cleanEmail && !isValidEmail(cleanEmail)) {
        return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
      }
      if (cleanEmail) {
        const { data: taken } = await supabase
          .from('users')
          .select('id')
          .ilike('email', cleanEmail)
          .neq('id', payload.sub)
          .single();
        if (taken) {
          return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
        }
      }
      appearancePatch.email = cleanEmail;
    }

    const cols = 'id, username, first_name, last_name, profile_picture_url, birth_date';

    // Try the full update first; if the appearance columns don't exist yet,
    // fall back to updating only the core fields so the profile still saves.
    let { data: user, error } = await supabase
      .from('users')
      .update({ ...corePatch, ...appearancePatch })
      .eq('id', payload.sub)
      .select(cols)
      .single();

    if (error && Object.keys(appearancePatch).length > 0) {
      if (Object.keys(corePatch).length > 0) {
        ({ data: user, error } = await supabase
          .from('users')
          .update(corePatch)
          .eq('id', payload.sub)
          .select(cols)
          .single());
      } else {
        // Nothing but appearance fields were sent and those columns are missing —
        // just return the current row (theme/accent still applies client-side).
        ({ data: user, error } = await supabase
          .from('users')
          .select(cols)
          .eq('id', payload.sub)
          .single());
      }
    }

    if (error || !user) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
