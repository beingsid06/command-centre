import { db } from './lib/db.js';

export default async function handler(req, res) {
  const { data, error } = await db.from('callback_stats').select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
