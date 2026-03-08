import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const { error } = await db.from('users').delete().eq('email', email);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
