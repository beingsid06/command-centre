import { supabase, isLive } from '../lib/supabase';

async function apiCall(endpoint, body = null) {
  const opts = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' };
  const res = await fetch(`/api/${endpoint}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  isLive,

  // Read — direct Supabase queries from client for speed
  getCallbacks: async (status = 'all') => {
    if (!supabase) return [];
    let q = supabase.from('callbacks').select('*').order('created_at', { ascending: false });
    if (status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data.map(rowToCallback);
  },

  getLogs: async () => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return data.map(r => ({
      id: r.id, callbackId: r.callback_id, action: r.action,
      agent: r.agent, details: r.details, timestamp: r.timestamp,
    }));
  },

  getUsers: async () => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('name, email, role, active, password');
    if (error) throw new Error(error.message);
    return data;
  },

  getStats: async () => apiCall('stats'),

  // Callback actions — single consolidated endpoint with action param
  pickUp: (id, agent) => apiCall('callbacks', { action: 'pickup', id, agent }),
  complete: (id, notes, followUpRequired, followUpAt) =>
    apiCall('callbacks', { action: 'complete', id, notes, followUpRequired, followUpAt }),
  scheduleFollowUp: (id, followUpAt, notes) =>
    apiCall('callbacks', { action: 'followup', id, followUpAt, notes }),
  forceRelease: (id, notes) => apiCall('callbacks', { action: 'force-release', id, notes }),
  autoRelease: (id) => apiCall('callbacks', { action: 'auto-release', id }),
  bulkForceRelease: (ids, notes) => apiCall('callbacks', { action: 'bulk-force-release', ids, notes }),
  extendCallback: (id) => apiCall('callbacks', { action: 'extend', id }),
  assignCallback: (id, agent) => apiCall('callbacks', { action: 'assign', id, agent }),
  bulkAssign: (ids, agent) => apiCall('callbacks', { action: 'bulk-assign', ids, agent }),
  unassignCallback: (id) => apiCall('callbacks', { action: 'unassign', id }),
  reassignCallback: (id, agent) => apiCall('callbacks', { action: 'reassign', id, agent }),
  clearOldCallbacks: (beforeDate) => apiCall('callbacks', { action: 'clear-old', beforeDate }),

  // Webhook + manual
  retriggerWebhook: (ticketId) => apiCall('webhook', { action: 'retrigger', ticketId }),
  createManualCallback: (data) => apiCall('callbacks', { action: 'create', ...data }),
  bulkCreateCallbacks: (data) => apiCall('callbacks', { action: 'bulk-create', callbacks: data }),

  // SLA config
  getSLAConfig: async () => {
    if (!supabase) return { safe: 240, monitoring: 120, urgent: 30, critical: 0 };
    const { data, error } = await supabase.from('config').select('*').in('key', ['sla_safe', 'sla_monitoring', 'sla_urgent', 'sla_critical']);
    if (error) throw new Error(error.message);
    const map = {};
    data.forEach(r => {
      const k = r.key.replace('sla_', '');
      map[k] = parseInt(r.value) || 0;
    });
    return map;
  },
  updateSLAConfig: (config) => apiCall('config', config),

  // User management
  createUser: (user) => apiCall('users', { action: 'create', ...user }),
  deleteUser: (email) => apiCall('users', { action: 'delete', email }),
  resetUserPassword: (email, newPassword) => apiCall('users', { action: 'reset-password', email, newPassword }),
  updateUserRole: (email, role) => apiCall('users', { action: 'update-role', email, role }),
  bulkCreateUsers: (data) => apiCall('users', { action: 'bulk-create', users: data }),

  // Notifications — single consolidated endpoint with action param
  getNotificationConfig: () => apiCall('notifications?action=config'),
  testSlackWebhook: () => apiCall('notifications', { action: 'test-slack' }),
  testEmailAlerts: () => apiCall('notifications', { action: 'test-email' }),
  setupPeriodicTrigger: () => apiCall('notifications', { action: 'setup-trigger' }),
  removePeriodicTrigger: () => apiCall('notifications', { action: 'remove-trigger' }),
  triggerSummaryNow: () => apiCall('notifications', { action: 'trigger-summary' }),
};

// Map snake_case DB rows to camelCase frontend format
function rowToCallback(r) {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    customerName: r.customer_name,
    ticketLink: r.ticket_link,
    subject: r.subject,
    category: r.category,
    type: r.type,
    createdAt: r.created_at,
    promisedHours: r.promised_hours,
    deadline: r.deadline,
    status: r.status,
    assignedAgent: r.assigned_agent,
    pickedUpAt: r.picked_up_at,
    completedAt: r.completed_at,
    notes: r.notes,
    followUpRequired: r.follow_up_required,
    followUpAt: r.follow_up_at,
    parentCallbackId: r.parent_callback_id,
    freshdeskAgent: r.freshdesk_agent,
    forceReleaseCount: r.force_release_count || 0,
    autoReleaseCount: r.auto_release_count || 0,
    extendCount: r.extend_count || 0,
    forceReleaseNotes: r.force_release_notes || '',
  };
}
