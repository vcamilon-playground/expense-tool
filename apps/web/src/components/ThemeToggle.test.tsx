import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeToggle', () => {
  it('renders a button', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('defaults to light mode (shows 🌙)', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveTextContent('🌙');
  });

  it('toggles to dark mode on click (shows ☀️)', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('☀️');
  });

  it('saves theme to localStorage on click', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('sets data-theme attribute on documentElement when toggled', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('reads saved dark theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveTextContent('☀️');
  });

  it('applies saved theme to data-theme attribute on mount', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
