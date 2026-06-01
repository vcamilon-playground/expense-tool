'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    confirm_password: '',
    birth_date: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { refresh } = useAuth();

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile picture must be under 2 MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(userId: string): Promise<string | null> {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split('.').pop();
    const path = `${userId}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, {
      upsert: true,
      contentType: avatarFile.type,
    });
    if (error) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      // Register without avatar first to get user id
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          birth_date: form.birth_date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return;
      }

      // Upload avatar if provided, then update profile
      if (avatarFile && data.user?.id) {
        const avatarUrl = await uploadAvatar(data.user.id);
        if (avatarUrl) {
          await fetch('/api/auth/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_picture_url: avatarUrl }),
          });
        }
      }

      await refresh();
      router.push('/');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span style={{ fontSize: 36 }}>💸</span>
          <h1 style={{ margin: '8px 0 4px', fontSize: 24 }}>Create Account</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Join the Expense Tool</p>
        </div>

        {error && (
          <div className="banner banner-danger" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Avatar upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'var(--panel-2)',
                border: '2px dashed var(--border)',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '👤'
              )}
            </div>
            <button
              type="button"
              className="ghost"
              style={{ width: 'auto', padding: '4px 12px', fontSize: 13 }}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? 'Change photo' : 'Upload photo (optional)'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="grid cols-2" style={{ gap: 10 }}>
            <label>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>First Name</div>
              <input
                type="text"
                autoComplete="given-name"
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                placeholder="Jane"
                required
              />
            </label>
            <label>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Last Name</div>
              <input
                type="text"
                autoComplete="family-name"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                placeholder="Doe"
                required
              />
            </label>
          </div>

          <label>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Username</div>
            <input
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="jane_doe (letters, numbers, _)"
              required
            />
          </label>

          <label>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              Birth Date{' '}
              <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(optional)</span>
            </div>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => set('birth_date', e.target.value)}
            />
          </label>

          <label>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Password</div>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </label>

          <label>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Confirm Password</div>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={(e) => set('confirm_password', e.target.value)}
              placeholder="Re-enter your password"
              required
            />
          </label>

          <button
            type="submit"
            className="primary"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
