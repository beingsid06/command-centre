import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'email and role required' });

  const { error } = await db.from('users').update({ role }).eq('email', email);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
