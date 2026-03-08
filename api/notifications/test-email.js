// Email sending requires an external service (SendGrid, Resend, etc.)
// This is a placeholder - configure your preferred email service
export default async function handler(req, res) {
  const emails = process.env.ALERT_EMAILS;
  if (!emails) return res.status(400).json({ success: false, error: 'ALERT_EMAILS not configured' });

  // TODO: Integrate with your email service (SendGrid, Resend, etc.)
  // For now, just return success to indicate config is working
  return res.status(200).json({ success: true, message: `Email would be sent to: ${emails}` });
}
