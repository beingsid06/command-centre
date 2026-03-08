import { useState } from 'react';
import { X, Send, Calendar } from 'lucide-react';
import { format, addHours } from 'date-fns';

// Returns a local datetime-local string (YYYY-MM-DDTHH:mm) 1 hour from now
function defaultFollowUpDateTime() {
  const d = addHours(new Date(), 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CompletionModal({ callback, onClose, onSubmit }) {
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [followUpAt, setFollowUpAt] = useState(defaultFollowUpDateTime);
  const [loading, setLoading] = useState(false);

  if (!callback) return null;

  const isFollowUpValid = !followUp || (followUp && followUpAt);
  const canSubmit = notes.trim() && isFollowUpValid && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const followUpIso = followUp && followUpAt ? new Date(followUpAt).toISOString() : null;
      await onSubmit(callback.id, notes.trim(), followUp, followUpIso);
      onClose();
    } catch {
      // error toast handled in store
    } finally {
      setLoading(false);
    }
  };

  const agentName = callback.assignedAgent || 'Agent';
  const freshdeskPreview = followUp
    ? `Callback Summary\nAgent: ${agentName}\nStatus: Follow-up Scheduled\nNotes: ${notes || '(your notes here)'}\nFollow-up Scheduled: ${followUpAt ? format(new Date(followUpAt), 'dd MMM yyyy, h:mm a') : 'TBD'}`
    : `Callback Summary\nAgent: ${agentName}\nStatus: Completed\nNotes: ${notes || '(your notes here)'}\nFollow-up Needed: No`;

  const buttonLabel = loading
    ? (followUp ? 'Scheduling…' : 'Completing…')
    : (followUp ? 'Pending & Post to Freshdesk' : 'Complete & Post to Freshdesk');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Complete Callback</span>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="completion-callback-info">
            <h4>{callback.id} — {callback.ticketId}</h4>
            <p>{callback.subject}</p>
            {callback.ticketLink && (
              <a className="modal-ticket-link" href={callback.ticketLink} target="_blank" rel="noopener noreferrer">
                View Freshdesk Ticket ↗
              </a>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Summary Notes *</label>
            <textarea
              className="form-textarea"
              placeholder="Describe what was discussed, resolution provided, and any follow-up actions…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
              rows={4}
            />
          </div>

          <div className="form-group">
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Follow-up Required</div>
                <div className="toggle-sublabel">Creates a new follow-up callback in the queue (this callback will be marked complete)</div>
              </div>
              <button
                className={`toggle ${followUp ? 'active' : ''}`}
                onClick={() => setFollowUp(!followUp)}
                type="button"
              >
                <div className="toggle-knob" />
              </button>
            </div>
          </div>

          {followUp && (
            <div className="form-group followup-datetime-group">
              <label className="form-label">
                <Calendar size={14} style={{ marginRight: 6 }} />
                Follow-up Date &amp; Time *
              </label>
              <input
                type="datetime-local"
                className="form-input datetime-input"
                value={followUpAt}
                min={defaultFollowUpDateTime()}
                onChange={(e) => setFollowUpAt(e.target.value)}
              />
              {followUpAt && (
                <div className="datetime-display">
                  Scheduled for: {format(new Date(followUpAt), 'EEEE, dd MMM yyyy — h:mm a')}
                </div>
              )}
            </div>
          )}

          <div className="freshdesk-preview">
            <div className="freshdesk-preview-title">Freshdesk Private Note Preview</div>
            <div className="freshdesk-preview-content">{freshdeskPreview}</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-md btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn btn-md ${followUp ? 'btn-warning' : 'btn-primary'}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <Send size={14} />
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
