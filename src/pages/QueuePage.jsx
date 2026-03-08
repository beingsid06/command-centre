import { useState, useMemo } from 'react';
import { Search, RefreshCw, AlertTriangle, Clock, CheckCircle, Activity, UserCheck } from 'lucide-react';
import { useStore } from '../hooks/useCallbackStore';
import { useAuth } from '../hooks/useAuth';
import { getTimeRemaining, getUrgencyLevel } from '../utils/slaEngine';
import CallbackCard from '../components/CallbackCard';
import CompletionModal from '../components/CompletionModal';
import ForceReleaseModal from '../components/ForceReleaseModal';

const TYPE_TABS = ['All', 'Normal Callback Request', 'Time-Sensitive Callback Request', 'Supervisor Callback Request'];
const TYPE_SHORT = { 'All': 'All', 'Normal Callback Request': 'Normal', 'Time-Sensitive Callback Request': 'Time-Sensitive', 'Supervisor Callback Request': 'Supervisor' };

const URGENCY_CHIPS = ['all', 'breached', 'critical', 'urgent', 'monitoring', 'safe'];

export default function QueuePage() {
  const { state, pickUp, complete, forceRelease, extendCallback, getStats, refreshData } = useStore();
  const { currentUser, isSupervisor } = useAuth();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [completingCallback, setCompletingCallback] = useState(null);
  const [forceReleaseCallback, setForceReleaseCallback] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const stats = getStats();

  // Derive categories dynamically from actual callback data
  const categories = useMemo(() => {
    const cats = new Set();
    state.callbacks.forEach(c => { if (c.category) cats.add(c.category); });
    return [...cats].sort();
  }, [state.callbacks]);

  const active = useMemo(() => {
    return state.callbacks
      .filter(c => c.status === 'pending' || c.status === 'assigned' || c.status === 'in-progress')
      .filter(c => {
        if (activeTab !== 'All' && c.type !== activeTab) return false;
        if (urgencyFilter !== 'all' && getUrgencyLevel(getTimeRemaining(c.deadline)) !== urgencyFilter) return false;
        if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            c.id?.toLowerCase().includes(q) ||
            c.ticketId?.toLowerCase().includes(q) ||
            c.subject?.toLowerCase().includes(q) ||
            c.customerName?.toLowerCase().includes(q) ||
            c.assignedAgent?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const order = { breached: 0, critical: 1, urgent: 2, monitoring: 3, safe: 4 };
        const ua = getUrgencyLevel(getTimeRemaining(a.deadline));
        const ub = getUrgencyLevel(getTimeRemaining(b.deadline));
        return (order[ua] ?? 5) - (order[ub] ?? 5);
      });
  }, [state.callbacks, activeTab, urgencyFilter, categoryFilter, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleComplete = async (id, notes, followUpRequired, followUpAt) => {
    await complete(id, notes, followUpRequired, followUpAt);
  };

  const handleForceRelease = async (id, notes) => {
    await forceRelease(id, notes);
  };

  return (
    <div className="page">
      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Active</div>
        </div>
        <div className="stat-card stat-danger">
          <AlertTriangle size={14} />
          <div className="stat-value">{stats.breached}</div>
          <div className="stat-label">Breached</div>
        </div>
        <div className="stat-card stat-critical">
          <div className="stat-value">{stats.critical + stats.urgent}</div>
          <div className="stat-label">Critical / Urgent</div>
        </div>
        <div className="stat-card">
          <UserCheck size={14} />
          <div className="stat-value">{stats.assigned}</div>
          <div className="stat-label">Assigned</div>
        </div>
        <div className="stat-card">
          <Activity size={14} />
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card stat-success">
          <CheckCircle size={14} />
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <Clock size={14} />
          <div className="stat-value">{stats.slaRate}%</div>
          <div className="stat-label">SLA Rate</div>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="type-tabs">
        {TYPE_TABS.map(tab => (
          <button
            key={tab}
            className={`type-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TYPE_SHORT[tab]}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="filters-row">
        <div className="search-box">
          <Search size={15} />
          <input
            className="search-input"
            placeholder="Search ID, ticket, subject, customer, agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>x</button>
          )}
        </div>

        <div className="urgency-chips">
          {URGENCY_CHIPS.map(chip => (
            <button
              key={chip}
              className={`chip chip-${chip} ${urgencyFilter === chip ? 'active' : ''}`}
              onClick={() => setUrgencyFilter(chip)}
            >
              {chip === 'all' ? 'All Urgency' : chip.charAt(0).toUpperCase() + chip.slice(1)}
            </button>
          ))}
        </div>

        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          className={`btn btn-sm btn-secondary icon-btn ${refreshing ? 'spin' : ''}`}
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Queue List */}
      {state.loading ? (
        <div className="empty-state">Loading callbacks...</div>
      ) : active.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={40} style={{ opacity: 0.3 }} />
          <p>No callbacks match your filters</p>
        </div>
      ) : (
        <div className="callback-list">
          {active.map(cb => (
            <CallbackCard
              key={cb.id}
              callback={cb}
              currentAgent={currentUser?.name}
              isSupervisor={isSupervisor}
              onPickUp={pickUp}
              onComplete={(callback) => setCompletingCallback(callback)}
              onForceRelease={(callback) => setForceReleaseCallback(callback)}
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
