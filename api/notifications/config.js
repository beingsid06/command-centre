export default async function handler(req, res) {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const emails = process.env.ALERT_EMAILS;
  return res.status(200).json({
    slackConfigured: !!slackUrl,
    emailConfigured: !!emails,
    emailList: emails || '',
  });
}
