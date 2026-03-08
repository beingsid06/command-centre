import { db, addLog, getNextCallbackId, calcDeadline } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, followUpAt, notes } = req.body;
  if (!id || !followUpAt) return res.status(400).json({ error: 'id and followUpAt required' });

  const now = new Date().toISOString();
  const { data: cb, error: fetchErr } = await db.from('callbacks').select('*').eq('id', id).single();
  if (fetchErr || !cb) return res.status(404).json({ error: 'Callback not found' });

  // Mark original as completed
  await db.from('callbacks').update({
    status: 'completed',
    completed_at: now,
    notes: notes || '',
    follow_up_required: true,
    follow_up_at: followUpAt,
  }).eq('id', id);

  // Create new follow-up callback
  const newId = await getNextCallbackId();
  const { error } = await db.from('callbacks').insert({
    id: newId,
    ticket_id: cb.ticket_id,
    customer_name: cb.customer_name,
    ticket_link: cb.ticket_link,
    subject: cb.subject,
    category: cb.category,
    type: cb.type,
    created_at: now,
    promised_hours: cb.promised_hours,
    deadline: followUpAt,
    status: 'pending',
    parent_callback_id: id,
    freshdesk_agent: cb.freshdesk_agent,
  });

  if (error) return res.status(500).json({ error: error.message });

  await addLog(id, 'completed', cb.assigned_agent || 'Agent', `${cb.assigned_agent || 'Agent'} completed ${id} (follow-up)`);
  await addLog(newId, 'created', '', `Follow-up callback from ${id}`);
  return res.status(200).json({ success: true, newId });
}
