import { calculateDeadline } from '../utils/slaEngine';

export const CALLBACK_TYPES = [
  'Normal Callback Request',
  'Time-Sensitive Callback Request',
  'Supervisor Callback Request',
];

export const CATEGORIES = ['Billing', 'Card Services', 'Rewards', 'Technical', 'Account', 'General'];

export const DEFAULT_USERS = [
  { name: 'Siddharth', email: 'siddharth@scapia.cards', role: 'Admin', active: true },
  { name: 'Priya Patel', email: 'priya@scapia.cards', role: 'Supervisor', active: true },
  { name: 'Arjun Reddy', email: 'arjun@scapia.cards', role: 'Agent', active: true },
  { name: 'Sneha Gupta', email: 'sneha@scapia.cards', role: 'Agent', active: true },
  { name: 'Vikram Singh', email: 'vikram@scapia.cards', role: 'Agent', active: true },
];

const SUBJECTS = [
  'Card not received after 15 days',
  'Transaction declined at merchant',
  'Unable to link card to app',
  'Reward points not credited',
  'EMI conversion not reflected',
  'Card blocked after international use',
  'Billing dispute for unknown charge',
  'Lounge access denied at airport',
  'Annual fee reversal request',
  'Auto-debit setup failing',
  'Cashback not credited for partner',
  'Forex charge clarification needed',
  'Priority pass not activated',
  'Statement discrepancy in billing',
];

