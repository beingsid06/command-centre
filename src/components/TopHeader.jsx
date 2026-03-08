import { RefreshCw, Menu } from 'lucide-react';

const PAGE_TITLES = {
  queue: { title: 'Live Queue', subtitle: 'Agent Workspace' },
  dashboard: { title: 'Monitoring Dashboard', subtitle: 'SLA Performance & Analytics' },
  supervisor: { title: 'Supervisor Panel', subtitle: 'Team Management & Overrides' },
  logs: { title: 'Activity Logs', subtitle: 'Audit Trail' },
  config: { title: 'Configuration', subtitle: 'System Settings' },
};

export default function TopHeader({ activePage, onToggleSidebar }) {
  const { title, subtitle } = PAGE_TITLES[activePage] || PAGE_TITLES.queue;

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button className="hamburger" onClick={onToggleSidebar}>
          <Menu size={22} />
        </button>
        <div>
          <div className="top-header-title">{title}</div>
          <div className="top-header-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="top-header-right">
        <div className="live-indicator">
          <span className="live-dot" />
          LIVE
        </div>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => window.location.reload()}
          title="Refresh data"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    </header>
  );
}
