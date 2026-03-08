import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, agent } = req.body;
  if (!id || !agent) return res.status(400).json({ error: 'id and agent required' });

  await db.from('callbacks').update({ status: 'assigned', assigned_agent: agent }).eq('id', id);
  await addLog(id, 'assigned', 'Supervisor', `Assigned ${id} to ${agent}`);
  return res.status(200).json({ success: true });
}
