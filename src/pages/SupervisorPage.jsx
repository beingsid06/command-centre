import { useMemo, useState } from 'react';
import { Shield, AlertTriangle, Lock, UserCheck, Users, CheckSquare, ArrowLeftRight, Undo2 } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { useStore } from '../hooks/useCallbackStore';
import { useAuth } from '../hooks/useAuth';
import { getTimeRemaining, getUrgencyLevel, formatCountdown } from '../utils/slaEngine';
import ForceReleaseModal from '../components/ForceReleaseModal';

export default function SupervisorPage() {
  const { state, forceRelease, bulkForceRelease, assignCallback, bulkAssign, unassignCallback, reassignCallback, getStats } = useStore();
  const { users } = useAuth();
  const stats = getStats();

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAgent, setBulkAgent] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Force release state
  const [forceReleaseTarget, setForceReleaseTarget] = useState(null); // single callback
  const [bulkForceReleaseIds, setBulkForceReleaseIds] = useState(null); // array of ids
  const [selectedInProgressIds, setSelectedInProgressIds] = useState([]);
  const [reassignTarget, setReassignTarget] = useState(null); // { id, currentAgent }
  const [reassignAgent, setReassignAgent] = useState('');

  // Agent users only
  const agentUsers = useMemo(() =>
    users.filter(u => u.active && (u.role === 'Agent' || u.role === 'Supervisor')),
    [users]
  );

  const inProgress = useMemo(() =>
    state.callbacks.filter(c => c.status === 'in-progress'),
    [state.callbacks]
  );

  const assigned = useMemo(() =>
    state.callbacks.filter(c => c.status === 'assigned'),
    [state.callbacks]
  );

  const pending = useMemo(() =>
    state.callbacks
      .filter(c => c.status === 'pending')
      .sort((a, b) => {
        const ord = { breached: 0, critical: 1, urgent: 2, monitoring: 3, safe: 4 };
        return (ord[getUrgencyLevel(getTimeRemaining(a.deadline))] ?? 5) -
               (ord[getUrgencyLevel(getTimeRemaining(b.deadline))] ?? 5);
      }),
    [state.callbacks]
  );

  const breachedPending = useMemo(() =>
    pending.filter(c => getUrgencyLevel(getTimeRemaining(c.deadline)) === 'breached'),
    [pending]
  );

  // Agent assignment map: { agentName -> { assigned: [], inProgress: [] } }
  const agentMap = useMemo(() => {
    const map = {};
    [...inProgress, ...assigned].forEach(cb => {
      const agent = cb.assignedAgent || 'Unassigned';
      if (!map[agent]) map[agent] = { assigned: [], inProgress: [], pending: 0 };
      if (cb.status === 'in-progress') map[agent].inProgress.push(cb);
      else map[agent].assigned.push(cb);
    });
    // Add pending count from callbacks not yet assigned
    return map;
  }, [inProgress, assigned]);

  const handleForceReleaseSingle = async (id, notes) => {
    await forceRelease(id, notes);
  };

  const handleBulkForceRelease = async (ids, notes) => {
    await bulkForceRelease(ids, notes);
    setSelectedInProgressIds([]);
  };

  const handleUnassign = async (id) => {
    await unassignCallback(id);
  };

  const handleReassign = async (id) => {
    if (!reassignAgent) return;
    await reassignCallback(id, reassignAgent);
    setReassignTarget(null);
    setReassignAgent('');
  };

  const handleBulkAssign = async () => {
    if (!bulkAgent || selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await bulkAssign(selectedIds, bulkAgent);
      setSelectedIds([]);
      setBulkAgent('');
    } catch {}
    setBulkLoading(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pending.length) setSelectedIds([]);
    else setSelectedIds(pending.map(c => c.id));
  };

  const toggleInProgressSelect = (id) => {
    setSelectedInProgressIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <Shield size={22} />
          <div>
            <h2>Supervisor View</h2>
            <p>Monitor agents, force-release locks, and bulk assign callbacks</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.assigned}</div>
          <div className="stat-label">Assigned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-value">{breachedPending.length}</div>
          <div className="stat-label">Breached Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Object.keys(agentMap).length}</div>
          <div className="stat-label">Active Agents</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-value">{stats.slaRate}%</div>
          <div className="stat-label">SLA Rate</div>
        </div>
      </div>

      {/* Agent Assignment Map */}
      <div className="supervisor-section">
        <div className="section-title">
          <UserCheck size={16} /> Agent Assignments
        </div>
        {Object.keys(agentMap).length === 0 ? (
          <div className="section-empty">No callbacks currently assigned or in progress.</div>
        ) : (
          <div className="agent-grid">
            {Object.entries(agentMap).map(([agent, data]) => (
              <div key={agent} className="agent-card">
                <div className="agent-card-header">
                  <div className="agent-avatar">{agent[0]?.toUpperCase()}</div>
                  <div>
                    <div className="agent-name">{agent}</div>
                    <div className="agent-count">
                      {data.assigned.length} assigned, {data.inProgress.length} in-progress
                    </div>
                  </div>
                </div>
                <div className="agent-callbacks">
                  {data.assigned.map(cb => {
                    const urgency = getUrgencyLevel(getTimeRemaining(cb.deadline));
                    return (
                      <div key={cb.id} className={`agent-callback-row urgency-row-${urgency}`}>
                        <div className="agent-cb-info">
                          <span className="agent-cb-id">{cb.id}</span>
                          <span className="agent-cb-subject">{cb.subject}</span>
                        </div>
                        <div className="agent-cb-meta">
                          <span className="status-badge status-assigned" style={{ fontSize: 10, padding: '1px 6px' }}>Assigned</span>
                          <span className={`urgency-mini urgency-mini-${urgency}`}>
                            {formatCountdown(getTimeRemaining(cb.deadline))}
                          </span>
                        </div>
                        <div className="agent-cb-actions">
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleUnassign(cb.id)}
                            title="Unassign (back to queue)"
                          >
                            <Undo2 size={11} /> Unassign
                          </button>
                          {reassignTarget?.id === cb.id ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <select
                                className="filter-select"
                                value={reassignAgent}
                                onChange={e => setReassignAgent(e.target.value)}
                                style={{ fontSize: 11, padding: '2px 4px' }}
                              >
                                <option value="">Select agent...</option>
                                {agentUsers.filter(u => u.name !== agent).map(u => (
                                  <option key={u.email} value={u.name}>{u.name}</option>
                                ))}
                              </select>
                              <button className="btn btn-xs btn-primary" onClick={() => handleReassign(cb.id)} disabled={!reassignAgent}>Go</button>
                              <button className="btn btn-xs btn-secondary" onClick={() => { setReassignTarget(null); setReassignAgent(''); }}>X</button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => { setReassignTarget({ id: cb.id, currentAgent: agent }); setReassignAgent(''); }}
                              title="Reassign to another agent"
                            >
                              <ArrowLeftRight size={11} /> Reassign
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {data.inProgress.map(cb => {
                    const elapsed = cb.pickedUpAt ? differenceInMinutes(new Date(), new Date(cb.pickedUpAt)) : 0;
                    const urgency = getUrgencyLevel(getTimeRemaining(cb.deadline));
                    return (
                      <div key={cb.id} className={`agent-callback-row urgency-row-${urgency}`}>
                        <input
                          type="checkbox"
                          checked={selectedInProgressIds.includes(cb.id)}
                          onChange={() => toggleInProgressSelect(cb.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ marginRight: 6 }}
                        />
                        <div className="agent-cb-info">
                          <span className="agent-cb-id">{cb.id}</span>
                          <span className="agent-cb-subject">{cb.subject}</span>
                        </div>
                        <div className="agent-cb-meta">
                          <span className="lock-elapsed">
                            <Lock size={11} /> {elapsed}m / 30m
                          </span>
                          <span className={`urgency-mini urgency-mini-${urgency}`}>
                            {formatCountdown(getTimeRemaining(cb.deadline))}
                          </span>
                        </div>
                        <div className="agent-cb-actions">
                          <button
                            className="btn btn-xs btn-warning"
                            onClick={() => setForceReleaseTarget(cb)}
                          >
                            Force Release
                          </button>
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleUnassign(cb.id)}
                            title="Unassign (back to queue)"
                          >
                            <Undo2 size={11} /> Unassign
                          </button>
                          {reassignTarget?.id === cb.id ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <select
                                className="filter-select"
                                value={reassignAgent}
                                onChange={e => setReassignAgent(e.target.value)}
                                style={{ fontSize: 11, padding: '2px 4px' }}
                              >
                                <option value="">Select agent...</option>
                                {agentUsers.filter(u => u.name !== agent).map(u => (
                                  <option key={u.email} value={u.name}>{u.name}</option>
                                ))}
                              </select>
                              <button className="btn btn-xs btn-primary" onClick={() => handleReassign(cb.id)} disabled={!reassignAgent}>Go</button>
                              <button className="btn btn-xs btn-secondary" onClick={() => { setReassignTarget(null); setReassignAgent(''); }}>X</button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => { setReassignTarget({ id: cb.id, currentAgent: agent }); setReassignAgent(''); }}
                              title="Reassign to another agent"
                            >
                              <ArrowLeftRight size={11} /> Reassign
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bulk Force Release Bar */}
        {selectedInProgressIds.length > 0 && (
          <div className="bulk-assign-bar" style={{ marginTop: 12 }}>
            <span className="bulk-selected-count">{selectedInProgressIds.length} in-progress selected</span>
            <button
              className="btn btn-sm btn-warning"
              onClick={() => setBulkForceReleaseIds(selectedInProgressIds)}
            >
              Bulk Force Release ({selectedInProgressIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Breached SLAs */}
      {breachedPending.length > 0 && (
        <div className="supervisor-section">
          <div className="section-title alert-title">
            <AlertTriangle size={16} /> Breached SLA -- Pending ({breachedPending.length})
          </div>
          <div className="breached-list">
            {breachedPending.map(cb => (
              <div key={cb.id} className="breached-row">
                <span className="breached-id">{cb.id}</span>
                <span className="breached-subject">{cb.subject}</span>
                <span className="breached-time">{formatCountdown(getTimeRemaining(cb.deadline))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Assign */}
      <div className="supervisor-section">
        <div className="section-title">
          <Users size={16} /> Bulk Assign Pending Callbacks
        </div>
        <div className="bulk-assign-bar">
          <button
            className="btn btn-sm btn-secondary"
            onClick={toggleSelectAll}
          >
            <CheckSquare size={14} />
            {selectedIds.length === pending.length && pending.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <span className="bulk-selected-count">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select callbacks below'}
          </span>
          <select
            className="filter-select"
            value={bulkAgent}
            onChange={e => setBulkAgent(e.target.value)}
          >
            <option value="">Assign to agent...</option>
            {agentUsers.map(u => <option key={u.email} value={u.name}>{u.name}</option>)}
          </select>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleBulkAssign}
            disabled={selectedIds.length === 0 || !bulkAgent || bulkLoading}
          >
            {bulkLoading ? 'Assigning...' : `Assign ${selectedIds.length > 0 ? selectedIds.length : ''}`}
          </button>
        </div>

        {pending.length === 0 ? (
          <div className="section-empty">No pending callbacks to assign.</div>
        ) : (
          <div className="bulk-list">
            {pending.map(cb => {
              const urgency = getUrgencyLevel(getTimeRemaining(cb.deadline));
              return (
                <div
                  key={cb.id}
                  className={`bulk-row ${selectedIds.includes(cb.id) ? 'selected' : ''}`}
                  onClick={() => toggleSelect(cb.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(cb.id)}
                    onChange={() => toggleSelect(cb.id)}
                    onClick={e => e.stopPropagation()}
                  />
                  <span className={`urgency-dot urgency-dot-${urgency}`} />
                  <span className="bulk-row-id">{cb.id}</span>
                  <span className="bulk-row-subject">{cb.subject}</span>
                  <span className="bulk-row-category">{cb.category}</span>
                  <span className={`urgency-mini urgency-mini-${urgency}`}>
                    {formatCountdown(getTimeRemaining(cb.deadline))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Force Release Modal - Single */}
      {forceReleaseTarget && (
        <ForceReleaseModal
          callback={forceReleaseTarget}
          onClose={() => setForceReleaseTarget(null)}
          onSubmit={handleForceReleaseSingle}
        />
      )}

      {/* Force Release Modal - Bulk */}
      {bulkForceReleaseIds && (
        <ForceReleaseModal
          bulk={bulkForceReleaseIds}
          onClose={() => setBulkForceReleaseIds(null)}
          onSubmit={handleBulkForceRelease}
        />
      )}
    </div>
  );
}