const NAMES = [
  'Rahul Sharma', 'Priya Patel', 'Arjun Reddy', 'Sneha Gupta', 'Vikram Singh',
  'Anita Desai', 'Karan Mehta', 'Divya Nair', 'Rohit Verma', 'Meera Iyer',
  'Suresh Kumar', 'Lalita Rao', 'Deepak Singh', 'Pooja Menon',
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randBetween(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

const AGENT_NAMES_FD = ['Rohit Agent', 'Meera Support', 'Karan FD', 'Divya Support', ''];

let idCtr = 0;

export function generateCallback(overrides = {}) {
  const hoursAgo = randBetween(1, 48);
  const createdAt = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  const promisedHours = rand([2, 4, 6, 8, 12, 24]);
  const deadline = calculateDeadline(createdAt, promisedHours).toISOString();
  const ticketNum = String(100000 + randBetween(1, 99999));
  idCtr++;
  const padded = String(idCtr).padStart(5, '0');
  return {
    id: `CB-${padded}`,
    ticketId: `FD-${ticketNum}`,
    customerName: rand(NAMES),
    ticketLink: `https://scapia-support.freshdesk.com/a/tickets/${ticketNum}`,
    subject: rand(SUBJECTS),
    category: rand(CATEGORIES),
    type: rand(CALLBACK_TYPES),
    createdAt,
    promisedHours,
    deadline,
    status: 'pending',
    assignedAgent: null,
    pickedUpAt: null,
    completedAt: null,
    notes: '',
    followUpRequired: false,
    followUpAt: null,
    parentCallbackId: null,
    freshdeskAgent: rand(AGENT_NAMES_FD),
    forceReleaseCount: 0,
    autoReleaseCount: 0,
    extendCount: 0,
    forceReleaseNotes: '',
    ...overrides,
  };
}

export function generateInitialCallbacks() {
  const agentNames = DEFAULT_USERS.filter(u => u.role !== 'Admin').map(u => u.name);
  const pending = [];

  // Breached
  for (let i = 0; i < 2; i++) {
    pending.push(generateCallback({
      deadline: new Date(Date.now() - randBetween(10, 180) * 60000).toISOString(),
      type: CALLBACK_TYPES[i % 3],
    }));
  }
  // Critical (<30m)
  for (let i = 0; i < 3; i++) {
    pending.push(generateCallback({
      deadline: new Date(Date.now() + randBetween(5, 25) * 60000).toISOString(),
      type: CALLBACK_TYPES[i % 3],
    }));
  }
  // Urgent (30m–2h)
  for (let i = 0; i < 4; i++) {
    pending.push(generateCallback({
      deadline: new Date(Date.now() + (60 + randBetween(0, 60)) * 60000).toISOString(),
      type: CALLBACK_TYPES[i % 3],
    }));
  }
  // Monitoring (2–4h)
  for (let i = 0; i < 4; i++) {
    pending.push(generateCallback({
      deadline: new Date(Date.now() + (130 + randBetween(0, 100)) * 60000).toISOString(),
    }));
  }
  // Safe (>4h)
  for (let i = 0; i < 5; i++) {
    pending.push(generateCallback({
      deadline: new Date(Date.now() + (260 + randBetween(0, 300)) * 60000).toISOString(),
    }));
  }

  // Assigned (supervisor assigned, agent hasn't picked up yet)
  for (let i = 0; i < 3; i++) {
    pending.push(generateCallback({
      status: 'assigned',
      assignedAgent: agentNames[i % agentNames.length],
      deadline: new Date(Date.now() + (90 + randBetween(0, 200)) * 60000).toISOString(),
      type: CALLBACK_TYPES[i % 3],
    }));
  }

  // In progress
  for (let i = 0; i < 3; i++) {
    pending.push(generateCallback({
      status: 'in-progress',
      assignedAgent: agentNames[i % agentNames.length],
      pickedUpAt: new Date(Date.now() - randBetween(2, 25) * 60000).toISOString(),
      deadline: new Date(Date.now() + (60 + randBetween(0, 180)) * 60000).toISOString(),
      type: CALLBACK_TYPES[i % 3],
    }));
  }

  // Some with release counts for testing tags
  pending.push(generateCallback({
    deadline: new Date(Date.now() + randBetween(60, 300) * 60000).toISOString(),
    forceReleaseCount: 1,
    autoReleaseCount: 2,
    forceReleaseNotes: '2026-03-07T10:00:00Z: Agent was unresponsive',
  }));
  pending.push(generateCallback({
    status: 'in-progress',
    assignedAgent: agentNames[0],
    pickedUpAt: new Date(Date.now() - 5 * 60000).toISOString(),
    deadline: new Date(Date.now() + 120 * 60000).toISOString(),
    extendCount: 1,
    autoReleaseCount: 1,
  }));

  const completed = [];
  for (let i = 0; i < 15; i++) {
    const cb = generateCallback();
    cb.status = 'completed';
    cb.assignedAgent = rand(agentNames);
    cb.completedAt = new Date(Date.now() - randBetween(1, 48) * 3600000).toISOString();
    cb.notes = rand([
      'Resolved issue on call',
      'Escalated to L2 team',
      'Customer satisfied with resolution',
      'Refund initiated — 3-5 days',
      'Card replacement arranged',
      'Explained charges in detail',
    ]);
    cb.followUpRequired = Math.random() > 0.7;
    completed.push(cb);
  }

  return { pending, completed };
}

export function generateLogs(callbacks) {
  const logs = [];
  callbacks.forEach(cb => {
    logs.push({ id: logs.length + 1, callbackId: cb.id, action: 'created', agent: '', timestamp: cb.createdAt, details: `Callback ${cb.id} created` });
    if (cb.status === 'assigned' || cb.status === 'in-progress' || cb.status === 'completed') {
      logs.push({ id: logs.length + 1, callbackId: cb.id, action: 'assigned', agent: 'Supervisor', timestamp: cb.createdAt, details: `Assigned ${cb.id} to ${cb.assignedAgent}` });
    }
    if (cb.status === 'in-progress' || cb.status === 'completed') {
      logs.push({ id: logs.length + 1, callbackId: cb.id, action: 'picked_up', agent: cb.assignedAgent, timestamp: cb.pickedUpAt || cb.createdAt, details: `${cb.assignedAgent} picked up ${cb.id}` });
    }
    if (cb.status === 'completed') {
      logs.push({ id: logs.length + 1, callbackId: cb.id, action: 'completed', agent: cb.assignedAgent, timestamp: cb.completedAt, details: `${cb.assignedAgent} completed ${cb.id}` });
    }
    if (cb.forceReleaseCount > 0) {
      logs.push({ id: logs.length + 1, callbackId: cb.id, action: 'force_release', agent: 'Supervisor', timestamp: cb.createdAt, details: `Force-released ${cb.id}` });
    }
  });
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
