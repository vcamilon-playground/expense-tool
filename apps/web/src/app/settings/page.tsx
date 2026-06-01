'use client';

import { useEffect, useRef, useState } from 'react';
import type { Category } from '@expense/shared';
import { createCategory, deleteCategory, listCategories } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DeleteModal from '@/components/DeleteModal';

const DEFAULT_ICON = '🏷️';

type Accent = 'default' | 'yellow' | 'green' | 'red' | 'orange' | 'violet';

const accents: { value: Accent; label: string; color: string }[] = [
  { value: 'default', label: 'Default', color: '#3b6fd4' },
  { value: 'yellow',  label: 'Yellow',  color: '#d97706' },
  { value: 'green',   label: 'Green',   color: '#16a34a' },
  { value: 'red',     label: 'Red',     color: '#dc2626' },
  { value: 'orange',  label: 'Orange',  color: '#ea580c' },
  { value: 'violet',  label: 'Violet',  color: '#7c3aed' },
];

export default function SettingsPage() {
  const { user, refresh } = useAuth();

  const [accent, setAccent] = useState<Accent>('default');
  const [isDark, setIsDark] = useState(false);
  const [allowPastEdit, setAllowPastEdit] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [catErr, setCatErr] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  // Profile section
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  async function reloadCategories() {
    if (!user) return;
    const cats = await listCategories(user.id);
    setCategories(cats);
  }

  useEffect(() => {
    const saved = localStorage.getItem('accent') as Accent | null;
    if (saved) setAccent(saved);
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    setAllowPastEdit(localStorage.getItem('allow-past-edit') === 'true');

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      first_name: user.first_name,
      last_name: user.last_name,
      birth_date: user.birth_date ?? '',
    });
    setAvatarPreview(user.profile_picture_url);
    reloadCategories();
  }, [user]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const name = newCatName.trim();
    if (!name) return;
    setCatErr(null);
    try {
      await createCategory({ name, icon: newCatIcon.trim() || DEFAULT_ICON }, user.id);
      setNewCatName('');
      setNewCatIcon('');
      await reloadCategories();
    } catch (err) {
      setCatErr(err instanceof Error ? err.message : 'Failed to add category');
    }
  }

  async function handleDeleteCategory() {
    if (!pendingDelete) return;
    try {
      await deleteCategory(pendingDelete.id);
      await reloadCategories();
    } catch (err) {
      setCatErr(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setPendingDelete(null);
    }
  }

  function togglePastEdit(value: boolean) {
    setAllowPastEdit(value);
    localStorage.setItem('allow-past-edit', String(value));
  }

  function applyAccent(value: Accent) {
    setAccent(value);
    localStorage.setItem('accent', value);
    if (value === 'default') {
      document.documentElement.removeAttribute('data-accent');
    } else {
      document.documentElement.setAttribute('data-accent', value);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileErr('Profile picture must be under 2 MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileErr(null);
    setProfileOk(false);
    setProfileLoading(true);
    try {
      let profilePictureUrl = user.profile_picture_url;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          profilePictureUrl = data.publicUrl;
        }
      }

      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          birth_date: profileForm.birth_date || null,
          profile_picture_url: profilePictureUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileErr(data.error ?? 'Failed to update profile');
        return;
      }
      setAvatarFile(null);
      await refresh();
      setProfileOk(true);
      setTimeout(() => setProfileOk(false), 3000);
    } catch {
      setProfileErr('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwErr(null);
    setPwOk(false);
    if (pwForm.next !== pwForm.confirm) {
      setPwErr('New passwords do not match');
      return;
    }
    if (pwForm.next.length < 8) {
      setPwErr('New password must be at least 8 characters');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwErr(data.error ?? 'Failed to change password');
        return;
      }
      setPwForm({ current: '', next: '', confirm: '' });
      setPwOk(true);
      setTimeout(() => setPwOk(false), 3000);
    } catch {
      setPwErr('Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ margin: 0, marginBottom: 8 }}>Settings</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Manage your profile, appearance, and preferences.</p>

      {/* Profile */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Profile</h2>

        {profileErr && (
          <div className="banner banner-danger" style={{ marginBottom: 12 }} role="alert">{profileErr}</div>
        )}
        {profileOk && (
          <div className="banner" style={{ marginBottom: 12, background: 'rgba(22,163,74,0.08)', border: '1px solid var(--good)', color: 'var(--good)' }}>
            Profile updated successfully.
          </div>
        )}

        <form onSubmit={handleProfileSave}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--panel-2)', border: '2px dashed var(--border)',
                cursor: 'pointer', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '👤'
              )}
            </div>
            <div>
              <button
                type="button"
                className="ghost"
                style={{ width: 'auto', padding: '4px 12px', fontSize: 13 }}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>JPG, PNG up to 2 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="grid cols-2" style={{ gap: 12, marginBottom: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>First Name</div>
              <input
                value={profileForm.first_name}
                onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))}
                required
              />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Last Name</div>
              <input
                value={profileForm.last_name}
                onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))}
                required
              />
            </label>
          </div>

          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
              Birth Date <span style={{ fontWeight: 400 }}>(optional)</span>
            </div>
            <input
              type="date"
              value={profileForm.birth_date}
              onChange={(e) => setProfileForm((p) => ({ ...p, birth_date: e.target.value }))}
            />
          </label>

          <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Username: <strong style={{ color: 'var(--text)' }}>@{user?.username}</strong>
            <span style={{ marginLeft: 8 }}>(cannot be changed)</span>
          </div>

          <button type="submit" className="primary" style={{ width: 'auto' }} disabled={profileLoading}>
            {profileLoading ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Change Password</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
          You must know your current password. If you forgot it, ask an admin to reset it in Supabase.
        </p>

        {pwErr && (
          <div className="banner banner-danger" style={{ marginBottom: 12 }} role="alert">{pwErr}</div>
        )}
        {pwOk && (
          <div className="banner" style={{ marginBottom: 12, background: 'rgba(22,163,74,0.08)', border: '1px solid var(--good)', color: 'var(--good)' }}>
            Password changed successfully.
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Current Password</div>
              <input
                type="password"
                autoComplete="current-password"
                value={pwForm.current}
                onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                required
              />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>New Password</div>
              <input
                type="password"
                autoComplete="new-password"
                value={pwForm.next}
                onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                required
              />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Confirm New Password</div>
              <input
                type="password"
                autoComplete="new-password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                required
              />
            </label>
          </div>
          <button type="submit" className="primary" style={{ width: 'auto', marginTop: 16 }} disabled={pwLoading}>
            {pwLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Theme Color */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Theme Color</h2>

        {isDark ? (
          <div className="banner banner-warn" style={{ marginBottom: 16 }}>
            Theme color settings apply to <strong>light mode only</strong>. Dark mode uses its own fixed color scheme and is not affected by this setting.
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
            Choose an accent color for buttons, links, and highlights. This setting applies to <strong>light mode only</strong> — dark mode is not affected.
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {accents.map(({ value, label, color }) => {
            const selected = accent === value;
            return (
              <button
                key={value}
                className="ghost"
                onClick={() => applyAccent(value)}
                aria-label={`${label} theme${selected ? ' (selected)' : ''}`}
                aria-pressed={selected}
                style={{
                  width: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 18px',
                  border: `2px solid ${selected ? color : 'var(--border)'}`,
                  borderRadius: 10,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: color,
                    display: 'block',
                    boxShadow: selected ? `0 0 0 3px var(--panel), 0 0 0 6px ${color}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: selected ? 600 : 400 }}>
                  {label}
                </span>
                {selected && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Active</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Categories</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
          Add or remove expense categories. Default categories cannot be recovered once deleted.
        </p>

        <DeleteModal
          open={pendingDelete !== null}
          itemLabel="Category"
          onConfirm={handleDeleteCategory}
          onCancel={() => setPendingDelete(null)}
        />

        {catErr && (
          <div className="banner banner-danger" style={{ marginBottom: 12 }} role="alert">
            {catErr}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
          {categories.filter((c) => c.active !== false).map((cat) => (
            <div
              key={cat.id}
              className="row"
              style={{ justifyContent: 'space-between', padding: '6px 8px', borderRadius: 6, background: 'var(--panel-2)' }}
            >
              <span style={{ fontSize: 15 }}>
                <span style={{ marginRight: 8 }}>{cat.icon ?? '🏷️'}</span>
                {cat.name}
              </span>
              <button
                className="danger"
                style={{ width: 'auto', padding: '2px 10px', fontSize: 13 }}
                onClick={() => setPendingDelete(cat)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddCategory}>
          <div className="grid cols-3" style={{ gap: 8, alignItems: 'end' }}>
            <label style={{ gridColumn: 'span 2' }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Category name</div>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Hobbies"
                required
              />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
                Icon <span className="muted" style={{ fontSize: 11 }}>(optional)</span>
              </div>
              <input
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                placeholder={DEFAULT_ICON}
                maxLength={4}
              />
            </label>
          </div>
          <button type="submit" className="primary" style={{ width: 'auto', marginTop: 12 }}>
            + Add Category
          </button>
        </form>
      </div>

      {/* Expense Editing */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Expense Editing</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
          By default only the current month&apos;s expenses can be edited. Enable this to allow editing expenses from any previous month.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={allowPastEdit}
            onChange={(e) => togglePastEdit(e.target.checked)}
            style={{ width: 'auto', height: 'auto', accentColor: 'var(--accent)', transform: 'scale(1.3)' }}
          />
          <span style={{ fontWeight: 500 }}>Allow editing of past expenses</span>
        </label>
        {allowPastEdit && (
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            All expenses are now editable regardless of date.
          </p>
        )}
      </div>
    </div>
  );
}
