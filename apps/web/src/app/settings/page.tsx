'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isValidEmail, type Category } from '@expense/shared';
import { createCategory, deleteCategory, listCategories } from '@/lib/db';
import { useAuth, type SessionTimeout } from '@/contexts/AuthContext';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import { supabase } from '@/lib/supabase';
import DeleteModal from '@/components/DeleteModal';
import LoadingScreen from '@/components/LoadingScreen';

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

type Draft = {
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  avatarUrl?: string; // set when the user pastes a web image URL (persisted directly, no upload)
  accent: Accent;
  sessionTimeout: SessionTimeout;
  allowPastEdit: boolean;
};

function makeDraft(user: { first_name: string; last_name: string; email?: string | null; birth_date: string | null; profile_picture_url: string | null }, accent: Accent, sessionTimeout: SessionTimeout, allowPastEdit: boolean): Draft {
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email ?? '',
    birth_date: user.birth_date ?? '',
    avatarFile: null,
    avatarPreview: user.profile_picture_url,
    accent,
    sessionTimeout,
    allowPastEdit,
  };
}

function applyAccentToDOM(value: Accent) {
  if (value === 'default') {
    document.documentElement.removeAttribute('data-accent');
  } else {
    document.documentElement.setAttribute('data-accent', value);
  }
}

