import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormModal from './FormModal';

function setup(open: boolean) {
  const onClose = vi.fn();
  render(
    <FormModal open={open} title="Add Expense" onClose={onClose}>
      <p>form content</p>
    </FormModal>,
  );
  return { onClose };
}

describe('FormModal', () => {
  it('renders nothing when open is false', () => {
    setup(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog with title when open is true', () => {
    setup(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add Expense' })).toBeInTheDocument();
  });

  it('renders children inside the dialog', () => {
    setup(true);
    expect(screen.getByText('form content')).toBeInTheDocument();
  });

  it('calls onClose when X button is clicked', async () => {
    const { onClose } = setup(true);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the overlay is clicked', async () => {
    const { onClose } = setup(true);
    const overlay = screen.getByRole('dialog').parentElement!;
    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const { onClose } = setup(true);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose on Escape when closed', async () => {
    const { onClose } = setup(false);
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
