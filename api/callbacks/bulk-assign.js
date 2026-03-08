import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { ids, agent } = req.body;
  if (!ids?.length || !agent) return res.status(400).json({ error: 'ids and agent required' });

  for (const id of ids) {
    await db.from('callbacks').update({ status: 'assigned', assigned_agent: agent })
      .eq('id', id).eq('status', 'pending');
    await addLog(id, 'assigned', 'Supervisor', `Bulk assigned ${id} to ${agent}`);
  }
  return res.status(200).json({ success: true, count: ids.length });
}
