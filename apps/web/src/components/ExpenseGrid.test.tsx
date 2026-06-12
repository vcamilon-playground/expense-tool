import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Expense } from '@expense/shared';
import ExpenseGrid from './ExpenseGrid';

const thisMonth = new Date().toISOString().slice(0, 7); // keep cards editable

function makeExpenses(count: number): Expense[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `e${i}`,
    amount: 100 + i,
    currency: 'PHP',
    conversion_rate: null,
    category_id: null,
    // Distinct days so sort order is stable; merchant carries the index for lookup.
    merchant: `Merchant ${String(i).padStart(3, '0')}`,
    description: null,
    occurred_at: `${thisMonth}-01`,
    receipt_url: null,
    source: 'manual' as const,
  }));
}

const noop = () => {};

function renderGrid(count: number) {
  return render(
    <ExpenseGrid expenses={makeExpenses(count)} categories={[]} onEdit={noop} onDelete={noop} />,
  );
}

describe('ExpenseGrid — Load More pagination', () => {
  it('shows no Load More button when there are 20 or fewer expenses', () => {
    renderGrid(20);
    expect(screen.getAllByText(/Merchant/)).toHaveLength(20);
    expect(screen.queryByRole('button', { name: /Load More/ })).not.toBeInTheDocument();
  });

  it('renders only the first 20 cards and a Load More button with the remaining count', () => {
    renderGrid(25);
    expect(screen.getAllByText(/Merchant/)).toHaveLength(20);
    expect(screen.getByRole('button', { name: /Load More… \(5 more\)/ })).toBeInTheDocument();
  });

  it('reveals the next page of 20 and hides the button once everything is shown', () => {
    renderGrid(45);
    expect(screen.getAllByText(/Merchant/)).toHaveLength(20);

    fireEvent.click(screen.getByRole('button', { name: /Load More/ }));
    expect(screen.getAllByText(/Merchant/)).toHaveLength(40);
    expect(screen.getByRole('button', { name: /Load More… \(5 more\)/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Load More/ }));
    expect(screen.getAllByText(/Merchant/)).toHaveLength(45);
    expect(screen.queryByRole('button', { name: /Load More/ })).not.toBeInTheDocument();
  });

  it('shows the empty state and no Load More button when there are no expenses', () => {
    renderGrid(0);
    expect(screen.getByText('No expenses yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load More/ })).not.toBeInTheDocument();
  });
});
