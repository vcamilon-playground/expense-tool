import { NextResponse } from 'next/server';
import { isValidEmail, normalizeEmail } from '@expense/shared';
import { supabase } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/notify';
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from '@/lib/reset-token';

// Generic response — identical whether or not the email maps to an account, so
// this endpoint can't be used to enumerate which emails are registered.
const GENERIC = { ok: true, message: 'If that email is registered, a reset link is on its way.' };

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name')
      .ilike('email', cleanEmail)
      .single();

    if (user) {
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

      const { error } = await supabase
        .from('users')
        .update({ reset_token_hash: hashResetToken(token), reset_token_expires_at: expiresAt })
        .eq('id', user.id);

      if (!error) {
        const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
        const resetUrl = `${base}/reset-password?token=${token}`;
        try {
          await sendPasswordResetEmail(user.email, resetUrl, user.first_name);
        } catch (sendError) {
          console.error('[forgot-password] send failed', sendError);
        }
      }
    }

    return NextResponse.json(GENERIC);
  } catch {
    // Even on unexpected failure, stay generic to avoid leaking state.
    return NextResponse.json(GENERIC);
  }
}
