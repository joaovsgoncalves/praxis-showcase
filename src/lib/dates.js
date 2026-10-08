export function fortalezaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function fortalezaDisplayDate(date = new Date()) {
  const key = fortalezaDateKey(date);
  return new Date(`${key}T12:00:00-03:00`);
}

/** dateKey YYYY-MM-DD, days can be negative */
export function fortalezaAddDays(dateKey, days) {
  const base = new Date(`${dateKey}T12:00:00`);
  base.setDate(base.getDate() + days);
  return fortalezaDateKey(base);
}

export function fortalezaNowTimeHHMM(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '12';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

export function addMinutesToTimeHHMM(timeHHMM, minutes) {
  const [h0, m0] = String(timeHHMM || '00:00').split(':').map(Number);
  let total = h0 * 60 + m0 + minutes;
  let dayOffset = 0;
  while (total >= 24 * 60) {
    total -= 24 * 60;
    dayOffset += 1;
  }
  while (total < 0) {
    total += 24 * 60;
    dayOffset -= 1;
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  return {
    time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    dayOffset,
  };
}

export function buildSnooze15Update(task, today) {
  const baseDate = task.date || today;
  if (task.time) {
    const { time, dayOffset } = addMinutesToTimeHHMM(task.time, 15);
    return { date: fortalezaAddDays(baseDate, dayOffset), time };
  }
  const { time, dayOffset } = addMinutesToTimeHHMM(fortalezaNowTimeHHMM(), 15);
  return { date: fortalezaAddDays(today, dayOffset), time };
}

export function buildSnoozeTomorrowUpdate(task, today) {
  return {
    date: fortalezaAddDays(task.date || today, 1),
    time: task.time || undefined,
  };
}
