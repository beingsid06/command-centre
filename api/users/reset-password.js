import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'email and newPassword required' });

  const { error } = await db.from('users').update({ password: newPassword }).eq('email', email);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
