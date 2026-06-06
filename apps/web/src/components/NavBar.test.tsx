import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NavBar from './NavBar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'test-id', username: 'testuser', first_name: 'Test', last_name: 'User', profile_picture_url: null, birth_date: null },
    logout: vi.fn(),
  }),
}));

describe('NavBar', () => {
  it('renders the brand link', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: /💸 Expenses/ })).toBeInTheDocument();
  });

  it('renders all nav links', () => {
    render(<NavBar />);
    const sidenav = screen.getByRole('navigation', { name: 'Sidebar navigation' });
    expect(within(sidenav).getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(within(sidenav).getByRole('link', { name: /^Expenses$/ })).toBeInTheDocument();
    expect(within(sidenav).getByRole('link', { name: /Reports/ })).toBeInTheDocument();
    expect(within(sidenav).getByRole('link', { name: /Budgets/ })).toBeInTheDocument();
    expect(within(sidenav).getByRole('link', { name: /Recurring/ })).toBeInTheDocument();
  });

  it('marks Dashboard as active when pathname is "/"', () => {
    render(<NavBar />);
    const sidenav = screen.getByRole('navigation', { name: 'Sidebar navigation' });
    expect(within(sidenav).getByRole('link', { name: /Dashboard/ })).toHaveClass('active');
  });

  it('does not mark Expenses as active when pathname is "/"', () => {
    render(<NavBar />);
    const sidenav = screen.getByRole('navigation', { name: 'Sidebar navigation' });
    expect(within(sidenav).getByRole('link', { name: /^Expenses$/ })).not.toHaveClass('active');
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
