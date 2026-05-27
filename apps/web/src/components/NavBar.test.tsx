import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NavBar from './NavBar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className, onClick }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={href} className={className} onClick={onClick}>{children}</a>
  ),
}));

describe('NavBar', () => {
  it('renders the brand link', () => {
    render(<NavBar />);
    expect(screen.getByText(/💸 Expenses/)).toBeInTheDocument();
  });

  it('renders all nav links', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Expenses' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Budgets' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recurring' })).toBeInTheDocument();
  });

  it('marks Dashboard as active when pathname is "/"', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('active');
  });

  it('does not mark Expenses as active when pathname is "/"', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: 'Expenses' })).not.toHaveClass('active');
  });

  it('renders the toggle button', () => {
    render(<NavBar />);
    expect(screen.getByRole('button', { name: /toggle navigation/i })).toBeInTheDocument();
  });

  it('opens nav links on toggle button click', async () => {
    render(<NavBar />);
    const toggle = screen.getByRole('button', { name: /toggle navigation/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
