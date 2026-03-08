import { db } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, ...body } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });

  try {
    switch (action) {

      case 'create': {
        const { name, email, role } = body;
        if (!name || !email) return res.status(400).json({ error: 'name and email required' });
        const { error } = await db.from('users').insert({
          name, email, role: role || 'Agent', active: true, password: 'Welcome@1234',
        });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }

      case 'delete': {
        const { email } = body;
        if (!email) return res.status(400).json({ error: 'email required' });
        const { error } = await db.from('users').delete().eq('email', email);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }

      case 'reset-password': {
        const { email, newPassword } = body;
        if (!email || !newPassword) return res.status(400).json({ error: 'email and newPassword required' });
        const { error } = await db.from('users').update({ password: newPassword }).eq('email', email);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }

      case 'update-role': {
        const { email, role } = body;
        if (!email || !role) return res.status(400).json({ error: 'email and role required' });
        const { error } = await db.from('users').update({ role }).eq('email', email);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }

      case 'bulk-create': {
        const { users } = body;
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

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
