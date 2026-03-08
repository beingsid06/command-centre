import { db, addLog, getNextCallbackId, calcDeadline, detectCategory } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticketId } = req.body;
  if (!ticketId) return res.status(400).json({ error: 'ticketId required' });

  const domain = process.env.FRESHDESK_DOMAIN || 'scapia-support';
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'FRESHDESK_API_KEY not configured' });

  try {
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
      id,
      ticket_id: fdTicketId,
      customer_name: ticket.requester?.name || 'Unknown',
      ticket_link: `https://${domain}.freshdesk.com/a/tickets/${tid}`,
      subject,
      category: ticket.custom_fields?.cf_category || detectCategory(subject),
      type: ticket.custom_fields?.cf_callback_request_type || 'Normal Callback Request',
      created_at: now,
      promised_hours: promisedHours,
      deadline: calcDeadline(now, promisedHours),
      status: 'pending',
      freshdesk_agent: ticket.responder?.name || '',
    });

    await addLog(id, 'created', '', `Retrigger: ${fdTicketId} — ${subject}`);
    return res.status(200).json({ success: true, message: `Callback ${id} created for ticket ${fdTicketId}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
