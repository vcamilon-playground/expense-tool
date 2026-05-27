import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetAlerts from './BudgetAlerts';
import type { BudgetStatus } from '@expense/shared';

function makeStatus(overrides: Partial<BudgetStatus>): BudgetStatus {
  return {
    category_id: 'cat1',
    category_name: 'Food',
    limit: 5000,
    spent: 1000,
    remaining: 4000,
    pct_used: 0.2,
    status: 'ok',
    ...overrides,
  };
}

describe('BudgetAlerts', () => {
  it('shows no-budget message when statuses is empty', () => {
    render(<BudgetAlerts statuses={[]} />);
    expect(screen.getByText(/no budgets set/i)).toBeInTheDocument();
  });

  it('renders the category name', () => {
    render(<BudgetAlerts statuses={[makeStatus({ category_name: 'Transport' })]} />);
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('applies "ok" pill class for ok status', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'ok' })]} />);
    expect(document.querySelector('.pill.ok')).toBeInTheDocument();
  });

  it('maps "warning" status to "warn" CSS class', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'warning', pct_used: 0.8, remaining: 1000 })]} />);
    expect(document.querySelector('.pill.warn')).toBeInTheDocument();
  });

  it('applies "over" pill class for over status', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'over', pct_used: 1.1, remaining: -500 })]} />);
    expect(document.querySelector('.pill.over')).toBeInTheDocument();
  });

  it('shows over-budget message when status is over', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'over', pct_used: 1.1, remaining: -500 })]} />);
    expect(screen.getByText(/over budget by/i)).toBeInTheDocument();
  });

  it('shows approaching-limit message when status is warning', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'warning', pct_used: 0.8, remaining: 1000 })]} />);
    expect(screen.getByText(/approaching limit/i)).toBeInTheDocument();
  });

  it('shows no extra message when status is ok', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'ok' })]} />);
    expect(screen.queryByText(/over budget/i)).toBeNull();
    expect(screen.queryByText(/approaching limit/i)).toBeNull();
  });
});
