import { useState, useMemo } from 'react';
import { Inbox, CheckCircle, Clock } from 'lucide-react';
import { useStore } from '../hooks/useCallbackStore';
import { useAuth } from '../hooks/useAuth';
import { getTimeRemaining, getUrgencyLevel } from '../utils/slaEngine';
import CallbackCard from '../components/CallbackCard';
import CompletionModal from '../components/CompletionModal';
import ForceReleaseModal from '../components/ForceReleaseModal';

export default function MyQueuePage() {
  const { state, pickUp, complete, forceRelease, extendCallback } = useStore();
  const { currentUser, isSupervisor } = useAuth();
  const [completingCallback, setCompletingCallback] = useState(null);
  const [forceReleaseCallback, setForceReleaseCallback] = useState(null);

  const myCallbacks = useMemo(() => {
    if (!currentUser) return [];
    return state.callbacks
      .filter(c => c.assignedAgent === currentUser.name && (c.status === 'assigned' || c.status === 'in-progress'))
      .sort((a, b) => {
        const order = { breached: 0, critical: 1, urgent: 2, monitoring: 3, safe: 4 };
        const ua = getUrgencyLevel(getTimeRemaining(a.deadline));
        const ub = getUrgencyLevel(getTimeRemaining(b.deadline));
        return (order[ua] ?? 5) - (order[ub] ?? 5);
      });
  }, [state.callbacks, currentUser]);

  const handleComplete = async (id, notes, followUpRequired, followUpAt) => {
    await complete(id, notes, followUpRequired, followUpAt);
  };

  const handleForceRelease = async (id, notes) => {
    await forceRelease(id, notes);
  };

  const assignedCount = myCallbacks.filter(c => c.status === 'assigned').length;
  const inProgressCount = myCallbacks.filter(c => c.status === 'in-progress').length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <Inbox size={22} />
          <div>
            <h2>My Queue</h2>
            <p>Callbacks assigned to or picked up by you</p>
          </div>
        </div>
        <div className="page-header-stats">
          <div className="mini-stat">
            <span className="mini-stat-value">{myCallbacks.length}</span>
            <span className="mini-stat-label">Active</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{assignedCount}</span>
            <span className="mini-stat-label">Assigned</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{inProgressCount}</span>
            <span className="mini-stat-label">In Progress</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">
              {myCallbacks.filter(c => getUrgencyLevel(getTimeRemaining(c.deadline)) === 'breached').length}
            </span>
            <span className="mini-stat-label">Breached</span>
          </div>
        </div>
      </div>

      {state.loading ? (
        <div className="empty-state">Loading...</div>
      ) : myCallbacks.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={40} style={{ opacity: 0.3 }} />
          <p>Your queue is clear -- well done!</p>
          <small>Pick up callbacks from the Live Queue to see them here.</small>
        </div>
      ) : (
        <div className="callback-list">
          {myCallbacks.map(cb => (
            <CallbackCard
              key={cb.id}
              callback={cb}
              currentAgent={currentUser?.name}
              isSupervisor={isSupervisor}
              onPickUp={pickUp}
              onComplete={(callback) => setCompletingCallback(callback)}
              onForceRelease={isSupervisor ? (callback) => setForceReleaseCallback(callback) : null}
              onExtend={extendCallback}
            />
          ))}
        </div>
      )}

      {completingCallback && (
        <CompletionModal
          callback={completingCallback}
          onClose={() => setCompletingCallback(null)}
          onSubmit={handleComplete}
        />
      )}

      {forceReleaseCallback && (
        <ForceReleaseModal
          callback={forceReleaseCallback}
          onClose={() => setForceReleaseCallback(null)}
          onSubmit={handleForceRelease}
        />
      )}
    </div>
  );
}