export default function SettingsPage() {
  const { user, loading: authLoading, refresh, setSessionTimeout } = useAuth();
  const { setGuard } = useNavigationGuard();

  const [isDark, setIsDark] = useState(false);

  // Draft state — all changes accumulate here until Save is clicked
  const [draft, setDraft] = useState<Draft | null>(null);
  const savedRef = useRef<Draft | null>(null);

  // Global save/error state
  const [saving, setSaving] = useState(false);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [globalOk, setGlobalOk] = useState(false);

  // Password change — kept separate (security action, own button)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Categories — kept separate (CRUD, own buttons)
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [catErr, setCatErr] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Initialise draft once per user ────────────────────────────────────────
  // Build the draft only when the user identity first appears or actually
  // changes (switch-user). A background refresh that returns a NEW user object
  // with the same id must NOT rebuild the draft, or it would clobber the user's
  // unsaved edits mid-interaction (which also detaches the sticky save bar and
  // races the save's own localStorage write-through).
  const initialisedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || initialisedUserIdRef.current === user.id) return;
    initialisedUserIdRef.current = user.id;

    const savedAccentVal = ((user.accent_color ?? localStorage.getItem('accent')) as Accent | null) ?? 'default';
    const savedSessionTimeout = (localStorage.getItem('session-timeout') as SessionTimeout | null) ?? 'never';
    const savedAllowPastEdit = localStorage.getItem('allow-past-edit') === 'true';

    const initialDraft = makeDraft(user, savedAccentVal, savedSessionTimeout, savedAllowPastEdit);
    setDraft(initialDraft);
    savedRef.current = initialDraft;

    listCategories(user.id).then(setCategories);
  }, [user]);

  // Track dark mode independently of the draft lifecycle.
  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // ── Dirty detection ───────────────────────────────────────────────────────
  const isDirty = draft !== null && savedRef.current !== null && (
    draft.first_name !== savedRef.current.first_name ||
    draft.last_name !== savedRef.current.last_name ||
    draft.email !== savedRef.current.email ||
    draft.birth_date !== savedRef.current.birth_date ||
    draft.avatarFile !== null ||
    draft.avatarPreview !== savedRef.current.avatarPreview ||
    draft.accent !== savedRef.current.accent ||
    draft.sessionTimeout !== savedRef.current.sessionTimeout ||
    draft.allowPastEdit !== savedRef.current.allowPastEdit
  );

  // ── Global save ───────────────────────────────────────────────────────────
  const handleGlobalSave = useCallback(async () => {
    if (!user || !draft) return;

    if (draft.email.trim() && !isValidEmail(draft.email)) {
      setGlobalErr('Enter a valid email address');
      return;
    }

    setSaving(true);
    setGlobalErr(null);

    try {
      // Resolve the avatar URL: uploaded file > pasted web URL > unchanged.
      let profilePictureUrl = user.profile_picture_url;
      if (draft.avatarFile) {
        const ext = draft.avatarFile.name.split('.').pop();
        const path = `${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, draft.avatarFile, {
          upsert: true, contentType: draft.avatarFile.type,
        });
        if (uploadError) {
          setGlobalErr(`Avatar upload failed: ${uploadError.message}. Ensure the "avatars" storage bucket exists and is public.`);
          return;
        }
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        // Cache-bust: the upsert path is identical each time, so without a
        // version query param the browser would keep showing the old image.
        profilePictureUrl = `${data.publicUrl}?v=${Date.now()}`;
      } else if (draft.avatarUrl !== undefined) {
        profilePictureUrl = draft.avatarUrl.trim() || null;
      }

      // Always persist profile + accent_color to DB so changes sync across devices
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: draft.first_name,
          last_name: draft.last_name,
          email: draft.email.trim() || null,
          birth_date: draft.birth_date || null,
          profile_picture_url: profilePictureUrl,
          accent_color: draft.accent,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setGlobalErr(data.error ?? 'Failed to save settings');
        return;
      }
      await refresh();

      // Sync localStorage write-through cache
      applyAccentToDOM(draft.accent);
      if (draft.accent === 'default') {
        localStorage.removeItem('accent');
      } else {
        localStorage.setItem('accent', draft.accent);
      }
      setSessionTimeout(draft.sessionTimeout);
      localStorage.setItem('allow-past-edit', String(draft.allowPastEdit));

      // Commit draft as new saved baseline
      const committed: Draft = {
        ...draft,
        avatarFile: null,
        avatarUrl: undefined,
        avatarPreview: profilePictureUrl,
      };
      savedRef.current = committed;
      setDraft(committed);

      setGlobalOk(true);
      setTimeout(() => setGlobalOk(false), 3000);
    } catch {
      setGlobalErr('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [user, draft, refresh, setSessionTimeout]);

  // ── Global cancel — revert to saved baseline ──────────────────────────────
  function handleGlobalCancel() {
    if (!savedRef.current) return;
    applyAccentToDOM(savedRef.current.accent);
    setDraft({ ...savedRef.current });
    setGlobalErr(null);
  }

  // ── Navigation guard ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isDirty) {
      setGuard({ save: handleGlobalSave });
    } else {
      setGuard(null);
    }
    return () => setGuard(null);
  }, [isDirty, handleGlobalSave, setGuard]);

  // Browser close/refresh warning
  useEffect(() => {
    if (!isDirty) return;
    function handle(e: BeforeUnloadEvent) { e.preventDefault(); }
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isDirty]);

  // ── Password change ───────────────────────────────────────────────────────
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwErr(null);
    setPwOk(false);
    if (pwForm.next !== pwForm.confirm) { setPwErr('New passwords do not match'); return; }
    if (pwForm.next.length < 8) { setPwErr('New password must be at least 8 characters'); return; }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { setPwErr(data.error ?? 'Failed to change password'); return; }
      setPwForm({ current: '', next: '', confirm: '' });
      setPwOk(true);
      setTimeout(() => setPwOk(false), 3000);
    } catch {
      setPwErr('Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  // ── Categories ────────────────────────────────────────────────────────────
  async function reloadCategories() {
    if (!user) return;
    setCategories(await listCategories(user.id));
  }

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

  // ── Avatar picker ─────────────────────────────────────────────────────────
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setGlobalErr('Profile picture must be under 2 MB'); return; }
    setDraft((d) => d ? { ...d, avatarFile: file, avatarPreview: URL.createObjectURL(file), avatarUrl: undefined } : d);
  }

  function handleAvatarUrlChange(url: string) {
    setDraft((d) => d ? { ...d, avatarUrl: url, avatarFile: null, avatarPreview: url.trim() || null } : d);
  }

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (authLoading || !user || !draft) return <LoadingScreen />;

  return (
    <div>
      <h1 style={{ margin: 0, marginBottom: 8 }}>Settings</h1>
      <p className="muted" style={{ marginBottom: 16 }}>Manage your profile, appearance, and preferences.</p>

      {/* Unsaved changes bar */}
      {isDirty && (
        <div
          className="settings-save-bar"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'var(--accent)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500 }}>You have unsaved changes</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="ghost"
              style={{ width: 'auto', color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
              onClick={handleGlobalCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              style={{ width: 'auto', background: '#fff', color: 'var(--accent)', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 600, cursor: 'pointer' }}
              onClick={handleGlobalSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {globalErr && (
        <div className="banner banner-danger" style={{ marginBottom: 12 }} role="alert">{globalErr}</div>
      )}
      {globalOk && (
        <div className="banner" style={{ marginBottom: 12, background: 'rgba(22,163,74,0.08)', border: '1px solid var(--good)', color: 'var(--good)' }}>
          Settings saved successfully.
        </div>
      )}

      {/* ── Profile ── */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Profile</h2>

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
            {draft.avatarPreview ? (
              <img src={draft.avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : '👤'}
          </div>
          <div>
            <button
              type="button"
              className="ghost"
              style={{ width: 'auto', padding: '4px 12px', fontSize: 13 }}
              onClick={() => fileInputRef.current?.click()}
            >
              {draft.avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>JPG, PNG up to 2 MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
            Or paste an image URL from the web
          </div>
          <input
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={draft.avatarUrl ?? ''}
            onChange={(e) => handleAvatarUrlChange(e.target.value)}
          />
        </label>

        <div className="grid cols-2" style={{ gap: 12, marginBottom: 12 }}>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>First Name</div>
            <input
              value={draft.first_name}
              onChange={(e) => setDraft((d) => d ? { ...d, first_name: e.target.value } : d)}
              required
            />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Last Name</div>
            <input
              value={draft.last_name}
              onChange={(e) => setDraft((d) => d ? { ...d, last_name: e.target.value } : d)}
              required
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
            Email <span style={{ fontWeight: 400 }}>(optional — enables password reset)</span>
          </div>
          <input
            type="email"
            autoComplete="email"
            value={draft.email}
            onChange={(e) => setDraft((d) => d ? { ...d, email: e.target.value } : d)}
            placeholder="you@example.com"
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
            Birth Date <span style={{ fontWeight: 400 }}>(optional)</span>
          </div>
          <input
            type="date"
            value={draft.birth_date}
            onChange={(e) => setDraft((d) => d ? { ...d, birth_date: e.target.value } : d)}
          />
        </label>

        <div className="muted" style={{ fontSize: 13 }}>
          Username: <strong style={{ color: 'var(--text)' }}>@{user.username}</strong>
          <span style={{ marginLeft: 8 }}>(cannot be changed)</span>
        </div>
      </div>

      {/* ── Change Password (separate action) ── */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Change Password</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
          Requires your current password. If you forgot it, ask an admin to reset it in Supabase.
        </p>

        {pwErr && <div className="banner banner-danger" style={{ marginBottom: 12 }} role="alert">{pwErr}</div>}
        {pwOk && (
          <div className="banner" style={{ marginBottom: 12, background: 'rgba(22,163,74,0.08)', border: '1px solid var(--good)', color: 'var(--good)' }}>
            Password changed successfully.
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Current Password</div>
              <input type="password" autoComplete="current-password" value={pwForm.current}
                onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} required />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>New Password</div>
              <input type="password" autoComplete="new-password" value={pwForm.next}
                onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))} required />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Confirm New Password</div>
              <input type="password" autoComplete="new-password" value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} required />
            </label>
          </div>
          <button type="submit" className="primary" style={{ width: 'auto', marginTop: 16 }} disabled={pwLoading}>
            {pwLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── Session Expiry ── */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Session Expiry</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
          Automatically log out after a period of inactivity. Resets on any mouse, keyboard, or touch activity.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(
            [
              { value: 'never', label: 'Never (default)' },
              { value: '30',    label: '30 minutes' },
              { value: '60',    label: '1 hour' },
              { value: '120',   label: '2 hours' },
            ] as { value: SessionTimeout; label: string }[]
          ).map(({ value, label }) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="radio"
                name="session-timeout"
                value={value}
                checked={draft.sessionTimeout === value}
                onChange={() => setDraft((d) => d ? { ...d, sessionTimeout: value } : d)}
                style={{ width: 'auto', height: 'auto', accentColor: 'var(--accent)' }}
              />
              <span style={{ fontWeight: draft.sessionTimeout === value ? 600 : 400 }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Theme Color ── */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Theme Color</h2>

        {isDark ? (
          <div className="banner banner-warn" style={{ marginBottom: 16 }}>
            Theme color settings apply to <strong>light mode only</strong>. Dark mode uses its own fixed color scheme.
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
            Choose an accent color. Applies to <strong>light mode only</strong> — preview is live, saved on Save Changes.
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {accents.map(({ value, label, color }) => {
            const selected = draft.accent === value;
            return (
              <button
                key={value}
                className="ghost"
                onClick={() => {
                  setDraft((d) => d ? { ...d, accent: value } : d);
                  applyAccentToDOM(value); // live preview
                }}
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
                    width: 40, height: 40, borderRadius: '50%', background: color, display: 'block',
                    boxShadow: selected ? `0 0 0 3px var(--panel), 0 0 0 6px ${color}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: selected ? 600 : 400 }}>
                  {label}
                </span>
                {selected && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Active</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Categories (own CRUD buttons) ── */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Categories</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
          Add or remove expense categories. Changes here take effect immediately.
        </p>

        <DeleteModal
          open={pendingDelete !== null}
          itemLabel="Category"
          onConfirm={handleDeleteCategory}
          onCancel={() => setPendingDelete(null)}
        />

        {catErr && <div className="banner banner-danger" style={{ marginBottom: 12 }} role="alert">{catErr}</div>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {categories.filter((c) => c.active !== false).map((cat) => (
            <span key={cat.id} className="cat-chip">
              <span>{cat.icon ?? '🏷️'}</span>
              <span>{cat.name}</span>
              <button onClick={() => setPendingDelete(cat)} title="Delete" aria-label="Delete">×</button>
            </span>
          ))}
        </div>

        <form onSubmit={handleAddCategory}>
          <div className="grid cols-3" style={{ gap: 8, alignItems: 'end' }}>
            <label style={{ gridColumn: 'span 2' }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Category name</div>
              <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Hobbies" required />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
                Icon <span className="muted" style={{ fontSize: 11 }}>(optional)</span>
              </div>
              <input value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} placeholder={DEFAULT_ICON} maxLength={4} />
            </label>
          </div>
          <button type="submit" className="primary" style={{ width: 'auto', marginTop: 12 }}>
            + Add Category
          </button>
        </form>
      </div>

      {/* ── Expense Editing ── */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Expense Editing</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
          By default only the current month&apos;s expenses can be edited. Enable this to allow editing any previous month.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={draft.allowPastEdit}
            onChange={(e) => setDraft((d) => d ? { ...d, allowPastEdit: e.target.checked } : d)}
            style={{ width: 'auto', height: 'auto', accentColor: 'var(--accent)', transform: 'scale(1.3)' }}
          />
          <span style={{ fontWeight: 500 }}>Allow editing of past expenses</span>
        </label>
        {draft.allowPastEdit && (
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            All expenses are now editable regardless of date.
          </p>
        )}
      </div>

      {/* ── Bottom save bar (always visible as a persistent CTA when dirty) ── */}
      {isDirty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <button className="ghost" style={{ width: 'auto' }} onClick={handleGlobalCancel} disabled={saving}>
            Cancel
          </button>
          <button className="primary" style={{ width: 'auto' }} onClick={handleGlobalSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
