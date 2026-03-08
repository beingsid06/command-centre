import { useState, useMemo } from 'react';
import { TrendingUp, CheckCircle2, XCircle, Clock, BarChart3, Users, Calendar, Activity, Download } from 'lucide-react';
import { useStore } from '../hooks/useCallbackStore';
import { format, getHours, startOfWeek, addDays, isToday, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, differenceInMinutes } from 'date-fns';
import { getTimeRemaining, getUrgencyLevel } from '../utils/slaEngine';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9);

const PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function getDateRange(period, customStart, customEnd) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week': {
      const ws = startOfWeek(now, { weekStartsOn: 1 });
      return { start: startOfDay(ws), end: endOfDay(now) };
    }
    case 'month': {
      const ms = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfDay(ms), end: endOfDay(now) };
    }
    case 'custom':
      return {
        start: customStart ? startOfDay(new Date(customStart)) : startOfDay(subDays(now, 30)),
        end: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now),
      };
    default:
      return null; // all time
  }
}

function isInRange(dateStr, range) {
  if (!range) return true;
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    return d >= range.start && d <= range.end;
  } catch { return false; }
}

function downloadDashboardCSV(callbacks, filename) {
  const headers = ['ID','Ticket ID','Customer','Subject','Category','Type','Status','Agent','Created','Deadline','Completed','SLA Met','Follow-up'];
  const rows = callbacks.map(cb => [
    cb.id, cb.ticketId, `"${(cb.customerName||'').replace(/"/g,'""')}"`,
    `"${(cb.subject||'').replace(/"/g,'""')}"`, cb.category, cb.type, cb.status,
    cb.assignedAgent || '', cb.createdAt || '', cb.deadline || '', cb.completedAt || '',
    cb.completedAt && cb.deadline ? (new Date(cb.completedAt) <= new Date(cb.deadline) ? 'Yes' : 'No') : '',
    cb.followUpRequired ? 'Yes' : 'No',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const { state, getStats } = useStore();
  const stats = getStats();

  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState(fmtDate(subDays(new Date(), 30)));
  const [customEnd, setCustomEnd] = useState(fmtDate(new Date()));

  const range = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);

  // Filtered callbacks based on period
  const filtered = useMemo(() => {
    if (!range) return state.callbacks;
    return state.callbacks.filter(cb => isInRange(cb.createdAt, range));
  }, [state.callbacks, range]);

  const filteredCompleted = useMemo(() => filtered.filter(c => c.status === 'completed'), [filtered]);
  const filteredActive = useMemo(() => filtered.filter(c => c.status === 'pending' || c.status === 'assigned' || c.status === 'in-progress'), [filtered]);

  // Period stats
  const periodStats = useMemo(() => {
    const total = filtered.length;
    const completed = filteredCompleted.length;
    const pending = filtered.filter(c => c.status === 'pending').length;
    const assigned = filtered.filter(c => c.status === 'assigned').length;
    const inProgress = filtered.filter(c => c.status === 'in-progress').length;
    const withFollowUp = filtered.filter(c => c.followUpRequired).length;

    let withinSLA = 0;
    let postSLA = 0;
    filteredCompleted.forEach(c => {
      if (c.completedAt && c.deadline) {
        new Date(c.completedAt) <= new Date(c.deadline) ? withinSLA++ : postSLA++;
      }
    });
    const slaRate = completed > 0 ? Math.round((withinSLA / completed) * 100) : 100;

    const autoReleased = filtered.reduce((sum, c) => sum + (c.autoReleaseCount || 0), 0);
    const forceReleased = filtered.reduce((sum, c) => sum + (c.forceReleaseCount || 0), 0);

    return { total, completed, pending, assigned, inProgress, withinSLA, postSLA, slaRate, withFollowUp, autoReleased, forceReleased };
  }, [filtered, filteredCompleted]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map = {};
    filtered.forEach(cb => {
      const cat = cb.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + 1;
    });
    const total = filtered.length || 1;
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Callback type breakdown
  const typeData = useMemo(() => {
    const map = {};
    filtered.forEach(cb => {
      const t = cb.type || 'Unknown';
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  }, [filtered]);

  // Volume trend (last 7 or 30 days)
  const volumeData = useMemo(() => {
    const days = period === 'month' ? 30 : period === 'week' ? 7 : period === 'today' ? 1 : 14;
    const now = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayCbs = state.callbacks.filter(cb => {
        if (!cb.createdAt) return false;
        const d = new Date(cb.createdAt);
        return d >= dayStart && d <= dayEnd;
      });
      const normal = dayCbs.filter(c => c.type === 'Normal Callback Request').length;
      const timeSensitive = dayCbs.filter(c => c.type === 'Time-Sensitive Callback Request').length;
      const supervisor = dayCbs.filter(c => c.type === 'Supervisor Callback Request').length;
      result.push({
        label: days <= 7 ? format(day, 'EEE') : format(day, 'dd MMM'),
        total: dayCbs.length,
        normal,
        timeSensitive,
        supervisor,
        isToday: isToday(day),
      });
    }
    return result;
  }, [state.callbacks, period]);

  const maxVolume = Math.max(...volumeData.map(d => d.total), 1);

  // Agent performance
  const agentPerformance = useMemo(() => {
    const agents = {};
    filtered.forEach(cb => {
      if (!cb.assignedAgent) return;
      if (!agents[cb.assignedAgent]) {
        agents[cb.assignedAgent] = { name: cb.assignedAgent, picked: 0, completed: 0, totalPickupMins: 0, totalCompletionMins: 0, withinSLA: 0, followUps: 0 };
      }
      const a = agents[cb.assignedAgent];
      a.picked++;
      if (cb.status === 'completed') {
        a.completed++;
        if (cb.completedAt && cb.deadline) {
          if (new Date(cb.completedAt) <= new Date(cb.deadline)) a.withinSLA++;
        }
        if (cb.pickedUpAt && cb.completedAt) {
          a.totalCompletionMins += differenceInMinutes(new Date(cb.completedAt), new Date(cb.pickedUpAt));
        }
      }
      if (cb.createdAt && cb.pickedUpAt) {
        a.totalPickupMins += differenceInMinutes(new Date(cb.pickedUpAt), new Date(cb.createdAt));
      }
      if (cb.followUpRequired) a.followUps++;
    });

    return Object.values(agents)
      .map(a => ({
        ...a,
        avgPickup: a.picked > 0 ? Math.round(a.totalPickupMins / a.picked) : 0,
        avgCompletion: a.completed > 0 ? Math.round(a.totalCompletionMins / a.completed) : 0,
        slaPct: a.completed > 0 ? Math.round((a.withinSLA / a.completed) * 100) : 100,
      }))
      .sort((a, b) => b.completed - a.completed);
  }, [filtered]);

  // Response time analysis (overall)
  const responseAnalysis = useMemo(() => {
    let totalPickup = 0, pickupCount = 0;
    let totalCompletion = 0, completionCount = 0;

    filtered.forEach(cb => {
      if (cb.createdAt && cb.pickedUpAt) {
        totalPickup += differenceInMinutes(new Date(cb.pickedUpAt), new Date(cb.createdAt));
        pickupCount++;
      }
      if (cb.pickedUpAt && cb.completedAt) {
        totalCompletion += differenceInMinutes(new Date(cb.completedAt), new Date(cb.pickedUpAt));
        completionCount++;
      }
    });

    return {
      avgPickupMins: pickupCount > 0 ? Math.round(totalPickup / pickupCount) : 0,
      avgCompletionMins: completionCount > 0 ? Math.round(totalCompletion / completionCount) : 0,
      pickupCount,
      completionCount,
    };
  }, [filtered]);

  function formatMins(mins) {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // Urgency distribution (active only, always real-time)
  const urgencyDistribution = useMemo(() => {
    const dist = { breached: 0, critical: 0, urgent: 0, monitoring: 0, safe: 0 };
    state.callbacks
      .filter(c => c.status === 'pending')
      .forEach(c => {
        const level = getUrgencyLevel(getTimeRemaining(c.deadline));
        dist[level]++;
      });
    return dist;
  }, [state.callbacks]);

  // Heatmap
  const heatmapData = useMemo(() => {
    const grid = {};
    HOURS.forEach(h => { grid[h] = {}; DAYS.forEach(d => { grid[h][d] = 0; }); });
    filtered.forEach(cb => {
      const deadline = new Date(cb.deadline);
      const hour = getHours(deadline);
      const day = format(deadline, 'EEE');
      if (grid[hour] && grid[hour][day] !== undefined) grid[hour][day]++;
    });
    return grid;
  }, [filtered]);

  const getHeatLevel = (count) => {
    if (count === 0) return 0;
    if (count <= 1) return 1;
    if (count <= 2) return 2;
    if (count <= 3) return 3;
    if (count <= 5) return 4;
    return 5;
  };

  const alertRows = [
    { emoji: '\u{1F534}', label: 'SLA Breached', sublabel: 'Immediate action needed', count: stats.breached, color: '#DC2626', bg: '#FEE2E2' },
    { emoji: '\u{1F7E0}', label: 'At Risk (<30m)', sublabel: 'Critical & nearing breach', count: stats.critical, color: '#D84100', bg: '#FFF3EB' },
    { emoji: '\u{1F7E1}', label: 'Urgent (1-2h)', sublabel: 'Needs attention soon', count: stats.urgent, color: '#B45309', bg: '#FEF3C7' },
    { emoji: '\u{1F535}', label: 'Monitoring (2-4h)', sublabel: 'Under observation', count: stats.monitoring, color: '#2563EB', bg: '#EFF6FF' },
    { emoji: '\u{1F7E2}', label: 'On Track (>4h)', sublabel: 'Healthy SLA buffer', count: stats.safe, color: '#059669', bg: '#ECFDF5' },
  ];

  const maxCat = Math.max(...categoryData.map(c => c.count), 1);

  return (
    <div>
      {/* Period Selector */}
      <div className="dashboard-period-bar">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`period-btn ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => downloadDashboardCSV(filtered, `dashboard-${fmtDate(new Date())}.csv`)}
          title="Download dashboard data as CSV"
          style={{ marginLeft: 'auto' }}
        >
          <Download size={14} /> CSV
        </button>
        {period === 'custom' && (
          <div className="period-custom-range">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="period-date-input" />
            <span style={{ color: 'var(--scapia-gray-400)', fontSize: 12 }}>to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="period-date-input" />
          </div>
        )}
      </div>

      {/* Top Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: '#EFF6FF' }}>
              <BarChart3 size={18} color="#2563EB" />
            </div>
          </div>
          <div className="stat-card-value">{periodStats.total}</div>
          <div className="stat-card-label">Total Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: '#ECFDF5' }}>
              <CheckCircle2 size={18} color="#059669" />
            </div>
          </div>
          <div className="stat-card-value">{periodStats.completed}</div>
          <div className="stat-card-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: '#ECFDF5' }}>
              <TrendingUp size={18} color="#059669" />
            </div>
          </div>
          <div className="stat-card-value">{periodStats.slaRate}%</div>
          <div className="stat-card-label">Within SLA</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: '#FEE2E2' }}>
              <XCircle size={18} color="#DC2626" />
            </div>
          </div>
          <div className="stat-card-value">{periodStats.postSLA}</div>
          <div className="stat-card-label">Post SLA</div>
        </div>
      </div>

      {/* Category Breakdown + Volume Trends */}
      <div className="monitoring-grid">
        {/* Category Breakdown */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Category Breakdown</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{filtered.length} callbacks</span>
          </div>
          <div className="panel-body">
            {categoryData.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--scapia-gray-400)', fontSize: 13, padding: 20 }}>No data for this period</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categoryData.map(cat => (
                  <div key={cat.name} className="bar-row">
                    <div className="bar-label">{cat.name}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(cat.count / maxCat) * 100}%` }} />
                    </div>
                    <div className="bar-value">{cat.count} <span style={{ color: 'var(--scapia-gray-400)', fontSize: 11 }}>({cat.pct}%)</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Callback Type Breakdown */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Request Type Breakdown</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'Normal Callback Request', label: 'Normal', color: 'var(--scapia-gray-500)', bg: 'var(--scapia-gray-200)' },
                { key: 'Time-Sensitive Callback Request', label: 'Time-Sensitive', color: 'var(--scapia-orange)', bg: '#FDDCBF' },
                { key: 'Supervisor Callback Request', label: 'Supervisor', color: 'var(--scapia-red)', bg: '#FECACA' },
              ].map(t => {
                const count = typeData[t.key] || 0;
                const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                return (
                  <div key={t.key} className="bar-row">
                    <div className="bar-label">{t.label}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: t.color }} />
                    </div>
                    <div className="bar-value">{count} <span style={{ color: 'var(--scapia-gray-400)', fontSize: 11 }}>({pct}%)</span></div>
                  </div>
                );
              })}
            </div>

            {/* Status summary */}
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ textAlign: 'center', background: 'var(--scapia-gray-50)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--scapia-gray-800)' }}>{periodStats.pending}</div>
                <div style={{ fontSize: 11, color: 'var(--scapia-gray-400)', fontWeight: 600 }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center', background: '#E0F2FE', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0284C7' }}>{periodStats.assigned}</div>
                <div style={{ fontSize: 11, color: 'var(--scapia-gray-400)', fontWeight: 600 }}>Assigned</div>
              </div>
              <div style={{ textAlign: 'center', background: 'var(--scapia-blue-bg)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--scapia-blue)' }}>{periodStats.inProgress}</div>
                <div style={{ fontSize: 11, color: 'var(--scapia-gray-400)', fontWeight: 600 }}>In Progress</div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ textAlign: 'center', background: 'var(--scapia-yellow-bg)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--scapia-yellow)' }}>{periodStats.withFollowUp}</div>
                <div style={{ fontSize: 11, color: 'var(--scapia-gray-400)', fontWeight: 600 }}>Follow-ups</div>
              </div>
              <div style={{ textAlign: 'center', background: '#FEF3C7', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#B45309' }}>{periodStats.autoReleased}</div>
                <div style={{ fontSize: 11, color: 'var(--scapia-gray-400)', fontWeight: 600 }}>Auto Released</div>
              </div>
              <div style={{ textAlign: 'center', background: '#FEE2E2', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#DC2626' }}>{periodStats.forceReleased}</div>
                <div style={{ fontSize: 11, color: 'var(--scapia-gray-400)', fontWeight: 600 }}>Force Released</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Trend Chart */}
      {volumeData.length > 1 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <span className="panel-title">Callback Volume Trend</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {volumeData.length} days
            </span>
          </div>
          <div className="panel-body">
            <div className="volume-chart">
              {volumeData.map((d, i) => (
                <div key={i} className={`volume-bar-col ${d.isToday ? 'today' : ''}`}>
                  <div className="vol-count">{d.total || ''}</div>
                  <div className="vol-stack" style={{ height: `${(d.total / maxVolume) * 120}px` }}>
                    {d.supervisor > 0 && <div className="vol-seg vol-supervisor" style={{ flex: d.supervisor }} title={`Supervisor: ${d.supervisor}`} />}
                    {d.timeSensitive > 0 && <div className="vol-seg vol-time-sensitive" style={{ flex: d.timeSensitive }} title={`Time-Sensitive: ${d.timeSensitive}`} />}
                    {d.normal > 0 && <div className="vol-seg vol-normal" style={{ flex: d.normal }} title={`Normal: ${d.normal}`} />}
                  </div>
                  <div className="vol-label">{d.label}</div>
                </div>
              ))}
            </div>
            <div className="volume-legend">
              <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--scapia-gray-400)' }} /> Normal</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--scapia-orange)' }} /> Time-Sensitive</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--scapia-red)' }} /> Supervisor</span>
            </div>
          </div>
        </div>
      )}

      {/* Response Time Analysis */}
      <div className="response-time-grid" style={{ marginBottom: 24 }}>
        <div className="response-time-card">
          <Clock size={20} color="var(--scapia-blue)" />
          <div className="rt-value">{formatMins(responseAnalysis.avgPickupMins)}</div>
          <div className="rt-label">Avg Pickup Time</div>
          <div className="rt-sublabel">{responseAnalysis.pickupCount} callbacks picked</div>
        </div>
        <div className="response-time-card">
          <Activity size={20} color="var(--scapia-green)" />
          <div className="rt-value">{formatMins(responseAnalysis.avgCompletionMins)}</div>
          <div className="rt-label">Avg Handling Time</div>
          <div className="rt-sublabel">{responseAnalysis.completionCount} callbacks completed</div>
        </div>
        <div className="response-time-card">
          <TrendingUp size={20} color={periodStats.slaRate >= 90 ? 'var(--scapia-green)' : 'var(--scapia-orange)'} />
          <div className="rt-value" style={{ color: periodStats.slaRate >= 90 ? 'var(--scapia-green)' : 'var(--scapia-orange)' }}>{periodStats.slaRate}%</div>
          <div className="rt-label">SLA Compliance</div>
          <div className="rt-sublabel">{periodStats.withinSLA} of {periodStats.completed} within SLA</div>
        </div>
        <div className="response-time-card">
          <Calendar size={20} color="var(--scapia-yellow)" />
          <div className="rt-value">{periodStats.withFollowUp}</div>
          <div className="rt-label">Follow-ups Required</div>
          <div className="rt-sublabel">of {periodStats.total} total callbacks</div>
        </div>
      </div>

      {/* Agent Performance Table */}
      {agentPerformance.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <span className="panel-title"><Users size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Agent Performance</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th style={{ textAlign: 'center' }}>Picked</th>
                    <th style={{ textAlign: 'center' }}>Completed</th>
                    <th style={{ textAlign: 'center' }}>Avg Pickup</th>
                    <th style={{ textAlign: 'center' }}>Avg Handling</th>
                    <th style={{ textAlign: 'center' }}>SLA %</th>
                    <th style={{ textAlign: 'center' }}>Follow-ups</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map(a => (
                    <tr key={a.name}>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td style={{ textAlign: 'center' }}>{a.picked}</td>
                      <td style={{ textAlign: 'center' }}>{a.completed}</td>
                      <td style={{ textAlign: 'center' }}>{formatMins(a.avgPickup)}</td>
                      <td style={{ textAlign: 'center' }}>{formatMins(a.avgCompletion)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: a.slaPct >= 90 ? 'var(--scapia-green)' : a.slaPct >= 70 ? 'var(--scapia-orange)' : 'var(--scapia-red)' }}>
                          {a.slaPct}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{a.followUps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="monitoring-grid">
        {/* SLA Status Summary */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">SLA Status Summary</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              <Clock size={12} style={{ verticalAlign: -2 }} /> Real-time
            </span>
          </div>
          <div className="panel-body">
            {alertRows.map(row => (
              <div className="alert-row" key={row.label}>
                <div className="alert-indicator" style={{ background: row.bg, fontSize: 20 }}>
                  {row.emoji}
                </div>
                <div className="alert-info">
                  <div className="alert-label">{row.label}</div>
                  <div className="alert-sublabel">{row.sublabel}</div>
                </div>
                <div className="alert-count" style={{ color: row.color }}>{row.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Callback Density Heatmap</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Hourly distribution</span>
          </div>
          <div className="panel-body">
            <div className="heatmap-grid">
              <div className="heatmap-header"></div>
              {DAYS.map(d => (
                <div key={d} className="heatmap-header">{d}</div>
              ))}
              {HOURS.map(hour => (
                <div key={`row-${hour}`} style={{ display: 'contents' }}>
                  <div className="heatmap-hour">
                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                  </div>
                  {DAYS.map(day => {
                    const count = heatmapData[hour]?.[day] || 0;
                    return (
                      <div
                        key={`${hour}-${day}`}
                        className={`heatmap-cell heat-${getHeatLevel(count)}`}
                        title={`${day} ${hour}:00 -- ${count} callbacks`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>Less</span>
              {[0, 1, 2, 3, 4, 5].map(l => (
                <div key={l} className={`heatmap-cell heat-${l}`} style={{ width: 16, height: 16, minHeight: 16, fontSize: 0 }} />
              ))}
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Scorecard */}
      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel-header">
          <span className="panel-title">Scorecard</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{period === 'all' ? 'All Time' : PERIODS.find(p => p.key === period)?.label}</span>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1F2937' }}>{periodStats.total}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>Total Requested</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>{periodStats.completed}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>Completed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>{periodStats.withinSLA}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>Within SLA</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#DC2626' }}>{periodStats.postSLA}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>Post SLA</div>
            </div>
          </div>

          {/* SLA Compliance Bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>SLA Compliance Rate</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: periodStats.slaRate >= 90 ? '#059669' : '#D84100' }}>{periodStats.slaRate}%</span>
            </div>
            <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${periodStats.slaRate}%`,
                  background: periodStats.slaRate >= 90 ? '#059669' : periodStats.slaRate >= 70 ? '#D84100' : '#DC2626',
                  borderRadius: 5,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
