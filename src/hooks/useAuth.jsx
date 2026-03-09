import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DEFAULT_USERS } from '../data/mockData';
import { api } from '../utils/api';

const AuthContext = createContext(null);

const USERS_KEY = 'sccc_users';
const SESSION_KEY = 'sccc_session';
const PASSWORDS_KEY = 'sccc_user_passwords';
const DEFAULT_PASSWORD = 'Welcome@1234';

function getStoredUsers() {
  try {
    const s = localStorage.getItem(USERS_KEY);
    return s ? JSON.parse(s) : DEFAULT_USERS;
  } catch { return DEFAULT_USERS; }
}
function saveUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch {}
}
function getStoredSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

// Per-user passwords stored as { "email": "password" }
function getPasswordMap() {
  try {
    const s = localStorage.getItem(PASSWORDS_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}
function savePasswordMap(map) {
  try { localStorage.setItem(PASSWORDS_KEY, JSON.stringify(map)); } catch {}
}
function getUserPassword(email) {
  const map = getPasswordMap();
  return map[email.toLowerCase()] || DEFAULT_PASSWORD;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(getStoredSession);
  const [users, setUsers] = useState(getStoredUsers);
  const [onlineAgents, setOnlineAgents] = useState([]);

  const isAdmin = currentUser?.role === 'Admin';
  const isSupervisor = currentUser?.role === 'Supervisor' || isAdmin;

  // Load users from sheet in live mode
  useEffect(() => {
    if (!api.isLive()) return;
    api.getUsers().then(raw => {
      const loaded = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(loaded) && loaded.length > 0) {
        // Extract passwords from live data into local map
        const map = getPasswordMap();
        loaded.forEach(u => {
          if (u.password && u.password !== DEFAULT_PASSWORD) {
            map[u.email.toLowerCase()] = u.password;
          }
        });
        savePasswordMap(map);
        setUsers(loaded);
        saveUsers(loaded);
      }
    }).catch(() => {});
  }, []);

  const login = useCallback((email, password) => {
    const currentUsers = getStoredUsers();
    const user = currentUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
    if (!user) return { success: false, error: 'User not found or inactive' };

    // Check per-user password (from live data or local map)
    const expectedPw = user.password || getUserPassword(email);
    if (password !== expectedPw) return { success: false, error: 'Incorrect password' };

    const session = { name: user.name, email: user.email, role: user.role };
    setCurrentUser(session);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
    // Send initial heartbeat on login
    if (api.isLive()) api.heartbeat(user.email).catch(() => {});
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  // Heartbeat: send every 60s while logged in
  useEffect(() => {
    if (!currentUser || !api.isLive()) return;
    const iv = setInterval(() => {
      api.heartbeat(currentUser.email).catch(() => {});
    }, 60000);
    return () => clearInterval(iv);
  }, [currentUser]);

  // Force-logout check: poll every 30s
  useEffect(() => {
    if (!currentUser || !api.isLive()) return;
    const iv = setInterval(() => {
      api.checkForceLogout(currentUser.email).then(res => {
        const result = typeof res === 'string' ? JSON.parse(res) : res;
        if (result.forceLogout) {
          setCurrentUser(null);
          try { localStorage.removeItem(SESSION_KEY); } catch {}
          alert('You have been logged out by a supervisor.');
        }
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, [currentUser]);

  // Change own password
  const changePassword = useCallback((currentPw, newPw) => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    const expectedPw = getUserPassword(currentUser.email);
    if (currentPw !== expectedPw) return { success: false, error: 'Current password is incorrect' };
    if (newPw.length < 6) return { success: false, error: 'New password must be at least 6 characters' };

    const map = getPasswordMap();
    map[currentUser.email.toLowerCase()] = newPw;
    savePasswordMap(map);

    // Update in live mode
    if (api.isLive()) api.resetUserPassword(currentUser.email, newPw).catch(() => {});
    return { success: true };
  }, [currentUser]);

  // Admin: reset any user's password
  const resetUserPassword = useCallback((email, newPw) => {
    if (newPw.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

    const map = getPasswordMap();
    map[email.toLowerCase()] = newPw;
    savePasswordMap(map);

    // Update users state so the password is reflected
    const current = getStoredUsers();
    const updated = current.map(u =>
      u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: newPw } : u
    );
    setUsers(updated);
    saveUsers(updated);

    if (api.isLive()) api.resetUserPassword(email, newPw).catch(() => {});
    return { success: true };
  }, []);

  const addUser = useCallback((user) => {
    const current = getStoredUsers();
    if (current.find(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      return { success: false, error: 'A user with this email already exists' };
    }
    const newUser = { name: user.name.trim(), email: user.email.trim(), role: user.role, active: true };
    const updated = [...current, newUser];
    setUsers(updated);
    saveUsers(updated);
    if (api.isLive()) api.createUser(newUser).catch(() => {});
    return { success: true };
  }, []);

  const removeUser = useCallback((email) => {
    const current = getStoredUsers();
    const updated = current.filter(u => u.email !== email);
    setUsers(updated);
    saveUsers(updated);
    if (api.isLive()) api.deleteUser(email).catch(() => {});
    return { success: true };
  }, []);

  // Poll online agents every 30s (for supervisor/admin views)
  useEffect(() => {
    if (!currentUser || !api.isLive()) return;
    const fetchOnline = () => {
      api.getOnlineAgents().then(raw => {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(data)) setOnlineAgents(data);
      }).catch(() => {});
    };
    fetchOnline();
    const iv = setInterval(fetchOnline, 30000);
    return () => clearInterval(iv);
  }, [currentUser]);

  const forceLogoutAgent = useCallback(async (email) => {
    if (api.isLive()) {
      await api.forceLogoutAgent(email);
    }
    return { success: true };
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser, users, isAdmin, isSupervisor, onlineAgents,
      login, logout, changePassword, resetUserPassword, addUser, removeUser, forceLogoutAgent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
