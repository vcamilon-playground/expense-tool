'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      await refresh();
      router.push('/');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span style={{ fontSize: 36 }}>💸</span>
          <h1 style={{ margin: '8px 0 4px', fontSize: 24 }}>Expense Tool</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Sign in to your account</p>
        </div>

        {error && (
          <div className="banner banner-danger" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Username or email</div>
            <input
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="your_username or you@example.com"
              required
              autoFocus
            />
          </label>

          <label>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Password</div>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button
            type="submit"
            className="primary"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Create one
          </Link>
        </p>

        <p style={{ textAlign: 'center', fontSize: 13, marginTop: 8 }}>
          <Link href="/forgot-password" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
