import { db, addLog, getNextCallbackId, calcDeadline, detectCategory } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body;

    // If action=retrigger, handle retrigger flow
    if (payload.action === 'retrigger') {
      return handleRetrigger(payload, res);
    }

    // Default: handle incoming Freshdesk webhook
    const rawTicketId = String(payload.ticket_id || '').replace(/\D/g, '');
    if (!rawTicketId) return res.status(400).json({ error: 'Missing ticket_id' });

    const ticketId = 'FD-' + rawTicketId;

    // Check ticket status — reject if closed/resolved
    const ticketStatus = String(payload.ticket_status || '').toLowerCase();
    if (ticketStatus === 'closed' || ticketStatus === 'resolved') {
      return res.status(200).json({ success: false, message: 'Ticket is closed/resolved, ignoring.' });
    }

    // Dedup: reject if any non-completed callback exists for this ticket
    const { data: existing } = await db.from('callbacks')
      .select('id, status')
      .eq('ticket_id', ticketId)
      .neq('status', 'completed');

    if (existing && existing.length > 0) {
      return res.status(200).json({ success: false, message: `Duplicate: ${ticketId} already has active callback ${existing[0].id}` });
    }

    // Validate type
    const validTypes = ['Normal Callback Request', 'Time-Sensitive Callback Request', 'Supervisor Callback Request'];
    const type = validTypes.includes(payload.ticket_type) ? payload.ticket_type : 'Normal Callback Request';
    const promisedHours = parseFloat(payload.cf_time_promised_in_hrs) || 24;
    const now = new Date().toISOString();

    const id = await getNextCallbackId();
    const subject = payload.ticket_subject || payload.requester_name || 'No subject';
    const category = payload.cf_category || detectCategory(subject);

    const { error } = await db.from('callbacks').insert({
      id, ticket_id: ticketId,
      customer_name: payload.requester_name || 'Unknown',
      ticket_link: `https://scapia-support.freshdesk.com/a/tickets/${rawTicketId}`,
      subject, category, type, created_at: now,
      promised_hours: promisedHours, deadline: calcDeadline(now, promisedHours),
      status: 'pending', freshdesk_agent: payload.ticket_agent_name || '',
    });

    if (error) return res.status(500).json({ error: error.message });
    await addLog(id, 'created', '', `Webhook: ${ticketId} — ${subject}`);
    return res.status(200).json({ success: true, callbackId: id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function handleRetrigger(payload, res) {
  const { ticketId } = payload;
  if (!ticketId) return res.status(400).json({ error: 'ticketId required' });

  const domain = process.env.FRESHDESK_DOMAIN || 'scapia-support';
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'FRESHDESK_API_KEY not configured' });

  const tid = String(ticketId).replace(/\D/g, '');
  const fdResp = await fetch(`https://${domain}.freshdesk.com/api/v2/tickets/${tid}`, {
    headers: { 'Authorization': 'Basic ' + Buffer.from(apiKey + ':X').toString('base64') },
  });
  if (!fdResp.ok) return res.status(400).json({ error: `Freshdesk API error: ${fdResp.status}` });
  const ticket = await fdResp.json();

  const fdTicketId = 'FD-' + tid;
  const now = new Date().toISOString();
  const promisedHours = parseFloat(ticket.custom_fields?.cf_time_promised_in_hrs) || 24;
  const subject = ticket.subject || 'No subject';
  const id = await getNextCallbackId();

  await db.from('callbacks').insert({
    id, ticket_id: fdTicketId,
    customer_name: ticket.requester?.name || 'Unknown',
    ticket_link: `https://${domain}.freshdesk.com/a/tickets/${tid}`,
    subject, category: ticket.custom_fields?.cf_category || detectCategory(subject),
    type: ticket.custom_fields?.cf_callback_request_type || 'Normal Callback Request',
    created_at: now, promised_hours: promisedHours,
    deadline: calcDeadline(now, promisedHours), status: 'pending',
    freshdesk_agent: ticket.responder?.name || '',
  });

  await addLog(id, 'created', '', `Retrigger: ${fdTicketId} — ${subject}`);
  return res.status(200).json({ success: true, message: `Callback ${id} created for ticket ${fdTicketId}` });
}
