import { db } from './lib/db.js';

async function sendEmail(to, subject, htmlBody) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Scapia Command Centre <noreply@scapia.cards>';
  if (!apiKey) return { sent: false, error: 'RESEND_API_KEY not configured' };

  const emails = to.split(',').map(e => e.trim()).filter(Boolean);
  if (emails.length === 0) return { sent: false, error: 'No recipients' };

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: emails, subject, html: htmlBody }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    return { sent: false, error: `Resend HTTP ${resp.status}: ${err}` };
  }
  return { sent: true };
}

export default async function handler(req, res) {
  const action = req.method === 'GET'
    ? (req.query?.action || 'config')
    : (req.body?.action || 'trigger-summary');

  try {
    switch (action) {

      case 'config': {
        const slackUrl = process.env.SLACK_WEBHOOK_URL;
        const emails = process.env.ALERT_EMAILS;
        const resendKey = process.env.RESEND_API_KEY;
        return res.status(200).json({
          slackConfigured: !!slackUrl,
          emailConfigured: !!(emails && resendKey),
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
        const result = await sendEmail(
          emails,
          'Scapia Command Centre — Test Email',
          '<h2>Test Email</h2><p>This is a test email from Scapia Command Centre.</p><p>If you received this, email alerts are working correctly.</p>'
        );
        if (!result.sent) return res.status(400).json({ success: false, error: result.error });
        return res.status(200).json({ success: true, message: `Test email sent to: ${emails}` });
      }

      case 'trigger-summary': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        // Gather stats
        const { data: allCbs } = await db.from('callbacks').select('id, status, deadline, completed_at, subject');
        const cbs = allCbs || [];
        const now = new Date().toISOString();

        const pending = cbs.filter(c => c.status === 'pending').length;
        const assigned = cbs.filter(c => c.status === 'assigned').length;
        const inProgress = cbs.filter(c => c.status === 'in-progress').length;
        const completed = cbs.filter(c => c.status === 'completed').length;
        const breached = cbs.filter(c =>
          ['pending', 'assigned', 'in-progress'].includes(c.status) && c.deadline && c.deadline < now
        );
        const breachedCount = breached.length;

        // Slack summary
        const summaryText = [
          '*Scapia Command Centre — Summary*',
          `Pending: ${pending} | Assigned: ${assigned} | In Progress: ${inProgress} | Completed: ${completed}`,
          `SLA Breached: ${breachedCount}`,
          breachedCount > 0 ? `Breached: ${breached.map(b => b.id).join(', ')}` : '',
        ].filter(Boolean).join('\n');

        const slackUrl = process.env.SLACK_WEBHOOK_URL;
        let slackSent = false;
        if (slackUrl) {
          const resp = await fetch(slackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: summaryText }),
          });
          slackSent = resp.ok;
        }

        // Email summary
        const alertEmails = process.env.ALERT_EMAILS;
        let emailSent = false;
        if (alertEmails && process.env.RESEND_API_KEY) {
          const breachedRows = breached.map(b =>
            `<tr><td style="padding:4px 8px;border:1px solid #ddd">${b.id}</td><td style="padding:4px 8px;border:1px solid #ddd">${b.subject || ''}</td><td style="padding:4px 8px;border:1px solid #ddd">${b.deadline ? new Date(b.deadline).toLocaleString() : '-'}</td></tr>`
          ).join('');

          const htmlBody = `
            <h2 style="color:#D84100">Scapia Command Centre — Summary</h2>
            <table style="border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:6px 12px;font-weight:bold">Pending</td><td style="padding:6px 12px">${pending}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold">Assigned</td><td style="padding:6px 12px">${assigned}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold">In Progress</td><td style="padding:6px 12px">${inProgress}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold">Completed</td><td style="padding:6px 12px">${completed}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;color:#DC2626">SLA Breached</td><td style="padding:6px 12px;color:#DC2626;font-weight:bold">${breachedCount}</td></tr>
            </table>
            ${breachedCount > 0 ? `
              <h3 style="color:#DC2626">Breached Callbacks</h3>
              <table style="border-collapse:collapse;margin:8px 0">
                <tr style="background:#f3f4f6"><th style="padding:6px 8px;border:1px solid #ddd;text-align:left">ID</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Subject</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:left">Deadline</th></tr>
                ${breachedRows}
              </table>
            ` : ''}
            <p style="color:#6B7280;font-size:12px;margin-top:20px">Sent from Scapia Callback Command Centre</p>
          `;

          const result = await sendEmail(alertEmails, `Callback Summary — ${breachedCount} SLA Breached`, htmlBody);
          emailSent = result.sent;
        }

        return res.status(200).json({
          success: true,
          message: `Summary sent.${slackSent ? ' Slack: OK.' : ''}${emailSent ? ' Email: OK.' : ''}`,
        });
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
