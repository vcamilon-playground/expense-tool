import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SummaryCards from './SummaryCards';
import type { PeriodSummary } from '@expense/shared';

function makePeriod(total: number, count: number): PeriodSummary {
  return { period: 'day', from: '2026-05-01', to: '2026-05-01', total, count, by_category: [] };
}

const props = {
  day: makePeriod(100, 1),
  week: makePeriod(500, 3),
  month: makePeriod(2000, 10),
  year: makePeriod(24000, 120),
};

describe('SummaryCards', () => {
  it('renders all four period labels', () => {
    render(<SummaryCards {...props} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('This Year')).toBeInTheDocument();
  });

  it('renders expense counts', () => {
    render(<SummaryCards {...props} />);
    expect(screen.getByText('1 expense(s)')).toBeInTheDocument();
    expect(screen.getByText('3 expense(s)')).toBeInTheDocument();
    expect(screen.getByText('10 expense(s)')).toBeInTheDocument();
    expect(screen.getByText('120 expense(s)')).toBeInTheDocument();
  });

  it('renders four stat cards', () => {
    render(<SummaryCards {...props} />);
    expect(screen.getAllByText(/expense\(s\)/)).toHaveLength(4);
  });
});
