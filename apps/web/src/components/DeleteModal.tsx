'use client';

type Props = {
  open: boolean;
  itemLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteModal({ open, itemLabel, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 10px' }}>Remove {itemLabel}?</h3>
        <p style={{ margin: '0 0 8px' }}>
          Do you want to permanently remove this {itemLabel.toLowerCase()}?
        </p>
        <p className="modal-warning">
          ⚠️ Note that this will affect your reports and insights.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
          <button className="ghost" style={{ width: 'auto' }} onClick={onCancel}>
            Cancel
          </button>
          <button className="danger" style={{ width: 'auto' }} onClick={onConfirm}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
