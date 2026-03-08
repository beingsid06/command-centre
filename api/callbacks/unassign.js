import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
  if (!cb || (cb.status !== 'assigned' && cb.status !== 'in-progress'))
    return res.status(400).json({ error: 'Can only unassign assigned or in-progress callbacks' });

  await db.from('callbacks').update({ status: 'pending', assigned_agent: null, picked_up_at: null }).eq('id', id);
  await addLog(id, 'unassigned', 'Supervisor', `Unassigned ${id} from ${cb.assigned_agent}`);
  return res.status(200).json({ success: true });
}
