import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, agent } = req.body;
  if (!id || !agent) return res.status(400).json({ error: 'id and agent required' });

  const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
  if (!cb || (cb.status !== 'assigned' && cb.status !== 'in-progress'))
    return res.status(400).json({ error: 'Can only reassign assigned or in-progress callbacks' });

  await db.from('callbacks').update({ status: 'assigned', assigned_agent: agent, picked_up_at: null }).eq('id', id);
  await addLog(id, 'reassigned', 'Supervisor', `Reassigned ${id} from ${cb.assigned_agent} to ${agent}`);
  return res.status(200).json({ success: true });
}
