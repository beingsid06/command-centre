import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { StoreProvider } from './hooks/useCallbackStore';
import Sidebar from './components/Sidebar';
import QueuePage from './pages/QueuePage';
import MyQueuePage from './pages/MyQueuePage';
import SupervisorPage from './pages/SupervisorPage';
import ConfigPage from './pages/ConfigPage';
import DashboardPage from './pages/DashboardPage';
import LogsPage from './pages/LogsPage';
import ToastContainer from './components/ToastContainer';
import { Menu } from 'lucide-react';

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    setError('');
    const result = login(email.trim(), password);
    setLoading(false);
    if (!result.success) setError(result.error);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">S</div>
          <div className="login-logo-text">
            <span className="login-brand">Scapia</span>
            <span className="login-subtitle">Callback Command Centre</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@scapia.cards"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button
            className="btn btn-md btn-primary login-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          Scapia Internal Tool
        </div>
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { currentUser, isSupervisor, isAdmin } = useAuth();
  const [activePage, setActivePage] = useState('queue');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentUser) return <LoginScreen />;

  const navigate = (page) => {
    // Guard: Supervisor/Config only for authorized roles
    if (page === 'supervisor' && !isSupervisor) return;
    if (page === 'config' && !isAdmin) return;
    setActivePage(page);
    setSidebarOpen(false);
  };

  const pageMap = {
    queue:      <QueuePage />,
    myqueue:    <MyQueuePage />,
    dashboard:  <DashboardPage />,
    supervisor: isSupervisor ? <SupervisorPage /> : <QueuePage />,
    logs:       <LogsPage />,
    config:     isAdmin ? <ConfigPage /> : <QueuePage />,
  };

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-area">
        <header className="top-header">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>
          <div className="top-header-title">
            {activePage === 'queue'      && 'Live Queue'}
            {activePage === 'myqueue'    && 'My Queue'}
            {activePage === 'dashboard'  && 'Dashboard'}
            {activePage === 'supervisor' && 'Supervisor View'}
            {activePage === 'logs'       && 'Activity Logs'}
            {activePage === 'config'     && 'Configuration'}
          </div>
          <div className="top-header-user">
            <span className={`role-badge role-${currentUser.role.toLowerCase()}`}>
              {currentUser.role}
            </span>
            <span className="top-header-name">{currentUser.name}</span>
          </div>
        </header>
        <main className="page-content">
          {pageMap[activePage] || <QueuePage />}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </AuthProvider>
  );
}
