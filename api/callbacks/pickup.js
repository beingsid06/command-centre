import { db, addLog, jsonResp, errorResp } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, agent } = req.body;
  if (!id || !agent) return res.status(400).json({ error: 'id and agent required' });

  const now = new Date().toISOString();
  const { data: cb, error: fetchErr } = await db.from('callbacks').select('*').eq('id', id).single();
  if (fetchErr || !cb) return res.status(404).json({ error: 'Callback not found' });
  if (cb.status !== 'pending' && cb.status !== 'assigned') return res.status(400).json({ error: 'Can only pick up pending or assigned callbacks' });

  const { error } = await db.from('callbacks').update({
    status: 'in-progress',
    assigned_agent: agent,
    picked_up_at: now,
  }).eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  await addLog(id, 'picked_up', agent, `${agent} picked up ${id}`);
  return res.status(200).json({ success: true });
}
