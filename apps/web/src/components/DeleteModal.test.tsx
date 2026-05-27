import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteModal from './DeleteModal';

function setup(open: boolean) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <DeleteModal open={open} itemLabel="Expense" onConfirm={onConfirm} onCancel={onCancel} />,
  );
  return { onConfirm, onCancel };
}

describe('DeleteModal', () => {
  it('renders nothing when open is false', () => {
    setup(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog when open is true', () => {
    setup(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays the item label in the heading', () => {
    setup(true);
    expect(screen.getByRole('heading', { name: /remove expense/i })).toBeInTheDocument();
  });

  it('calls onConfirm when "Yes, remove" is clicked', async () => {
    const { onConfirm } = setup(true);
    await userEvent.click(screen.getByRole('button', { name: /yes, remove/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when "No, keep it" is clicked', async () => {
    const { onCancel } = setup(true);
    await userEvent.click(screen.getByRole('button', { name: /no, keep it/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when the X button is clicked', async () => {
    const { onCancel } = setup(true);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when the overlay is clicked', async () => {
    const { onCancel } = setup(true);
    // The overlay is the outermost div; click outside the modal content
    const overlay = screen.getByRole('dialog').parentElement!;
    await userEvent.click(overlay);
    expect(onCancel).toHaveBeenCalled();
  });
});
