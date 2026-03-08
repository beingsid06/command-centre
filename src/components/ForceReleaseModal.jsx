import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ForceReleaseModal({ callback, onClose, onSubmit, bulk }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!callback && !bulk) return null;

  const isBulk = !!bulk;
  const title = isBulk ? `Force Release ${bulk.length} Callbacks` : `Force Release ${callback?.id}`;
  const canSubmit = notes.trim().length >= 3 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (isBulk) {
        await onSubmit(bulk, notes.trim());
      } else {
        await onSubmit(callback.id, notes.trim());
      }
      onClose();
    } catch {
      // error toast handled in store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="force-release-warning">
            <AlertTriangle size={16} />
            <span>
              {isBulk
                ? `This will release ${bulk.length} callbacks back to the queue. Notes are required.`
                : `This will release ${callback?.id} (${callback?.assignedAgent || 'agent'}) back to the queue. Notes are required.`
              }
            </span>
          </div>

          {!isBulk && callback && (
            <div className="completion-callback-info">
              <h4>{callback.id} — {callback.ticketId}</h4>
              <p>{callback.subject}</p>
              {callback.assignedAgent && (
                <p style={{ fontSize: 12, color: 'var(--scapia-gray-400)' }}>
                  Currently held by: <strong>{callback.assignedAgent}</strong>
                </p>
              )}
            </div>
          )}

          {isBulk && (
            <div className="completion-callback-info">
              <p style={{ fontSize: 13 }}>
                Callbacks: {bulk.map(id => <span key={id} className="bulk-id-chip">{id}</span>)}
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Reason for Force Release *</label>
            <textarea
              className="form-textarea"
              placeholder="Why is this callback being force-released? (min 3 characters)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
              rows={3}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-md btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-md btn-warning"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <AlertTriangle size={14} />
            {loading ? 'Releasing...' : (isBulk ? `Force Release ${bulk.length}` : 'Force Release')}
          </button>
        </div>
      </div>
    </div>
  );
}
