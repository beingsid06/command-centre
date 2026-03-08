// Vercel Cron Jobs handle periodic triggers
// Configure in vercel.json: "crons": [{ "path": "/api/notifications/trigger-summary", "schedule": "0 */3 * * *" }]
export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Periodic triggers are configured via Vercel Cron Jobs in vercel.json. Add: "crons": [{"path": "/api/notifications/trigger-summary", "schedule": "0 */3 * * *"}]'
  });
}
