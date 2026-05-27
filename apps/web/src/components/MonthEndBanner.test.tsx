import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MonthEndBanner from './MonthEndBanner';

afterEach(() => {
  vi.useRealTimers();
});

function setDate(isoDate: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(isoDate + 'T12:00:00'));
}

describe('MonthEndBanner', () => {
  it('renders nothing when more than 7 days remain', () => {
    setDate('2026-05-01'); // 30 days left
    const { container } = render(<MonthEndBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on day 23 of a 31-day month (8 days left)', () => {
    setDate('2026-05-23'); // 31 - 23 = 8 days left
    const { container } = render(<MonthEndBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner on day 24 of a 31-day month (7 days left)', () => {
    setDate('2026-05-24'); // 31 - 24 = 7 days left
    render(<MonthEndBanner />);
    expect(screen.getByText(/7 days left this month/i)).toBeInTheDocument();
  });

  it('shows singular "day" when 1 day is left', () => {
    setDate('2026-05-30'); // 31 - 30 = 1 day left
    render(<MonthEndBanner />);
    expect(screen.getByText(/1 day left this month/i)).toBeInTheDocument();
  });

  it('shows "last day" message on the final day of the month', () => {
    setDate('2026-05-31'); // last day
    render(<MonthEndBanner />);
    expect(screen.getByText(/today is the last day of the month/i)).toBeInTheDocument();
  });

  it('shows "last day" on Feb 28 in a non-leap year', () => {
    setDate('2026-02-28');
    render(<MonthEndBanner />);
    expect(screen.getByText(/today is the last day of the month/i)).toBeInTheDocument();
  });

  it('shows "last day" on Feb 29 in a leap year', () => {
    setDate('2024-02-29');
    render(<MonthEndBanner />);
    expect(screen.getByText(/today is the last day of the month/i)).toBeInTheDocument();
  });
});
