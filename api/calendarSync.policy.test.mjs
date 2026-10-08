import test from 'node:test';
import assert from 'node:assert/strict';
import { createCalendarServices } from './lib/calendarSync.js';

test('shouldSyncTaskToCalendar only allows open tasks dated today with time', () => {
  const today = '2026-07-22';
  const { shouldSyncTaskToCalendar } = createCalendarServices({
    db: {
      prepare: () => ({
        run: () => {},
        all: () => [],
        get: () => null,
      }),
    },
    getLocalDateString: () => today,
  });

  assert.equal(
    shouldSyncTaskToCalendar({ date: today, time: '08:00', status: 'pending' }),
    true,
  );
  assert.equal(
    shouldSyncTaskToCalendar({ date: '2026-07-23', time: '08:00', status: 'pending' }),
    false,
    'future day must not create Google notifications',
  );
  assert.equal(
    shouldSyncTaskToCalendar({ date: '2026-07-21', time: '08:00', status: 'pending' }),
    false,
    'overdue must not stay on Google',
  );
  assert.equal(
    shouldSyncTaskToCalendar({ date: today, time: null, status: 'pending' }),
    false,
  );
  assert.equal(
    shouldSyncTaskToCalendar({ date: today, time: '08:00', status: 'completed' }),
    false,
  );
});
