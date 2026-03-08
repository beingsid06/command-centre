import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { beforeDate } = req.body;
  if (!beforeDate) return res.status(400).json({ error: 'beforeDate required' });

  const { data: rows, error: countErr } = await db.from('callbacks')
    .select('id')
    .eq('status', 'completed')
    .lt('completed_at', beforeDate);

  const count = rows?.length || 0;

  const { error } = await db.from('callbacks')
    .delete()
    .eq('status', 'completed')
    .lt('completed_at', beforeDate);

  if (error) return res.status(500).json({ error: error.message });
  await addLog('-', 'clear_old', 'Admin', `Cleared ${count} old callbacks before ${new Date(beforeDate).toLocaleDateString()}`);
  return res.status(200).json({ success: true, count });
}
