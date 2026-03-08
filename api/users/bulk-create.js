import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { users } = req.body;
  if (!users?.length) return res.status(400).json({ error: 'users array required' });

  let created = 0;
  for (const u of users) {
    if (!u.name || !u.email) continue;
    const { error } = await db.from('users').insert({
      name: u.name, email: u.email, role: u.role || 'Agent', active: true, password: 'Welcome@1234',
    });
    if (!error) created++;
  }
  return res.status(200).json({ success: true, message: `${created} users created` });
}
