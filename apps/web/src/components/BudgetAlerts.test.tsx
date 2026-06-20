import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('renders the category name and its budget/actual/difference', () => {
    render(<BudgetAlerts statuses={[makeStatus({ category_name: 'Transport' })]} />);
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
    expect(screen.getByText(/4,000/)).toBeInTheDocument();
  });

  it('renders the rounded percentage label', () => {
    render(<BudgetAlerts statuses={[makeStatus({ pct_used: 0.926 })]} />);
    expect(screen.getByText('93%')).toBeInTheDocument();
  });

  it('applies the "ok" pill class for ok status', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'ok' })]} />);
    expect(document.querySelector('.pct-pill.pct-ok')).toBeInTheDocument();
  });

  it('maps "warning" status to the "warn" pill class', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'warning', pct_used: 0.8 })]} />);
    expect(document.querySelector('.pct-pill.pct-warn')).toBeInTheDocument();
  });

  it('applies the "over" pill class for over status', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'over', pct_used: 1.1, remaining: -500 })]} />);
    expect(document.querySelector('.pct-pill.pct-over')).toBeInTheDocument();
  });

  it('caps the fill width at 100% while still showing the true percentage', () => {
    render(<BudgetAlerts statuses={[makeStatus({ status: 'over', pct_used: 1.1, remaining: -500 })]} />);
    expect(screen.getByText('110%')).toBeInTheDocument();
    const fill = document.querySelector('.pct-pill-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('renders the Overall entry as a summary row in the table footer, categories in the body', () => {
    render(
      <BudgetAlerts
        statuses={[
          makeStatus({ category_id: null, category_name: 'Overall', limit: 8000, spent: 3000, remaining: 5000 }),
          makeStatus({ category_id: 'cat1', category_name: 'Food' }),
        ]}
      />,
    );
    const summary = document.querySelector('tfoot .budget-status-summary') as HTMLElement;
    expect(summary).toBeInTheDocument();
    expect(within(summary).getByText('Overall')).toBeInTheDocument();
    expect(document.querySelector('tbody')?.textContent).toContain('Food');
    expect(document.querySelector('tfoot')?.textContent).not.toContain('Food');
  });

  it('sorts category rows by a clicked column without moving the Overall footer', () => {
    const { container } = render(
      <BudgetAlerts
        statuses={[
          makeStatus({ category_id: null, category_name: 'Overall', limit: 14000, spent: 0, remaining: 14000 }),
          makeStatus({ category_id: 'a', category_name: 'Food', limit: 5000 }),
          makeStatus({ category_id: 'b', category_name: 'Travel', limit: 9000 }),
        ]}
      />,
    );
    const bodyNames = () =>
      Array.from(container.querySelectorAll('tbody tr td[data-label="Category"]')).map((td) => td.textContent);
    const headers = container.querySelectorAll('thead th');
    const budgetHeader = headers[1] as HTMLElement; // Category | Budget | Actual | Difference | % of Budget

    // Default: category ascending.
    expect(bodyNames()).toEqual(['Food', 'Travel']);

    // Budget ascending then descending.
    fireEvent.click(budgetHeader);
    expect(bodyNames()).toEqual(['Food', 'Travel']);
    fireEvent.click(budgetHeader);
    expect(bodyNames()).toEqual(['Travel', 'Food']);

    // Overall stays pinned in the footer regardless of sort.
    expect(container.querySelector('tfoot .budget-status-summary')?.textContent).toContain('Overall');
    expect(container.querySelector('tbody')?.textContent).not.toContain('Overall');
  });
});
