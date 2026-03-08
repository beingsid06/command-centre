import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, email, role } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  const { error } = await db.from('users').insert({
    name, email, role: role || 'Agent', active: true, password: 'Welcome@1234',
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
