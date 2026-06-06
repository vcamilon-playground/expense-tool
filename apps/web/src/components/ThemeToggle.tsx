'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  if (compact) {
    return (
      <div className="theme-toggle-pill" role="group" aria-label="Color scheme">
        <button
          className={`theme-pill-btn${theme === 'light' ? ' active' : ''}`}
          onClick={() => { if (theme !== 'light') toggle(); }}
          title="Light mode"
          aria-label="Light mode"
          aria-pressed={theme === 'light'}
        >
          ☀️
        </button>
        <button
          className={`theme-pill-btn${theme === 'dark' ? ' active' : ''}`}
          onClick={() => { if (theme !== 'dark') toggle(); }}
          title="Dark mode"
          aria-label="Dark mode"
          aria-pressed={theme === 'dark'}
        >
          🌙
        </button>
      </div>
    );
  }

  return (
    <button
      className="ghost"
      onClick={toggle}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, fontSize: 14, height: 38 }}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span style={{ fontSize: 16 }}>{theme === 'light' ? '🌙' : '☀️'}</span>
      <span className="theme-label">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
    </button>
  );
}
