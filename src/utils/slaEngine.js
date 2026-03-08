import { addHours, addMinutes, differenceInMinutes, isWeekend, setHours, setMinutes, setSeconds, isBefore, isAfter, startOfDay, addDays } from 'date-fns';

const DEFAULT_CONFIG = {
  businessHoursStart: 9,
  businessHoursEnd: 23,
  includeWeekends: true,
};

export function calculateDeadline(createdAt, promisedHours, config = DEFAULT_CONFIG) {
  const { businessHoursStart, businessHoursEnd, includeWeekends } = config;
  const dailyBusinessMinutes = (businessHoursEnd - businessHoursStart) * 60;
  let remainingMinutes = promisedHours * 60;
  let cursor = new Date(createdAt);

  const dayStart = (d) => setSeconds(setMinutes(setHours(new Date(d), businessHoursStart), 0), 0);
  const dayEnd = (d) => setSeconds(setMinutes(setHours(new Date(d), businessHoursEnd), 0), 0);

  if (isBefore(cursor, dayStart(cursor))) {
    cursor = dayStart(cursor);
  }
  if (isAfter(cursor, dayEnd(cursor))) {
    cursor = dayStart(addDays(cursor, 1));
  }

  let safety = 0;
  while (remainingMinutes > 0 && safety < 365) {
    safety++;
    if (!includeWeekends && isWeekend(cursor)) {
      cursor = dayStart(addDays(cursor, 1));
      continue;
    }

    const endOfBusiness = dayEnd(cursor);
    const minutesLeftToday = differenceInMinutes(endOfBusiness, cursor);

    if (remainingMinutes <= minutesLeftToday) {
      cursor = addMinutes(cursor, remainingMinutes);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= minutesLeftToday;
      cursor = dayStart(addDays(cursor, 1));
    }
  }

  return cursor;
}

export function getTimeRemaining(deadline) {
  const now = new Date();
  return differenceInMinutes(new Date(deadline), now);
}

let slaConfig = { safe: 240, monitoring: 120, urgent: 30, critical: 0 };

export function setSLAConfig(config) {
  slaConfig = { ...slaConfig, ...config };
}

export function getSLAConfig() {
  return { ...slaConfig };
}

export function getUrgencyLevel(minutesRemaining) {
  if (minutesRemaining <= slaConfig.critical) return 'breached';
  if (minutesRemaining <= slaConfig.urgent) return 'critical';
  if (minutesRemaining <= slaConfig.monitoring) return 'urgent';
  if (minutesRemaining <= slaConfig.safe) return 'monitoring';
  return 'safe';
}

export function getUrgencyConfig(level) {
  const configs = {
    safe: {
      label: 'Safe',
      color: '#6B7280',
      bg: '#F3F4F6',
      border: '#E5E7EB',
      pulse: false,
    },
    monitoring: {
      label: 'Monitoring',
      color: '#EA8C55',
      bg: '#FFF3EB',
      border: '#FDDCBF',
      pulse: false,
    },
    urgent: {
      label: 'Urgent',
      color: '#D84100',
      bg: '#FFF0E8',
      border: '#FFB899',
      pulse: false,
    },
    critical: {
      label: 'Critical',
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      pulse: true,
    },
    breached: {
      label: 'SLA Breached',
      color: '#7F1D1D',
      bg: '#FEE2E2',
      border: '#F87171',
      pulse: true,
    },
  };
  return configs[level] || configs.safe;
}

export function formatCountdown(minutesRemaining) {
  if (minutesRemaining <= 0) {
    const abs = Math.abs(minutesRemaining);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `-${h}h ${m}m`;
  }
  const h = Math.floor(minutesRemaining / 60);
  const m = minutesRemaining % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
