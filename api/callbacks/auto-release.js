import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
  if (!cb || cb.status !== 'in-progress') return res.status(400).json({ error: 'Not in-progress' });

  await db.from('callbacks').update({
    status: 'pending', assigned_agent: null, picked_up_at: null,
    auto_release_count: (cb.auto_release_count || 0) + 1,
  }).eq('id', id);

  await addLog(id, 'auto_release', cb.assigned_agent, `Auto-released ${id} (30m timeout)`);
  return res.status(200).json({ success: true });
}
