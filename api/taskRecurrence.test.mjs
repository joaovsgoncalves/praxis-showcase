import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatTaskRecurrenceLabel,
  getNextOccurrencePreview,
  nextRecurrenceDate,
  parseTaskRecurrenceDays,
} from './taskRecurrence.js';

test('nextRecurrenceDate returns null for missing/none recurrence or an invalid date', () => {
  assert.equal(nextRecurrenceDate('2026-07-18', undefined), null);
  assert.equal(nextRecurrenceDate('2026-07-18', 'none'), null);
  assert.equal(nextRecurrenceDate('not-a-date', 'daily'), null);
});

test('nextRecurrenceDate daily adds one day, including month/leap-year rollovers', () => {
  assert.equal(nextRecurrenceDate('2026-07-18', 'daily'), '2026-07-19');
  assert.equal(nextRecurrenceDate('2026-01-31', 'daily'), '2026-02-01');
  assert.equal(nextRecurrenceDate('2028-02-28', 'daily'), '2028-02-29'); // leap year
  assert.equal(nextRecurrenceDate('2027-02-28', 'daily'), '2027-03-01'); // non-leap year
});

test('nextRecurrenceDate weekly falls back to +7 days with no/empty/invalid days', () => {
  assert.equal(nextRecurrenceDate('2026-07-13', 'weekly'), '2026-07-20');
  assert.equal(nextRecurrenceDate('2026-07-13', 'weekly', '[]'), '2026-07-20');
  assert.equal(nextRecurrenceDate('2026-07-13', 'weekly', 'not-json'), '2026-07-20');
});

test('nextRecurrenceDate weekly with days finds the next matching day of week', () => {
  // 2026-07-13 is a Monday (dow 1); Wednesday is dow 3.
  assert.equal(nextRecurrenceDate('2026-07-13', 'weekly', '[3]'), '2026-07-15');
});

test('nextRecurrenceDate weekly wraps to next week when the only allowed day is today\'s', () => {
  // fromDate itself is Monday (dow 1); the only allowed day is also Monday, so it must
  // land 7 days later, not return the same day.
  assert.equal(nextRecurrenceDate('2026-07-13', 'weekly', '[1]'), '2026-07-20');
});

test('nextRecurrenceDate monthly clamps to the target month\'s last day', () => {
  assert.equal(nextRecurrenceDate('2027-01-31', 'monthly'), '2027-02-28'); // non-leap Feb
  assert.equal(nextRecurrenceDate('2028-01-31', 'monthly'), '2028-02-29'); // leap Feb
});

test('parseTaskRecurrenceDays parses, defaults, and filters out-of-range values', () => {
  assert.deepEqual(parseTaskRecurrenceDays({ recurrence_days: '[1,3,5]' }), [1, 3, 5]);
  assert.deepEqual(parseTaskRecurrenceDays({ recurrence_days: 'not-json' }), []);
  assert.deepEqual(parseTaskRecurrenceDays({ recurrence_days: '{"a":1}' }), []);
  assert.deepEqual(parseTaskRecurrenceDays({ recurrence_days: '[-1,7,3]' }), [3]);
  assert.deepEqual(parseTaskRecurrenceDays({}), []);
});

test('formatTaskRecurrenceLabel', () => {
  assert.equal(formatTaskRecurrenceLabel({}), '');
  assert.equal(formatTaskRecurrenceLabel({ recurrence: 'none' }), '');
  assert.equal(formatTaskRecurrenceLabel({ recurrence: 'daily' }), 'Diária');
  assert.equal(formatTaskRecurrenceLabel({ recurrence: 'monthly' }), 'Mensal');
  assert.equal(formatTaskRecurrenceLabel({ recurrence: 'weekly' }), 'Semanal');
  assert.equal(
    formatTaskRecurrenceLabel({ recurrence: 'weekly', recurrence_days: '[3,1]' }),
    'Semanal (Seg, Qua)',
  );
});

test('getNextOccurrencePreview returns null without a recurrence or a date', () => {
  assert.equal(getNextOccurrencePreview({ recurrence: 'none' }), null);
  assert.equal(getNextOccurrencePreview({ recurrence: 'daily' }), null);
  assert.equal(getNextOccurrencePreview(null), null);
});

test('getNextOccurrencePreview reports alreadyScheduled when a matching future task exists', () => {
  const task = { id: 't1', recurrence: 'daily', date: '2026-07-18' };
  const allTasks = [
    { id: 't1b', recurrence_parent_id: 't1', date: '2026-07-19', status: 'pending' },
  ];
  const preview = getNextOccurrencePreview(task, allTasks);
  assert.equal(preview.nextDate, '2026-07-19');
  assert.equal(preview.alreadyScheduled, true);
});

test('getNextOccurrencePreview uses recurrence_parent_id to link a child task to its siblings', () => {
  const child = { id: 't2', recurrence_parent_id: 't1', recurrence: 'daily', date: '2026-07-18' };
  const sibling = [{ id: 't3', recurrence_parent_id: 't1', date: '2026-07-19', status: 'pending' }];
  assert.equal(getNextOccurrencePreview(child, sibling).alreadyScheduled, true);
});

test('getNextOccurrencePreview is false when no matching task exists or it is already completed', () => {
  const task = { id: 't1', recurrence: 'daily', date: '2026-07-18' };
  assert.equal(getNextOccurrencePreview(task, []).alreadyScheduled, false);

  const completedOnly = [
    { id: 't1b', recurrence_parent_id: 't1', date: '2026-07-19', status: 'completed' },
  ];
  assert.equal(getNextOccurrencePreview(task, completedOnly).alreadyScheduled, false);
});
