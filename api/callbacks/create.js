import { db, addLog, getNextCallbackId, calcDeadline, detectCategory } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticketId, customerName, subject, type, category, promisedHours } = req.body;
  if (!ticketId || !customerName || !subject) return res.status(400).json({ error: 'ticketId, customerName, subject required' });

  const now = new Date().toISOString();
  const hours = parseFloat(promisedHours) || 24;
  const id = await getNextCallbackId();
  const tid = ticketId.toString().replace(/\D/g, '');
  const fdTicketId = 'FD-' + tid;
  const ticketLink = `https://scapia-support.freshdesk.com/a/tickets/${tid}`;

  const { error } = await db.from('callbacks').insert({
    id,
    ticket_id: fdTicketId,
    customer_name: customerName,
    ticket_link: ticketLink,
    subject,
    category: category || detectCategory(subject),
    type: type || 'Normal Callback Request',
    created_at: now,
    promised_hours: hours,
    deadline: calcDeadline(now, hours),
    status: 'pending',
  });

  if (error) return res.status(500).json({ error: error.message });
  await addLog(id, 'created', '', `Manual callback created: ${subject}`);
  return res.status(200).json({ success: true, id, message: `Callback ${id} created` });
}
