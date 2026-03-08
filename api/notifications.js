import { db } from './lib/db.js';

export default async function handler(req, res) {
  const action = req.method === 'GET'
    ? (req.query?.action || 'config')
    : (req.body?.action || 'trigger-summary');

  try {
    switch (action) {

      case 'config': {
        const slackUrl = process.env.SLACK_WEBHOOK_URL;
        const emails = process.env.ALERT_EMAILS;
        return res.status(200).json({
          slackConfigured: !!slackUrl,
          emailConfigured: !!emails,
          emailList: emails || '',
        });
      }

      case 'test-slack': {
        const url = process.env.SLACK_WEBHOOK_URL;
        if (!url) return res.status(400).json({ success: false, error: 'SLACK_WEBHOOK_URL not configured' });
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Scapia Command Centre — Test notification' }),
        });
        if (!resp.ok) throw new Error(`Slack responded ${resp.status}`);
        return res.status(200).json({ success: true });
      }

      case 'test-email': {
        const emails = process.env.ALERT_EMAILS;
        if (!emails) return res.status(400).json({ success: false, error: 'ALERT_EMAILS not configured' });
        return res.status(200).json({ success: true, message: `Email would be sent to: ${emails}` });
      }

      case 'trigger-summary': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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

        const slackUrl = process.env.SLACK_WEBHOOK_URL;
        if (slackUrl) {
          await fetch(slackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: summaryText }),
          });
        }
        return res.status(200).json({ success: true, message: 'Summary sent.' });
      }

      case 'setup-trigger': {
        return res.status(200).json({
          success: true,
          message: 'Periodic triggers are configured via Vercel Cron Jobs in vercel.json or external cron services like cron-job.org.',
        });
      }

      case 'remove-trigger': {
        return res.status(200).json({
          success: true,
          message: 'Remove the cron entry from vercel.json to disable periodic triggers.',
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
