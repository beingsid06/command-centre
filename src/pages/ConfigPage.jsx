import { useState, useEffect, useRef } from 'react';
import { Settings, Users, UserPlus, Trash2, Key, Trash, AlertTriangle, Clock, RotateCcw, Bell, Mail, MessageSquare, CheckCircle, XCircle, Loader, Upload, Plus, RefreshCw, Gauge, ShieldCheck, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../hooks/useCallbackStore';
import { api } from '../utils/api';
import { getSLAConfig, setSLAConfig } from '../utils/slaEngine';

function formatDate(d) {
  if (!d) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ROLES = ['Agent', 'Supervisor', 'Admin'];

export default function ConfigPage() {
  const { currentUser, users, isAdmin, isSupervisor, changePassword, resetUserPassword, addUser, removeUser } = useAuth();
  const { clearOld, refreshData } = useStore();

  // Password change (own)
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);

  // Admin reset password
  const [resetEmail, setResetEmail] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [resetMsg, setResetMsg] = useState(null);

  // Add user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Agent');
  const [addMsg, setAddMsg] = useState(null);

  // Notifications
  const [notifConfig, setNotifConfig] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackTestMsg, setSlackTestMsg] = useState(null);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestMsg, setEmailTestMsg] = useState(null);

  // SLA Config
  const [slaForm, setSlaForm] = useState(() => getSLAConfig());
  const [slaMsg, setSlaMsg] = useState(null);
  const [slaLoading, setSlaLoading] = useState(false);

  // Retrigger Webhook
  const [retriggerTicketId, setRetriggerTicketId] = useState('');
  const [retriggerMsg, setRetriggerMsg] = useState(null);
  const [retriggerLoading, setRetriggerLoading] = useState(false);

  // Manual Callback
  const [manualForm, setManualForm] = useState({ ticketId: '', customerName: '', subject: '', type: 'Normal Callback Request', category: '', promisedHours: '24' });
  const [manualMsg, setManualMsg] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  // Bulk Upload (callbacks)
  const [bulkCbMsg, setBulkCbMsg] = useState(null);
  const [bulkCbLoading, setBulkCbLoading] = useState(false);
  const bulkCbRef = useRef(null);

  // Bulk Upload (users)
  const [bulkUserMsg, setBulkUserMsg] = useState(null);
  const [bulkUserLoading, setBulkUserLoading] = useState(false);
  const bulkUserRef = useRef(null);

  // Manual summary trigger
  const [summaryTriggerLoading, setSummaryTriggerLoading] = useState(false);
  const [summaryTriggerMsg, setSummaryTriggerMsg] = useState(null);

  // Change user role
  const [roleChangeEmail, setRoleChangeEmail] = useState(null);
  const [roleChangeValue, setRoleChangeValue] = useState('');
  const [roleChangeMsg, setRoleChangeMsg] = useState(null);

  useEffect(() => {
    if (!api.isLive() || !isAdmin) return;
    setNotifLoading(true);
    api.getNotificationConfig()
      .then(raw => {
        const cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setNotifConfig(cfg);
      })
      .catch(() => setNotifConfig(null))
      .finally(() => setNotifLoading(false));
  }, [isAdmin]);

  // Load SLA config on mount
  useEffect(() => {
    if (!api.isLive() || !isAdmin) return;
    api.getSLAConfig()
      .then(raw => {
        const cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setSlaForm(cfg);
        setSLAConfig(cfg);
      })
      .catch(() => {});
  }, [isAdmin]);

  const handleTestSlack = async () => {
    setSlackTesting(true);
    setSlackTestMsg(null);
    try {
      const res = await api.testSlackWebhook();
      const parsed = typeof res === 'string' ? JSON.parse(res) : res;
      setSlackTestMsg({ ok: parsed.success, text: parsed.success ? 'Test message sent to Slack.' : (parsed.error || 'Failed.') });
    } catch (e) {
      setSlackTestMsg({ ok: false, text: e?.message || 'Test failed.' });
    }
    setSlackTesting(false);
  };

  const handleTestEmail = async () => {
    setEmailTesting(true);
    setEmailTestMsg(null);
    try {
      const res = await api.testEmailAlerts();
      const parsed = typeof res === 'string' ? JSON.parse(res) : res;
      setEmailTestMsg({ ok: parsed.success, text: parsed.success ? 'Test email sent.' : (parsed.error || 'Failed.') });
    } catch (e) {
      setEmailTestMsg({ ok: false, text: e?.message || 'Test failed.' });
    }
    setEmailTesting(false);
  };

  const handleTriggerSummary = async () => {
    setSummaryTriggerLoading(true);
    setSummaryTriggerMsg(null);
    try {
      if (api.isLive()) {
        const res = await api.triggerSummaryNow();
        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        setSummaryTriggerMsg({ ok: parsed.success !== false, text: parsed.message || 'Summary sent to Slack & Email.' });
      } else {
        setSummaryTriggerMsg({ ok: true, text: 'Summary would be sent (demo mode).' });
      }
    } catch (e) {
      setSummaryTriggerMsg({ ok: false, text: e?.message || 'Failed to send summary.' });
    }
    setSummaryTriggerLoading(false);
  };

  // Clear old
  const [clearDate, setClearDate] = useState(formatDate(new Date()));
  const [clearMsg, setClearMsg] = useState(null);
  const [clearLoading, setClearLoading] = useState(false);

  const handlePasswordChange = () => {
    if (!curPw || !newPw || !confirmPw) { setPwMsg({ ok: false, text: 'All fields are required.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'New passwords do not match.' }); return; }
    const res = changePassword(curPw, newPw);
    setPwMsg({ ok: res.success, text: res.success ? 'Password updated successfully.' : res.error });
    if (res.success) { setCurPw(''); setNewPw(''); setConfirmPw(''); }
  };

  const handleResetPassword = (email) => {
    if (!resetPw.trim()) { setResetMsg({ ok: false, text: 'Enter a new password.' }); return; }
    const res = resetUserPassword(email, resetPw.trim());
    setResetMsg({ ok: res.success, text: res.success ? `Password reset for ${email}.` : res.error });
    if (res.success) { setResetPw(''); setResetEmail(null); }
  };

  const handleAddUser = () => {
    if (!newName.trim() || !newEmail.trim()) { setAddMsg({ ok: false, text: 'Name and email are required.' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { setAddMsg({ ok: false, text: 'Invalid email address.' }); return; }
    const res = addUser({ name: newName.trim(), email: newEmail.trim(), role: newRole });
    setAddMsg({ ok: res.success, text: res.success ? `${newName} added as ${newRole}.` : res.error });
    if (res.success) { setNewName(''); setNewEmail(''); setNewRole('Agent'); }
  };

  const handleRemoveUser = (email, name) => {
    if (!window.confirm(`Remove user "${name}" (${email})?`)) return;
    if (email === currentUser?.email) { alert('You cannot remove your own account.'); return; }
    removeUser(email);
  };

  const handleClearOld = async () => {
    if (!clearDate) { setClearMsg({ ok: false, text: 'Select a date.' }); return; }
    if (!window.confirm(`Delete all completed callbacks before ${clearDate}?`)) return;
    setClearLoading(true);
    try {
      await clearOld(new Date(clearDate).toISOString());
      setClearMsg({ ok: true, text: 'Old callbacks cleared.' });
    } catch (e) {
      setClearMsg({ ok: false, text: e?.message || 'Failed to clear.' });
    }
    setClearLoading(false);
  };

  const handleSaveSLA = async () => {
    setSlaLoading(true);
    setSlaMsg(null);
    try {
      if (api.isLive()) {
        await api.updateSLAConfig(slaForm);
      }
      setSLAConfig(slaForm);
      setSlaMsg({ ok: true, text: 'SLA thresholds updated.' });
    } catch (e) {
      setSlaMsg({ ok: false, text: e?.message || 'Failed to update.' });
    }
    setSlaLoading(false);
  };

  const handleRetrigger = async () => {
    if (!retriggerTicketId.trim()) { setRetriggerMsg({ ok: false, text: 'Enter a ticket ID.' }); return; }
    setRetriggerLoading(true);
    setRetriggerMsg(null);
    try {
      const res = await api.retriggerWebhook(retriggerTicketId.trim());
      const parsed = typeof res === 'string' ? JSON.parse(res) : res;
      setRetriggerMsg({ ok: parsed.success !== false, text: parsed.message || parsed.error || 'Callback created.' });
      if (parsed.success !== false) { setRetriggerTicketId(''); refreshData(); }
    } catch (e) {
      setRetriggerMsg({ ok: false, text: e?.message || 'Failed.' });
    }
    setRetriggerLoading(false);
  };

  const handleManualCreate = async () => {
    if (!manualForm.ticketId || !manualForm.customerName || !manualForm.subject) {
      setManualMsg({ ok: false, text: 'Ticket ID, customer name, and subject are required.' }); return;
    }
    setManualLoading(true);
    setManualMsg(null);
    try {
      const res = await api.createManualCallback(manualForm);
      const parsed = typeof res === 'string' ? JSON.parse(res) : res;
      setManualMsg({ ok: parsed.success !== false, text: parsed.message || parsed.error || 'Callback created.' });
      if (parsed.success !== false) {
        setManualForm({ ticketId: '', customerName: '', subject: '', type: 'Normal Callback Request', category: '', promisedHours: '24' });
        refreshData();
      }
    } catch (e) {
      setManualMsg({ ok: false, text: e?.message || 'Failed.' });
    }
    setManualLoading(false);
  };

  const handleBulkCbUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkCbLoading(true);
    setBulkCbMsg(null);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const callbacks = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return {
          ticketId: obj.ticket_id || obj.ticketid || '',
          customerName: obj.customer_name || obj.customername || obj.name || '',
          subject: obj.subject || '',
          type: obj.type || 'Normal Callback Request',
          category: obj.category || '',
          promisedHours: obj.promised_hours || obj.promisedhours || '24',
        };
      }).filter(cb => cb.ticketId && cb.customerName);

      if (callbacks.length === 0) {
        setBulkCbMsg({ ok: false, text: 'No valid rows found. Required: ticket_id, customer_name, subject.' });
      } else if (api.isLive()) {
        const res = await api.bulkCreateCallbacks(callbacks);
        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        setBulkCbMsg({ ok: true, text: parsed.message || `${callbacks.length} callbacks created.` });
        refreshData();
      } else {
        setBulkCbMsg({ ok: true, text: `${callbacks.length} callbacks parsed (demo mode - not saved).` });
      }
    } catch (err) {
      setBulkCbMsg({ ok: false, text: err?.message || 'Failed to parse CSV.' });
    }
    setBulkCbLoading(false);
    if (bulkCbRef.current) bulkCbRef.current.value = '';
  };

  const handleBulkUserUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkUserLoading(true);
    setBulkUserMsg(null);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newUsers = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return {
          name: obj.name || '',
          email: obj.email || '',
          role: obj.role || 'Agent',
        };
      }).filter(u => u.name && u.email);

      if (newUsers.length === 0) {
        setBulkUserMsg({ ok: false, text: 'No valid rows found. Required: name, email.' });
      } else if (api.isLive()) {
        const res = await api.bulkCreateUsers(newUsers);
        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        setBulkUserMsg({ ok: true, text: parsed.message || `${newUsers.length} users created.` });
      } else {
        newUsers.forEach(u => addUser(u));
        setBulkUserMsg({ ok: true, text: `${newUsers.length} users added.` });
      }
    } catch (err) {
      setBulkUserMsg({ ok: false, text: err?.message || 'Failed to parse CSV.' });
    }
    setBulkUserLoading(false);
    if (bulkUserRef.current) bulkUserRef.current.value = '';
  };

  const handleRoleChange = async (email) => {
    if (!roleChangeValue) { setRoleChangeMsg({ ok: false, text: 'Select a role.' }); return; }
    try {
      if (api.isLive()) {
        await api.updateUserRole(email, roleChangeValue);
      }
      // Update local state too
      setRoleChangeMsg({ ok: true, text: `Role updated to ${roleChangeValue}.` });
      setRoleChangeEmail(null);
      setRoleChangeValue('');
    } catch (e) {
      setRoleChangeMsg({ ok: false, text: e?.message || 'Failed.' });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <Settings size={22} />
          <div>
            <h2>Configuration</h2>
            <p>User management, security, and system settings</p>
          </div>
        </div>
      </div>

      {/* SLA Thresholds (Admin only) */}
      {isAdmin && (
        <div className="config-section">
          <div className="config-section-title">
            <Gauge size={16} /> SLA Thresholds (minutes remaining)
          </div>
          <p className="config-description">
            Configure when callbacks transition between urgency levels. Values are in minutes remaining before deadline.
          </p>
          <div className="sla-config-grid">
            <div className="sla-config-field">
              <label className="form-label">Safe (&gt; X min)</label>
              <input type="number" className="form-input" value={slaForm.safe} onChange={e => setSlaForm(f => ({ ...f, safe: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="sla-config-field">
              <label className="form-label">Monitoring (&gt; X min)</label>
              <input type="number" className="form-input" value={slaForm.monitoring} onChange={e => setSlaForm(f => ({ ...f, monitoring: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="sla-config-field">
              <label className="form-label">Urgent (&gt; X min)</label>
              <input type="number" className="form-input" value={slaForm.urgent} onChange={e => setSlaForm(f => ({ ...f, urgent: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="sla-config-field">
              <label className="form-label">Critical (&gt; X min)</label>
              <input type="number" className="form-input" value={slaForm.critical} onChange={e => setSlaForm(f => ({ ...f, critical: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={handleSaveSLA} disabled={slaLoading} style={{ marginTop: 10 }}>
            {slaLoading ? 'Saving...' : 'Save SLA Config'}
          </button>
          {slaMsg && <div className={`form-msg ${slaMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`}>{slaMsg.text}</div>}
        </div>
      )}

      {/* Retrigger Webhook (Admin/Supervisor) */}
      {(isAdmin || isSupervisor) && (
        <div className="config-section">
          <div className="config-section-title">
            <RefreshCw size={16} /> Retrigger Missed Webhook
          </div>
          <p className="config-description">
            Fetch ticket details from Freshdesk and create a callback for a missed webhook. Enter the Freshdesk ticket ID (numbers only).
          </p>
          <div className="add-user-fields">
            <input
              className="form-input"
              placeholder="Freshdesk Ticket ID (e.g. 12345)"
              value={retriggerTicketId}
              onChange={e => setRetriggerTicketId(e.target.value)}
            />
            <button className="btn btn-sm btn-primary" onClick={handleRetrigger} disabled={retriggerLoading}>
              <RefreshCw size={13} />
              {retriggerLoading ? 'Fetching...' : 'Retrigger'}
            </button>
          </div>
          {retriggerMsg && <div className={`form-msg ${retriggerMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`}>{retriggerMsg.text}</div>}
        </div>
      )}

      {/* Manual Callback Entry (Admin/Supervisor) */}
      {(isAdmin || isSupervisor) && (
        <div className="config-section">
          <div className="config-section-title">
            <Plus size={16} /> Manual Callback Entry
          </div>
          <p className="config-description">
            Manually create a callback without a Freshdesk webhook.
          </p>
          <div className="manual-callback-form">
            <div className="add-user-fields">
              <input className="form-input" placeholder="Ticket ID *" value={manualForm.ticketId}
                onChange={e => setManualForm(f => ({ ...f, ticketId: e.target.value }))} />
              <input className="form-input" placeholder="Customer Name *" value={manualForm.customerName}
                onChange={e => setManualForm(f => ({ ...f, customerName: e.target.value }))} />
            </div>
            <div className="add-user-fields" style={{ marginTop: 8 }}>
              <input className="form-input" placeholder="Subject *" value={manualForm.subject}
                onChange={e => setManualForm(f => ({ ...f, subject: e.target.value }))} style={{ flex: 2 }} />
              <input className="form-input" placeholder="Category" value={manualForm.category}
                onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="add-user-fields" style={{ marginTop: 8 }}>
              <select className="filter-select" value={manualForm.type}
                onChange={e => setManualForm(f => ({ ...f, type: e.target.value }))}>
                <option value="Normal Callback Request">Normal</option>
                <option value="Time-Sensitive Callback Request">Time-Sensitive</option>
                <option value="Supervisor Callback Request">Supervisor</option>
              </select>
              <input className="form-input" placeholder="Promised Hours (default 24)" value={manualForm.promisedHours}
                onChange={e => setManualForm(f => ({ ...f, promisedHours: e.target.value }))} type="number" />
              <button className="btn btn-sm btn-primary" onClick={handleManualCreate} disabled={manualLoading}>
                <Plus size={13} />
                {manualLoading ? 'Creating...' : 'Create Callback'}
              </button>
            </div>
          </div>
          {manualMsg && <div className={`form-msg ${manualMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`}>{manualMsg.text}</div>}
        </div>
      )}

      {/* Bulk Upload Callbacks (Admin) */}
      {isAdmin && (
        <div className="config-section">
          <div className="config-section-title">
            <Upload size={16} /> Bulk Upload Callbacks (CSV)
          </div>
          <p className="config-description">
            Upload a CSV file with columns: ticket_id, customer_name, subject, type, category, promised_hours
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="file" accept=".csv" ref={bulkCbRef} onChange={handleBulkCbUpload} style={{ fontSize: 13 }} />
            {bulkCbLoading && <Loader size={16} className="spin-icon" />}
          </div>
          {bulkCbMsg && <div className={`form-msg ${bulkCbMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`}>{bulkCbMsg.text}</div>}
        </div>
      )}

      {/* Business Hours */}
      <div className="config-section">
        <div className="config-section-title">
          <Clock size={16} /> Business Hours
        </div>
        <div className="config-info-row">
          <div className="config-info-badge">24 x 7</div>
          <span className="config-info-text">Callbacks are handled round-the-clock, all days of the week.</span>
        </div>
      </div>

      {/* Notifications (Admin only) */}
      {isAdmin && (
        <div className="config-section">
          <div className="config-section-title">
            <Bell size={16} /> Notifications
          </div>
          <p className="config-description">
            Summary alerts are sent every 3 hours. Configure via Script Properties in Apps Script.
          </p>

          {notifLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--scapia-gray-400)', fontSize: 13 }}>
              <Loader size={14} className="spin-icon" /> Loading notification config...
            </div>
          ) : !api.isLive() ? (
            <div>
              <div className="config-info-row">
                <span className="config-info-text" style={{ color: 'var(--scapia-gray-400)' }}>
                  Notification settings are only available in live (deployed) mode.
                </span>
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleTriggerSummary}
                  disabled={summaryTriggerLoading}
                >
                  <Send size={13} />
                  {summaryTriggerLoading ? 'Sending...' : 'Send Summary Now (Demo)'}
                </button>
                {summaryTriggerMsg && (
                  <div className={`form-msg ${summaryTriggerMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`} style={{ marginTop: 8 }}>
                    {summaryTriggerMsg.text}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Slack */}
              <div className="notif-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <MessageSquare size={18} color="var(--scapia-gray-500)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--scapia-gray-800)' }}>Slack Alerts</div>
                    <div style={{ fontSize: 12, color: 'var(--scapia-gray-400)' }}>
                      {notifConfig?.slackConfigured
                        ? 'Webhook URL configured'
                        : 'Set SLACK_WEBHOOK_URL in Script Properties'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {notifConfig?.slackConfigured
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--scapia-green)' }}><CheckCircle size={14} /> Active</span>
                    : <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--scapia-gray-400)' }}><XCircle size={14} /> Not Configured</span>
                  }
                  <button
                    className="btn btn-xs btn-secondary"
                    onClick={handleTestSlack}
                    disabled={slackTesting || !notifConfig?.slackConfigured}
                  >
                    {slackTesting ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>
              {slackTestMsg && (
                <div className={`form-msg ${slackTestMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`} style={{ marginTop: -8 }}>
                  {slackTestMsg.text}
                </div>
              )}

              {/* Email */}
              <div className="notif-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Mail size={18} color="var(--scapia-gray-500)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--scapia-gray-800)' }}>Email Alerts</div>
                    <div style={{ fontSize: 12, color: 'var(--scapia-gray-400)' }}>
                      {notifConfig?.emailConfigured
                        ? `Recipients: ${notifConfig.emailList || '(configured)'}`
                        : 'Set ALERT_EMAILS in Script Properties'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {notifConfig?.emailConfigured
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--scapia-green)' }}><CheckCircle size={14} /> Active</span>
                    : <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--scapia-gray-400)' }}><XCircle size={14} /> Not Configured</span>
                  }
                  <button
                    className="btn btn-xs btn-secondary"
                    onClick={handleTestEmail}
                    disabled={emailTesting || !notifConfig?.emailConfigured}
                  >
                    {emailTesting ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>
              {emailTestMsg && (
                <div className={`form-msg ${emailTestMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`} style={{ marginTop: -8 }}>
                  {emailTestMsg.text}
                </div>
              )}

              {/* Manual Summary Trigger */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--scapia-gray-200)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--scapia-gray-800)', marginBottom: 6 }}>Manual Summary Trigger</div>
                <p style={{ fontSize: 12, color: 'var(--scapia-gray-400)', marginBottom: 10 }}>
                  Send the periodic summary report to Slack and Email right now, without waiting for the next scheduled run.
                </p>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleTriggerSummary}
                  disabled={summaryTriggerLoading || (!notifConfig?.slackConfigured && !notifConfig?.emailConfigured)}
                >
                  <Send size={13} />
                  {summaryTriggerLoading ? 'Sending...' : 'Send Summary Now'}
                </button>
                {summaryTriggerMsg && (
                  <div className={`form-msg ${summaryTriggerMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`} style={{ marginTop: 8 }}>
                    {summaryTriggerMsg.text}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Management */}
      <div className="config-section">
        <div className="config-section-title">
          <Users size={16} /> User Management
        </div>

        <div className="user-table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.email} className={u.email === currentUser?.email ? 'current-user-row' : ''}>
                  <td>{u.name} {u.email === currentUser?.email && <span className="you-badge">You</span>}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span>
                  </td>
                  <td><span className={`status-badge status-${u.active ? 'pending' : 'completed'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => { setResetEmail(resetEmail === u.email ? null : u.email); setResetPw(''); setResetMsg(null); }}
                          title="Reset Password"
                        >
                          <Key size={11} />
                        </button>
                        {u.email !== currentUser?.email && (
                          <>
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => { setRoleChangeEmail(roleChangeEmail === u.email ? null : u.email); setRoleChangeValue(u.role); setRoleChangeMsg(null); }}
                              title="Change Role"
                            >
                              <ShieldCheck size={11} />
                            </button>
                            <button
                              className="btn btn-xs btn-danger"
                              onClick={() => handleRemoveUser(u.email, u.name)}
                              title="Remove User"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                      {resetEmail === u.email && (
                        <div className="reset-pw-inline">
                          <input
                            className="form-input"
                            type="password"
                            placeholder="New password (min 6)"
                            value={resetPw}
                            onChange={e => setResetPw(e.target.value)}
                            style={{ fontSize: 12, padding: '5px 8px', marginTop: 6, width: '100%', minWidth: 140 }}
                          />
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            <button className="btn btn-xs btn-primary" onClick={() => handleResetPassword(u.email)}>
                              <RotateCcw size={10} /> Reset
                            </button>
                            <button className="btn btn-xs btn-secondary" onClick={() => { setResetEmail(null); setResetPw(''); setResetMsg(null); }}>
                              Cancel
                            </button>
                          </div>
                          {resetMsg && resetEmail === u.email && (
                            <div className={`form-msg ${resetMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`} style={{ fontSize: 11, marginTop: 4, padding: '4px 8px' }}>
                              {resetMsg.text}
                            </div>
                          )}
                        </div>
                      )}
                      {roleChangeEmail === u.email && (
                        <div className="reset-pw-inline">
                          <select className="filter-select" value={roleChangeValue} onChange={e => setRoleChangeValue(e.target.value)}
                            style={{ fontSize: 12, marginTop: 6 }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            <button className="btn btn-xs btn-primary" onClick={() => handleRoleChange(u.email)}>
                              Save Role
                            </button>
                            <button className="btn btn-xs btn-secondary" onClick={() => { setRoleChangeEmail(null); setRoleChangeMsg(null); }}>
                              Cancel
                            </button>
                          </div>
                          {roleChangeMsg && roleChangeEmail === u.email && (
                            <div className={`form-msg ${roleChangeMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`} style={{ fontSize: 11, marginTop: 4, padding: '4px 8px' }}>
                              {roleChangeMsg.text}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAdmin && (
          <>
            <div className="add-user-form">
              <div className="add-user-form-title">
                <UserPlus size={15} /> Add New User
              </div>
              <div className="add-user-fields">
                <input className="form-input" placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} />
                <input className="form-input" placeholder="Email Address" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                <select className="filter-select" value={newRole} onChange={e => setNewRole(e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="btn btn-sm btn-primary" onClick={handleAddUser}>Add User</button>
              </div>
              <p className="config-description" style={{ marginTop: 6 }}>
                New users are created with the default password: Welcome@1234
              </p>
              {addMsg && <div className={`form-msg ${addMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`}>{addMsg.text}</div>}
            </div>

            {/* Bulk User Upload */}
            <div className="add-user-form" style={{ marginTop: 16 }}>
              <div className="add-user-form-title">
                <Upload size={15} /> Bulk Upload Users (CSV)
              </div>
              <p className="config-description">
                Upload a CSV with columns: name, email, role (optional, defaults to Agent)
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="file" accept=".csv" ref={bulkUserRef} onChange={handleBulkUserUpload} style={{ fontSize: 13 }} />
                {bulkUserLoading && <Loader size={16} className="spin-icon" />}
              </div>
              {bulkUserMsg && <div className={`form-msg ${bulkUserMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`}>{bulkUserMsg.text}</div>}
            </div>
          </>
        )}
      </div>

      {/* Clear Old Callbacks */}
      {isAdmin && (
        <div className="config-section">
          <div className="config-section-title">
            <Trash size={16} /> Clear Old Callbacks
          </div>
          <p className="config-description">
            Permanently removes completed callbacks older than the selected date from the system.
          </p>
          <div className="clear-old-row">
            <label className="form-label">Delete completed callbacks before:</label>
            <input
              type="date"
              className="form-input date-input"
              value={clearDate}
              onChange={e => setClearDate(e.target.value)}
              max={formatDate(new Date())}
            />
            <button
              className="btn btn-sm btn-danger"
              onClick={handleClearOld}
              disabled={clearLoading}
            >
              <Trash size={14} />
              {clearLoading ? 'Clearing...' : 'Clear Old'}
            </button>
          </div>
          {clearMsg && (
            <div className={`form-msg ${clearMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`}>
              {clearMsg.text}
            </div>
          )}
          <div className="config-warning">
            <AlertTriangle size={13} /> This action is irreversible. Cleared callbacks cannot be recovered.
          </div>
        </div>
      )}

      {/* Change My Password */}
      <div className="config-section">
        <div className="config-section-title">
          <Key size={16} /> Change My Password
        </div>
        <p className="config-description">
          Update your login password. This only affects your account.
        </p>
        <div className="password-fields">
          <input className="form-input" type="password" placeholder="Current Password" value={curPw} onChange={e => setCurPw(e.target.value)} />
          <input className="form-input" type="password" placeholder="New Password (min 6 chars)" value={newPw} onChange={e => setNewPw(e.target.value)} />
          <input className="form-input" type="password" placeholder="Confirm New Password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          <button className="btn btn-sm btn-primary" onClick={handlePasswordChange}>Update Password</button>
        </div>
        {pwMsg && <div className={`form-msg ${pwMsg.ok ? 'form-msg-ok' : 'form-msg-err'}`}>{pwMsg.text}</div>}
      </div>
    </div>
  );
}
