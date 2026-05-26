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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Remove {itemLabel}?</h3>
          <button
            className="ghost close-btn"
            onClick={onCancel}
            aria-label="Close"
            style={{ marginLeft: 12, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: '0 0 8px' }}>
          Are you really sure you want to remove the record? This will not be retrieved anymore and
          you have to create a new record if you want to have it added again.
        </p>
        <p className="modal-warning">
          ⚠️ Note that this will affect your reports and insights.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
          <button className="danger" style={{ width: 'auto' }} onClick={onConfirm}>
            Yes, remove
          </button>
          <button className="primary" style={{ width: 'auto' }} onClick={onCancel}>
            No, keep it
          </button>
        </div>
      </div>
    </div>
  );
}
