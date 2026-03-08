import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
  if (!cb || cb.status !== 'in-progress') return res.status(400).json({ error: 'Only in-progress callbacks can be extended' });
  if ((cb.extend_count || 0) >= 3) return res.status(400).json({ error: 'Maximum 3 extensions reached' });

  const now = new Date().toISOString();
  const newCount = (cb.extend_count || 0) + 1;
  await db.from('callbacks').update({ picked_up_at: now, extend_count: newCount }).eq('id', id);
  await addLog(id, 'extended', cb.assigned_agent, `${cb.assigned_agent} extended timer (${newCount}/3)`);
  return res.status(200).json({ success: true, extendCount: newCount });
}
