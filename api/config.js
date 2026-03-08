import { db } from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { safe, monitoring, urgent, critical } = req.body;
  const updates = [
    { key: 'sla_safe', value: String(safe || 240) },
    { key: 'sla_monitoring', value: String(monitoring || 120) },
    { key: 'sla_urgent', value: String(urgent || 30) },
    { key: 'sla_critical', value: String(critical || 0) },
  ];

  for (const u of updates) {
    await db.from('config').upsert(u, { onConflict: 'key' });
  }
  return res.status(200).json({ success: true, message: 'SLA config updated' });
}
