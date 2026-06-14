'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const errors: { password?: string; confirm?: string } = {};
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Must be at least 8 characters';
    if (!confirmPassword) errors.confirm = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirm = 'Passwords do not match';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? 'Failed to reset password');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setApiError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="banner banner-danger" role="alert">
        This reset link is invalid or incomplete. Please request a new one from the{' '}
        <Link href="/forgot-password" style={{ color: 'var(--accent)', fontWeight: 500 }}>
          forgot password
        </Link>{' '}
        page.
      </div>
    );
  }

  if (done) {
    return (
      <div className="banner banner-success" role="status">
        Your password has been reset. Redirecting you to sign in…
      </div>
    );
  }

  return (
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
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>New password</div>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((p) => ({ ...p, password: undefined, confirm: undefined }));
            }}
            placeholder="At least 8 characters"
            aria-invalid={!!fieldErrors.password}
            required
            autoFocus
          />
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
        </label>
        <label>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Confirm new password</div>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setFieldErrors((p) => ({ ...p, confirm: undefined }));
            }}
            placeholder="Re-enter your password"
            aria-invalid={!!fieldErrors.confirm}
            required
          />
          {fieldErrors.confirm && <p className="field-error">{fieldErrors.confirm}</p>}
        </label>
        <button type="submit" className="primary" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span style={{ fontSize: 36 }}>🔑</span>
          <h1 style={{ margin: '8px 0 4px', fontSize: 24 }}>Choose a new password</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Set a new password for your account
          </p>
        </div>

        <Suspense fallback={<p className="muted">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
