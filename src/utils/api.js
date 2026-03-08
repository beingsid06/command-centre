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

  // Callback actions — use API routes (server-side validation)
  pickUp: (id, agent) => apiCall('callbacks/pickup', { id, agent }),
  complete: (id, notes, followUpRequired, followUpAt) =>
    apiCall('callbacks/complete', { id, notes, followUpRequired, followUpAt }),
  scheduleFollowUp: (id, followUpAt, notes) =>
    apiCall('callbacks/followup', { id, followUpAt, notes }),
  forceRelease: (id, notes) => apiCall('callbacks/force-release', { id, notes }),
  autoRelease: (id) => apiCall('callbacks/auto-release', { id }),
  bulkForceRelease: (ids, notes) => apiCall('callbacks/bulk-force-release', { ids, notes }),
  extendCallback: (id) => apiCall('callbacks/extend', { id }),
  assignCallback: (id, agent) => apiCall('callbacks/assign', { id, agent }),
  bulkAssign: (ids, agent) => apiCall('callbacks/bulk-assign', { ids, agent }),
  unassignCallback: (id) => apiCall('callbacks/unassign', { id }),
  reassignCallback: (id, agent) => apiCall('callbacks/reassign', { id, agent }),
  clearOldCallbacks: (beforeDate) => apiCall('callbacks/clear-old', { beforeDate }),

  // Webhook + manual
  retriggerWebhook: (ticketId) => apiCall('webhook/retrigger', { ticketId }),
  createManualCallback: (data) => apiCall('callbacks/create', data),
  bulkCreateCallbacks: (data) => apiCall('callbacks/bulk-create', { callbacks: data }),

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
  updateSLAConfig: (config) => apiCall('config/sla', config),

  // User management
  createUser: (user) => apiCall('users/create', user),
  deleteUser: (email) => apiCall('users/delete', { email }),
  resetUserPassword: (email, newPassword) => apiCall('users/reset-password', { email, newPassword }),
  updateUserRole: (email, role) => apiCall('users/update-role', { email, role }),
  bulkCreateUsers: (data) => apiCall('users/bulk-create', { users: data }),

  // Notifications
  getNotificationConfig: () => apiCall('notifications/config'),
  testSlackWebhook: () => apiCall('notifications/test-slack'),
  testEmailAlerts: () => apiCall('notifications/test-email'),
  setupPeriodicTrigger: () => apiCall('notifications/setup-trigger'),
  removePeriodicTrigger: () => apiCall('notifications/remove-trigger'),
  triggerSummaryNow: () => apiCall('notifications/trigger-summary'),
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
