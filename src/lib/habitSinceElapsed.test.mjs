import assert from 'node:assert/strict';
import { test } from 'node:test';
import { elapsedSinceFortalezaMidnight } from './habits.js';

test('elapsed clock anchors YYYY-MM-DD at midnight in Fortaleza', () => {
  assert.deepEqual(
    elapsedSinceFortalezaMidnight('2026-08-22', new Date('2026-08-24T03:00:00.000Z')),
    { days: 2, hours: 0, minutes: 0, seconds: 0, totalSeconds: 172_800 },
  );

  assert.deepEqual(
    elapsedSinceFortalezaMidnight('2026-08-22', new Date('2026-08-24T08:04:05.000Z')),
    { days: 2, hours: 5, minutes: 4, seconds: 5, totalSeconds: 191_045 },
  );
});

test('elapsed clock clamps invalid and pre-anchor values to zero', () => {
  const zero = { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  assert.deepEqual(elapsedSinceFortalezaMidnight('', Date.now()), zero);
  assert.deepEqual(
    elapsedSinceFortalezaMidnight('2026-08-22', new Date('2026-08-22T02:59:59.000Z')),
    zero,
  );
});
