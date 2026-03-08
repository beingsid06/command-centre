import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

export const db = createClient(supabaseUrl, supabaseKey);

export async function addLog(callbackId, action, agent, details) {
  await db.from('logs').insert({
    callback_id: callbackId,
    action,
    agent: agent || '',
    details: details || '',
    timestamp: new Date().toISOString(),
  });
}

export async function getNextCallbackId() {
  const { data, error } = await db.rpc('next_callback_id');
  if (error) throw new Error(error.message);
  return data;
}

export function calcDeadline(createdAt, promisedHours) {
  const d = new Date(createdAt);
  d.setMinutes(d.getMinutes() + Math.round(promisedHours * 60));
  return d.toISOString();
}

export function detectCategory(subject) {
  if (!subject) return 'General';
  const s = subject.toLowerCase();
  if (s.includes('billing') || s.includes('payment') || s.includes('refund') || s.includes('charge')) return 'Billing';
  if (s.includes('card') || s.includes('limit') || s.includes('block') || s.includes('transaction')) return 'Card Services';
  if (s.includes('travel') || s.includes('lounge') || s.includes('airport') || s.includes('flight')) return 'Travel Benefits';
  if (s.includes('reward') || s.includes('point') || s.includes('cashback')) return 'Rewards';
  if (s.includes('account') || s.includes('kyc') || s.includes('profile') || s.includes('password')) return 'Account Services';
  return 'General';
}

export function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResp(message, status = 400) {
  return jsonResp({ success: false, error: message }, status);
}
