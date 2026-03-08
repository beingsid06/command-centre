import { db, addLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, notes } = req.body;
  if (!id || !notes) return res.status(400).json({ error: 'id and notes required' });

  const now = new Date().toISOString();
  const { data: cb } = await db.from('callbacks').select('*').eq('id', id).single();
  if (!cb || cb.status !== 'in-progress') return res.status(400).json({ error: 'Only in-progress callbacks can be force-released' });

  const newNotes = (cb.force_release_notes ? cb.force_release_notes + '\n---\n' : '') + now + ': ' + notes;
  await db.from('callbacks').update({
    status: 'pending', assigned_agent: null, picked_up_at: null,
    force_release_count: (cb.force_release_count || 0) + 1,
    force_release_notes: newNotes,
  }).eq('id', id);

  await addLog(id, 'force_release', 'Supervisor', `Force-released ${id} from ${cb.assigned_agent} — ${notes}`);
  return res.status(200).json({ success: true });
}
