'use client';

import { useEffect, useState } from 'react';
import type { Category } from '@expense/shared';
import { createCategory, deleteCategory, listCategories } from '@/lib/db';
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
  const [accent, setAccent] = useState<Accent>('default');
  const [isDark, setIsDark] = useState(false);
  const [allowPastEdit, setAllowPastEdit] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [catErr, setCatErr] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  async function reloadCategories() {
    const cats = await listCategories();
    setCategories(cats);
  }

  useEffect(() => {
    const saved = localStorage.getItem('accent') as Accent | null;
    if (saved) setAccent(saved);
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    setAllowPastEdit(localStorage.getItem('allow-past-edit') === 'true');
    reloadCategories();

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setCatErr(null);
    try {
      await createCategory({ name, icon: newCatIcon.trim() || DEFAULT_ICON });
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

  return (
    <div>
      <h1 style={{ margin: 0, marginBottom: 8 }}>Settings</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Customize how the app looks.</p>

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

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Expense Editing</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
          By default only the current month&apos;s expenses can be edited. Enable this to allow editing expenses from any previous month. Planned for admin users in a future release.
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
