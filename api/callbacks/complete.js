import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, notes, followUpRequired, followUpAt } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const now = new Date().toISOString();
  const { data: cb, error: fetchErr } = await db.from('callbacks').select('*').eq('id', id).single();
  if (fetchErr || !cb) return res.status(404).json({ error: 'Callback not found' });
  if (cb.status !== 'in-progress') return res.status(400).json({ error: 'Only in-progress callbacks can be completed' });

  const { error } = await db.from('callbacks').update({
    status: 'completed',
    completed_at: now,
    notes: notes || '',
    follow_up_required: followUpRequired || false,
    follow_up_at: followUpAt || null,
  }).eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  await addLog(id, 'completed', cb.assigned_agent, `${cb.assigned_agent} completed ${id}`);
  return res.status(200).json({ success: true });
}
