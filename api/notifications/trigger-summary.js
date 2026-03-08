import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Get stats
    const { data: stats } = await db.from('callback_stats').select('*').single();
    const { data: breached } = await db.from('callbacks')
      .select('id, subject, deadline')
      .in('status', ['pending', 'assigned', 'in-progress'])
      .lt('deadline', new Date().toISOString());

    const pending = stats?.pending || 0;
    const assigned = stats?.assigned || 0;
    const inProgress = stats?.in_progress || 0;
    const completed = stats?.completed || 0;
    const breachedCount = breached?.length || 0;

    const summaryText = [
      '*Scapia Command Centre — Summary*',
      `Pending: ${pending} | Assigned: ${assigned} | In Progress: ${inProgress} | Completed: ${completed}`,
      `SLA Breached: ${breachedCount}`,
      breachedCount > 0 ? `Breached: ${breached.map(b => b.id).join(', ')}` : '',
    ].filter(Boolean).join('\n');

    // Send to Slack
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: summaryText }),
      });
    }

    // Email would go here with your preferred service
    return res.status(200).json({ success: true, message: 'Summary sent.' });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
