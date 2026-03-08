import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Search, Download, Calendar } from 'lucide-react';
import { useStore } from '../hooks/useCallbackStore';

const ACTION_FILTERS = ['all', 'created', 'picked_up', 'assigned', 'unassigned', 'reassigned', 'completed', 'auto_release', 'force_release', 'extended'];

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function downloadCSV(data, filename) {
  const headers = ['Timestamp', 'Callback ID', 'Action', 'Agent', 'Details'];
  const rows = data.map(log => [
    format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    log.callbackId,
    log.action,
    log.agent || '',
    `"${(log.details || '').replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LogsPage() {
  const { state } = useStore();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredLogs = useMemo(() => {
    let logs = state.logs;
    if (filter !== 'all') {
      logs = logs.filter((l) => l.action === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.callbackId.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          (l.agent && l.agent.toLowerCase().includes(q))
      );
    }
    if (dateFrom) {
      const from = startOfDay(new Date(dateFrom));
      logs = logs.filter(l => new Date(l.timestamp) >= from);
    }
    if (dateTo) {
      const to = endOfDay(new Date(dateTo));
      logs = logs.filter(l => new Date(l.timestamp) <= to);
    }
    return logs.slice(0, 500);
  }, [state.logs, filter, search, dateFrom, dateTo]);

  const handleExportCSV = () => {
    downloadCSV(filteredLogs, `activity-logs-${fmtDate(new Date())}.csv`);
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Audit Trail ({filteredLogs.length} entries)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={handleExportCSV} title="Download CSV">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="section-filters">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="filters-row" style={{ marginTop: 10, marginBottom: 10 }}>
        <div className="search-box">
          <Search size={14} color="#9CA3AF" />
          <input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={13} color="#9CA3AF" />
          <input
            type="date"
            className="form-input date-input"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            placeholder="From"
            style={{ fontSize: 12, padding: '4px 8px' }}
          />
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>to</span>
          <input
            type="date"
            className="form-input date-input"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            placeholder="To"
            style={{ fontSize: 12, padding: '4px 8px' }}
          />
          {(dateFrom || dateTo) && (
            <button className="btn btn-xs btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Callback</th>
                <th>Action</th>
                <th>Agent</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {format(new Date(log.timestamp), 'dd MMM, h:mm:ss a')}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#D84100' }}>{log.callbackId}</span>
                  </td>
                  <td>
                    <span className={`log-action ${log.action}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{log.agent || '--'}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
