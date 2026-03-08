export default async function handler(req, res) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return res.status(400).json({ success: false, error: 'SLACK_WEBHOOK_URL not configured' });

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Scapia Command Centre — Test notification' }),
    });
    if (!resp.ok) throw new Error(`Slack responded ${resp.status}`);
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
