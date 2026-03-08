import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { generateInitialCallbacks, generateLogs } from '../data/mockData';
import { getTimeRemaining, getUrgencyLevel, setSLAConfig } from '../utils/slaEngine';
import { api } from '../utils/api';

const StoreContext = createContext(null);
const AUTO_RELEASE_MINUTES = 30;

const initialData = generateInitialCallbacks();

function buildInitialState() {
  if (api.isLive()) {
    return { callbacks: [], logs: [], toasts: [], loading: true };
  }
  const all = [...initialData.pending, ...initialData.completed];
  return { callbacks: all, logs: generateLogs(all), toasts: [], loading: false };
}

function reducer(state, action) {
  switch (action.type) {

    case 'SET_CALLBACKS': return { ...state, callbacks: action.callbacks, loading: false };
    case 'SET_LOGS':      return { ...state, logs: action.logs };
    case 'SET_LOADING':   return { ...state, loading: action.loading };

    case 'PICK_UP': {
      const now = new Date().toISOString();
      const cb = state.callbacks.find(c => c.id === action.id);
      if (!cb || (cb.status !== 'pending' && cb.status !== 'assigned')) return state;
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          c.id === action.id
            ? { ...c, status: 'in-progress', assignedAgent: action.agent, pickedUpAt: now }
            : c
        ),
        logs: [{ id: Date.now(), callbackId: action.id, action: 'picked_up', agent: action.agent, timestamp: now, details: `${action.agent} picked up ${action.id}` }, ...state.logs],
      };
    }

    case 'COMPLETE': {
      const now = new Date().toISOString();
      const cb = state.callbacks.find(c => c.id === action.id);
      if (!cb || cb.status !== 'in-progress') return state;
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          c.id === action.id
            ? { ...c, status: 'completed', completedAt: now, notes: action.notes, followUpRequired: action.followUpRequired }
            : c
        ),
        logs: [{ id: Date.now(), callbackId: action.id, action: 'completed', agent: cb.assignedAgent, timestamp: now, details: `${cb.assignedAgent} completed ${action.id}` }, ...state.logs],
      };
    }

    case 'SCHEDULE_FOLLOWUP': {
      const now = new Date().toISOString();
      const cb = state.callbacks.find(c => c.id === action.id);
      if (!cb) return state;
      // Mark original as completed, create new follow-up callback
      const newId = 'CB-' + String(state.callbacks.length + 1).padStart(5, '0');
      const newCb = {
        ...cb,
        id: newId,
        parentCallbackId: action.id,
        status: 'pending',
        assignedAgent: null,
        pickedUpAt: null,
        completedAt: null,
        notes: '',
        followUpRequired: false,
        followUpAt: null,
        deadline: action.followUpAt,
        createdAt: now,
        forceReleaseCount: 0,
        autoReleaseCount: 0,
        extendCount: 0,
        forceReleaseNotes: '',
      };
      return {
        ...state,
        callbacks: [
          ...state.callbacks.map(c =>
            c.id === action.id
              ? { ...c, status: 'completed', completedAt: now, notes: action.notes, followUpRequired: true, followUpAt: action.followUpAt }
              : c
          ),
          newCb,
        ],
        logs: [
          { id: Date.now(), callbackId: newId, action: 'created', agent: '', timestamp: now, details: `Follow-up callback from ${action.id}` },
          { id: Date.now() - 1, callbackId: action.id, action: 'completed', agent: cb.assignedAgent || 'Agent', timestamp: now, details: `${cb.assignedAgent || 'Agent'} completed ${action.id} (follow-up)` },
          ...state.logs,
        ],
      };
    }

    case 'ASSIGN': {
      const now = new Date().toISOString();
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          c.id === action.id
            ? { ...c, status: 'assigned', assignedAgent: action.agent }
            : c
        ),
        logs: [{ id: Date.now(), callbackId: action.id, action: 'assigned', agent: 'Supervisor', timestamp: now, details: `Assigned ${action.id} to ${action.agent}` }, ...state.logs],
      };
    }

    case 'BULK_ASSIGN': {
      const now = new Date().toISOString();
      const newLogs = action.ids.map(id => ({
        id: Date.now() + Math.random(), callbackId: id, action: 'assigned', agent: 'Supervisor',
        timestamp: now, details: `Bulk assigned ${id} to ${action.agent}`,
      }));
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          action.ids.includes(c.id) && c.status === 'pending'
            ? { ...c, status: 'assigned', assignedAgent: action.agent }
            : c
        ),
        logs: [...newLogs, ...state.logs],
      };
    }

    case 'UNASSIGN': {
      const now = new Date().toISOString();
      const cb = state.callbacks.find(c => c.id === action.id);
      if (!cb || (cb.status !== 'assigned' && cb.status !== 'in-progress')) return state;
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          c.id === action.id
            ? { ...c, status: 'pending', assignedAgent: null, pickedUpAt: null }
            : c
        ),
        logs: [{ id: Date.now(), callbackId: action.id, action: 'unassigned', agent: 'Supervisor', timestamp: now, details: `Unassigned ${action.id} from ${cb.assignedAgent}` }, ...state.logs],
      };
    }

    case 'REASSIGN': {
      const now = new Date().toISOString();
      const cb = state.callbacks.find(c => c.id === action.id);
      if (!cb || (cb.status !== 'assigned' && cb.status !== 'in-progress')) return state;
      const wasInProgress = cb.status === 'in-progress';
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          c.id === action.id
            ? { ...c, status: 'assigned', assignedAgent: action.agent, pickedUpAt: null }
            : c
        ),
        logs: [{ id: Date.now(), callbackId: action.id, action: 'reassigned', agent: 'Supervisor', timestamp: now, details: `Reassigned ${action.id} from ${cb.assignedAgent} to ${action.agent}` }, ...state.logs],
      };
    }

    case 'AUTO_RELEASE': {
      const now = new Date().toISOString();
      const cb = state.callbacks.find(c => c.id === action.id);
      if (!cb || cb.status !== 'in-progress') return state;
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          c.id === action.id
            ? { ...c, status: 'pending', assignedAgent: null, pickedUpAt: null, autoReleaseCount: (c.autoReleaseCount || 0) + 1 }
            : c
        ),
        logs: [{ id: Date.now(), callbackId: action.id, action: 'auto_release', agent: cb.assignedAgent, timestamp: now, details: `Auto-released ${action.id} (30m timeout)` }, ...state.logs],
      };
    }

    case 'FORCE_RELEASE': {
      const now = new Date().toISOString();
      const cb = state.callbacks.find(c => c.id === action.id);
      if (!cb || cb.status !== 'in-progress') return state;
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          c.id === action.id
            ? {
                ...c, status: 'pending', assignedAgent: null, pickedUpAt: null,
                forceReleaseCount: (c.forceReleaseCount || 0) + 1,
                forceReleaseNotes: (c.forceReleaseNotes ? c.forceReleaseNotes + '\n---\n' : '') + now + ': ' + (action.notes || ''),
              }
            : c
        ),
        logs: [{ id: Date.now(), callbackId: action.id, action: 'force_release', agent: 'Supervisor', timestamp: now, details: `Force-released ${action.id} from ${cb.assignedAgent} — ${action.notes || ''}` }, ...state.logs],
      };
    }

    case 'EXTEND': {
      const now = new Date().toISOString();
      const cb = state.callbacks.find(c => c.id === action.id);
      if (!cb || cb.status !== 'in-progress') return state;
      return {
        ...state,
        callbacks: state.callbacks.map(c =>
          c.id === action.id
            ? { ...c, pickedUpAt: now, extendCount: (c.extendCount || 0) + 1 }
            : c
        ),
        logs: [{ id: Date.now(), callbackId: action.id, action: 'extended', agent: cb.assignedAgent, timestamp: now, details: `${cb.assignedAgent} extended timer (${(cb.extendCount || 0) + 1}/3)` }, ...state.logs],
      };
    }

    case 'CLEAR_OLD': {
      const before = new Date(action.beforeDate);
      const removed = state.callbacks.filter(c => c.status === 'completed' && new Date(c.completedAt) < before);
      return {
        ...state,
        callbacks: state.callbacks.filter(c => !(c.status === 'completed' && new Date(c.completedAt) < before)),
        logs: [{ id: Date.now(), callbackId: '-', action: 'clear_old', agent: 'Admin', timestamp: new Date().toISOString(), details: `Cleared ${removed.length} old callbacks before ${before.toLocaleDateString()}` }, ...state.logs],
      };
    }

    case 'ADD_TOAST':    return { ...state, toasts: [...state.toasts, { id: Date.now(), ...action.toast }] };
    case 'REMOVE_TOAST': return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

    default: return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState);
  const timersRef = useRef({});
  const liveMode = useRef(api.isLive());

  // Initial data fetch + SLA config
  useEffect(() => {
    if (!liveMode.current) return;
    let active = true;
    async function fetchData() {
      try {
        const [cbRaw, logRaw] = await Promise.all([api.getCallbacks('all'), api.getLogs()]);
        if (!active) return;
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof cbRaw === 'string' ? JSON.parse(cbRaw) : cbRaw });
        dispatch({ type: 'SET_LOGS', logs: typeof logRaw === 'string' ? JSON.parse(logRaw) : logRaw });
      } catch (err) {
        console.error('Fetch error:', err);
        if (active) dispatch({ type: 'SET_LOADING', loading: false });
      }
    }
    // Load SLA config
    async function loadSLAConfig() {
      try {
        const raw = await api.getSLAConfig();
        const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setSLAConfig(config);
      } catch (e) { console.error('SLA config load error:', e); }
    }
    fetchData();
    loadSLAConfig();
    const iv = setInterval(fetchData, 30000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  // Auto-release timer — only for 'in-progress' callbacks
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      state.callbacks.filter(cb => cb.status === 'in-progress' && cb.pickedUpAt).forEach(cb => {
        if ((now - new Date(cb.pickedUpAt)) / 60000 >= AUTO_RELEASE_MINUTES) {
          if (liveMode.current) {
            api.autoRelease(cb.id).catch(() => {});
          }
          dispatch({ type: 'AUTO_RELEASE', id: cb.id });
          dispatch({ type: 'ADD_TOAST', toast: { type: 'warning', message: `${cb.id} auto-released (30m timeout)` } });
        }
      });
    }, 10000);
    return () => clearInterval(iv);
  }, [state.callbacks]);

  // Toast auto-dismiss
  useEffect(() => {
    state.toasts.forEach(t => {
      if (!timersRef.current[t.id]) {
        timersRef.current[t.id] = setTimeout(() => {
          dispatch({ type: 'REMOVE_TOAST', id: t.id });
          delete timersRef.current[t.id];
        }, 4000);
      }
    });
  }, [state.toasts]);

  const pickUp = useCallback(async (id, agentName) => {
    if (liveMode.current) {
      try {
        await api.pickUp(id, agentName);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
        dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${id} picked up` } });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: `Pick up failed: ${err.message}` } });
        throw err;
      }
    } else {
      dispatch({ type: 'PICK_UP', id, agent: agentName });
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${id} picked up` } });
    }
  }, []);

  const complete = useCallback(async (id, notes, followUpRequired, followUpAt) => {
    if (followUpRequired && followUpAt) {
      if (liveMode.current) {
        try {
          await api.scheduleFollowUp(id, followUpAt, notes);
          const raw = await api.getCallbacks('all');
          dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
          dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Follow-up scheduled — new callback created` } });
        } catch (err) {
          dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
          throw err;
        }
      } else {
        dispatch({ type: 'SCHEDULE_FOLLOWUP', id, followUpAt, notes });
        dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Follow-up scheduled — new callback created` } });
      }
      return;
    }
    if (liveMode.current) {
      try {
        await api.complete(id, notes, false);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
        dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${id} completed — note posted to Freshdesk` } });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      dispatch({ type: 'COMPLETE', id, notes, followUpRequired: false });
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${id} completed — note posted to Freshdesk` } });
    }
  }, []);

  const forceRelease = useCallback(async (id, notes) => {
    if (liveMode.current) {
      try {
        await api.forceRelease(id, notes);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      dispatch({ type: 'FORCE_RELEASE', id, notes });
    }
    dispatch({ type: 'ADD_TOAST', toast: { type: 'warning', message: `${id} force-released` } });
  }, []);

  const bulkForceRelease = useCallback(async (ids, notes) => {
    if (liveMode.current) {
      try {
        await api.bulkForceRelease(ids, notes);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      ids.forEach(id => dispatch({ type: 'FORCE_RELEASE', id, notes }));
    }
    dispatch({ type: 'ADD_TOAST', toast: { type: 'warning', message: `${ids.length} callbacks force-released` } });
  }, []);

  const extendCallback = useCallback(async (id) => {
    if (liveMode.current) {
      try {
        await api.extendCallback(id);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      dispatch({ type: 'EXTEND', id });
    }
    dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${id} timer extended` } });
  }, []);

  const assignCallback = useCallback(async (id, agent) => {
    if (liveMode.current) {
      try {
        await api.assignCallback(id, agent);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      dispatch({ type: 'ASSIGN', id, agent });
    }
    dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${id} assigned to ${agent}` } });
  }, []);

  const bulkAssign = useCallback(async (ids, agent) => {
    if (liveMode.current) {
      try {
        await api.bulkAssign(ids, agent);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      dispatch({ type: 'BULK_ASSIGN', ids, agent });
    }
    dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${ids.length} callbacks assigned to ${agent}` } });
  }, []);

  const unassignCallback = useCallback(async (id) => {
    if (liveMode.current) {
      try {
        await api.unassignCallback(id);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      dispatch({ type: 'UNASSIGN', id });
    }
    dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${id} unassigned and returned to queue` } });
  }, []);

  const reassignCallback = useCallback(async (id, agent) => {
    if (liveMode.current) {
      try {
        await api.reassignCallback(id, agent);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      dispatch({ type: 'REASSIGN', id, agent });
    }
    dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `${id} reassigned to ${agent}` } });
  }, []);

  const clearOld = useCallback(async (beforeDate) => {
    if (liveMode.current) {
      try {
        await api.clearOldCallbacks(beforeDate);
        const raw = await api.getCallbacks('all');
        dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
      } catch (err) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'error', message: err.message } });
        throw err;
      }
    } else {
      dispatch({ type: 'CLEAR_OLD', beforeDate });
    }
    dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: 'Old callbacks cleared successfully' } });
  }, []);

  const refreshData = useCallback(async () => {
    if (!liveMode.current) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const raw = await api.getCallbacks('all');
      dispatch({ type: 'SET_CALLBACKS', callbacks: typeof raw === 'string' ? JSON.parse(raw) : raw });
    } catch { dispatch({ type: 'SET_LOADING', loading: false }); }
  }, []);

  const getStats = useCallback(() => {
    const pending    = state.callbacks.filter(c => c.status === 'pending');
    const assigned   = state.callbacks.filter(c => c.status === 'assigned');
    const inProgress = state.callbacks.filter(c => c.status === 'in-progress');
    const completed  = state.callbacks.filter(c => c.status === 'completed');
    const active     = [...pending, ...assigned, ...inProgress];
    const breached   = active.filter(c => getUrgencyLevel(getTimeRemaining(c.deadline)) === 'breached').length;
    const critical   = active.filter(c => getUrgencyLevel(getTimeRemaining(c.deadline)) === 'critical').length;
    const urgent     = active.filter(c => getUrgencyLevel(getTimeRemaining(c.deadline)) === 'urgent').length;
    const monitoring = active.filter(c => getUrgencyLevel(getTimeRemaining(c.deadline)) === 'monitoring').length;
    const safe       = active.filter(c => getUrgencyLevel(getTimeRemaining(c.deadline)) === 'safe').length;
    const withinSLA  = completed.filter(c => c.completedAt && c.deadline && new Date(c.completedAt) <= new Date(c.deadline)).length;
    return {
      total: pending.length + assigned.length + inProgress.length,
      pending: pending.length, assigned: assigned.length, inProgress: inProgress.length, completed: completed.length,
      breached, critical, urgent, monitoring, safe, withinSLA,
      postSLA: completed.length - withinSLA,
      slaRate: completed.length > 0 ? Math.round((withinSLA / completed.length) * 100) : 0,
    };
  }, [state.callbacks]);

  const getMyQueueCount = useCallback((agentName) => {
    return state.callbacks.filter(c =>
      c.assignedAgent === agentName && (c.status === 'assigned' || c.status === 'in-progress')
    ).length;
  }, [state.callbacks]);

  return (
    <StoreContext.Provider value={{
      state, pickUp, complete, forceRelease, bulkForceRelease, extendCallback,
      assignCallback, bulkAssign, unassignCallback, reassignCallback,
      clearOld, getStats, getMyQueueCount, refreshData, dispatch
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
