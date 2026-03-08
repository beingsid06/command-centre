export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Remove the cron entry from vercel.json to disable periodic triggers.'
  });
}
