import { db, addLog, getNextCallbackId, calcDeadline, detectCategory } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { callbacks } = req.body;
  if (!callbacks?.length) return res.status(400).json({ error: 'callbacks array required' });

  const now = new Date().toISOString();
  let created = 0;
  for (const cb of callbacks) {
    try {
      const id = await getNextCallbackId();
      const tid = (cb.ticketId || '').toString().replace(/\D/g, '');
      const hours = parseFloat(cb.promisedHours) || 24;
      await db.from('callbacks').insert({
        id,
        ticket_id: 'FD-' + tid,
        customer_name: cb.customerName || '',
        ticket_link: `https://scapia-support.freshdesk.com/a/tickets/${tid}`,
        subject: cb.subject || '',
        category: cb.category || detectCategory(cb.subject),
        type: cb.type || 'Normal Callback Request',
        created_at: now,
        promised_hours: hours,
        deadline: calcDeadline(now, hours),
        status: 'pending',
      });
      await addLog(id, 'created', '', `Bulk created: ${cb.subject || id}`);
      created++;
    } catch (e) { /* skip failed rows */ }
  }
  return res.status(200).json({ success: true, message: `${created} callbacks created` });
}
