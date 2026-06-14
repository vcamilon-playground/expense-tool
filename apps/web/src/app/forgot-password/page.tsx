'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isValidEmail } from '@expense/shared';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    if (!email.trim() || !isValidEmail(email)) {
      setFieldError('Enter a valid email address');
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setApiError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span style={{ fontSize: 36 }}>🔑</span>
          <h1 style={{ margin: '8px 0 4px', fontSize: 24 }}>Reset password</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            We&apos;ll email you a link to set a new one
          </p>
        </div>

        {sent ? (
          <div className="banner banner-success" role="status" style={{ marginBottom: 16 }}>
            If that email is registered, a reset link is on its way. Check your inbox (and spam
            folder).
          </div>
        ) : (
          <>
            {apiError && (
              <div className="banner banner-danger" role="alert" style={{ marginBottom: 16 }}>
                {apiError}
              </div>
            )}
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <label>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Email</div>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError(null);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={!!fieldError}
                  required
                  autoFocus
                />
                {fieldError && <p className="field-error">{fieldError}</p>}
              </label>
              <button type="submit" className="primary" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
