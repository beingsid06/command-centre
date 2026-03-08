import { Phone, LayoutDashboard, Shield, FileText, Settings, LogOut, User, Inbox } from 'lucide-react';
import { useStore } from '../hooks/useCallbackStore';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar({ activePage, onNavigate, open, onClose }) {
  const { getStats, getMyQueueCount } = useStore();
  const { currentUser, isAdmin, isSupervisor, logout } = useAuth();
  const stats = getStats();
  const myCount = getMyQueueCount(currentUser?.name);

  const agentNavItems = [
    { id: 'queue',     label: 'Live Queue', icon: Phone,          badge: stats.pending,    badgeRed: stats.breached > 0 },
    { id: 'myqueue',   label: 'My Queue',   icon: Inbox,          badge: myCount,          badgeRed: false },
    { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
    { id: 'logs',      label: 'Activity Logs', icon: FileText },
  ];

  const supervisorNavItems = isSupervisor
    ? [{ id: 'supervisor', label: 'Supervisor View', icon: Shield, badge: stats.inProgress + stats.assigned }]
    : [];

  const adminNavItems = isAdmin
    ? [{ id: 'config', label: 'Configuration', icon: Settings }]
    : [];

  const allNavItems = [...agentNavItems, ...supervisorNavItems, ...adminNavItems];

  const roleLabel = currentUser?.role || 'Agent';
  const initial = currentUser?.name?.[0]?.toUpperCase() || '?';

  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 39 }}
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <div className="sidebar-logo-text">
            Scapia
            <span>Command Centre</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Workspace</div>
          {allNavItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => { onNavigate(item.id); onClose?.(); }}
            >
              <item.icon size={18} />
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`nav-badge ${item.badgeRed ? 'red' : ''}`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{currentUser?.name || 'Unknown'}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
