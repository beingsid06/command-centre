import { useState, useEffect } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { User, Clock, ExternalLink, Lock, Play, CheckCircle, Tag, RotateCcw, UserCheck, GitBranch } from 'lucide-react';
import { getTimeRemaining, getUrgencyLevel, getUrgencyConfig, formatCountdown } from '../utils/slaEngine';

export default function CallbackCard({ callback, onPickUp, onComplete, onForceRelease, onExtend, currentAgent, isSupervisor }) {
  const [minutesLeft, setMinutesLeft] = useState(() => getTimeRemaining(callback.deadline));
  const [lockMinutes, setLockMinutes] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tick = () => {
      setMinutesLeft(getTimeRemaining(callback.deadline));
      if (callback.status === 'in-progress' && callback.pickedUpAt) {
        const elapsed = differenceInMinutes(new Date(), new Date(callback.pickedUpAt));
        setLockMinutes(elapsed);
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [callback.deadline, callback.status, callback.pickedUpAt]);

  const urgency = getUrgencyLevel(minutesLeft);
  const urgencyConf = getUrgencyConfig(urgency);
  const isAssignedToMe = callback.assignedAgent === currentAgent;
  const isPending = callback.status === 'pending';
  const isAssigned = callback.status === 'assigned';
  const isInProgress = callback.status === 'in-progress';
  const lockRemaining = 30 - lockMinutes;
  const canExtend = isInProgress && isAssignedToMe && (callback.extendCount || 0) < 3;

  const handlePickUp = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onPickUp(callback.id, currentAgent);
    } catch {
      // error toast handled in store
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (loading) return;
    onComplete(callback);
  };

  const handleForceRelease = () => {
    if (loading || !onForceRelease) return;
    onForceRelease(callback);
  };

  const handleExtend = async () => {
    if (loading || !onExtend) return;
    setLoading(true);
    try {
      await onExtend(callback.id);
    } catch {
      // error toast handled in store
    } finally {
      setLoading(false);
    }
  };

  const typeBadgeClass =
    callback.type === 'Supervisor Callback Request' ? 'type-badge-supervisor' :
    callback.type === 'Time-Sensitive Callback Request' ? 'type-badge-urgent' :
    'type-badge-normal';

  const typeShort =
    callback.type === 'Supervisor Callback Request' ? 'Supervisor' :
    callback.type === 'Time-Sensitive Callback Request' ? 'Time-Sensitive' :
    'Normal';

  return (
    <div className={`callback-card urgency-${urgency}`}>
      {/* Urgency Badge */}
      <div className="callback-urgency-badge">
        <div className="urgency-countdown" style={{ color: urgencyConf.color }}>
          {formatCountdown(minutesLeft)}
        </div>
        <div
          className="urgency-label"
          style={{ background: urgencyConf.bg, color: urgencyConf.color, border: `1px solid ${urgencyConf.border}` }}
        >
          {urgencyConf.label}
        </div>
      </div>

      {/* Info */}
      <div className="callback-info">
        <div className="callback-info-top">
          <span className="callback-id">{callback.id}</span>
          {callback.ticketLink ? (
            <a
              className="callback-ticket-link"
              href={callback.ticketLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {callback.ticketId} <ExternalLink size={11} />
            </a>
          ) : (
            <span className="callback-ticket">{callback.ticketId}</span>
          )}
          <span className={`type-badge ${typeBadgeClass}`}>{typeShort}</span>
          {callback.parentCallbackId && (
            <span className="followup-badge" title={`Follow-up from ${callback.parentCallbackId}`}>
              <GitBranch size={10} /> Follow-up
            </span>
          )}
        </div>
        <div className="callback-subject">{callback.subject}</div>
        <div className="callback-meta">
          <span className="callback-meta-item">
            <User size={12} /> {callback.customerName}
          </span>
          <span className="callback-meta-item">
            <Tag size={12} /> {callback.category}
          </span>
          <span className="callback-meta-item">
            <Clock size={12} /> {format(new Date(callback.createdAt), 'dd MMM, h:mm a')}
          </span>
          {callback.freshdeskAgent && (
            <span className="callback-meta-item">
              <UserCheck size={12} /> FD: {callback.freshdeskAgent}
            </span>
          )}
        </div>

        {/* Release tags */}
        {((callback.forceReleaseCount || 0) > 0 || (callback.autoReleaseCount || 0) > 0) && (
          <div className="release-tags">
            {(callback.forceReleaseCount || 0) > 0 && (
              <span className="release-tag release-tag-force">
                Force Released x{callback.forceReleaseCount}
              </span>
            )}
            {(callback.autoReleaseCount || 0) > 0 && (
              <span className="release-tag release-tag-auto">
                Auto Released x{callback.autoReleaseCount}
              </span>
            )}
          </div>
        )}

        {callback.followUpRequired && callback.followUpAt && (
          <div className="followup-indicator">
            Follow-up: {format(new Date(callback.followUpAt), 'dd MMM, h:mm a')}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="callback-status-col">
        <span className={`status-badge status-${callback.status}`}>
          {callback.status === 'in-progress' ? 'In Progress' :
           callback.status === 'assigned' ? 'Assigned' :
           callback.status.charAt(0).toUpperCase() + callback.status.slice(1)}
        </span>
        {(isAssigned || isInProgress) && callback.assignedAgent && (
          <span className="assigned-agent">{callback.assignedAgent}</span>
        )}
        {isInProgress && (
          <div className="lock-timer">
            <Lock size={11} />
            {lockRemaining > 0 ? `${lockRemaining}m left` : 'Releasing...'}
          </div>
        )}
        {isInProgress && (
          <div className="lock-progress-bar">
            <div
              className="lock-progress-fill"
              style={{ width: `${Math.min(100, (lockMinutes / 30) * 100)}%` }}
            />
          </div>
        )}
        {isInProgress && (callback.extendCount || 0) > 0 && (
          <div className="extend-count">Extended {callback.extendCount}/3</div>
        )}
      </div>

      {/* Actions */}
      <div className="callback-actions">
        {(isPending || (isAssigned && isAssignedToMe)) && (
          <button
            className="btn btn-sm btn-primary"
            onClick={handlePickUp}
            disabled={loading}
          >
            <Play size={13} />
            {loading ? 'Picking Up...' : 'Pick Up'}
          </button>
        )}
        {isAssigned && !isAssignedToMe && (
          <button className="btn btn-sm btn-secondary" disabled>
            <UserCheck size={13} />
            Assigned
          </button>
        )}
        {isInProgress && isAssignedToMe && (
          <>
            <button
              className="btn btn-sm btn-success"
              onClick={handleComplete}
              disabled={loading}
            >
              <CheckCircle size={13} />
              Complete
            </button>
            {canExtend && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleExtend}
                disabled={loading}
                title={`Extend timer (${(callback.extendCount || 0)}/3 used)`}
              >
                <RotateCcw size={13} />
                Extend
              </button>
            )}
          </>
        )}
        {isInProgress && !isAssignedToMe && isSupervisor && (
          <button
            className="btn btn-sm btn-warning"
            onClick={handleForceRelease}
            disabled={loading}
          >
            <Lock size={13} />
            {loading ? 'Releasing...' : 'Force Release'}
          </button>
        )}
        {isInProgress && !isAssignedToMe && !isSupervisor && (
          <button className="btn btn-sm btn-secondary" disabled>
            <Lock size={13} />
            Locked
          </button>
        )}
      </div>
    </div>
  );
}
