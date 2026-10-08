import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAvoidanceInsights, buildRuleBasedPraxiaMirror } from './avoidanceInsights.js';
import { createTestDb } from '../test-support/helpers.mjs';

const TODAY = '2026-07-18';
const YESTERDAY = '2026-07-17';
const WEEK_AGO = '2026-07-11';

function insertTask(db, id, overrides = {}) {
  db.prepare(`
    INSERT INTO tasks (id, title, status, category, date, priority, created_date, updated_date)
    VALUES (@id, @title, @status, @category, @date, @priority, @created_date, @updated_date)
  `).run({
    id,
    title: overrides.title ?? id,
    status: overrides.status ?? 'pending',
    category: overrides.category ?? 'pessoal',
    date: overrides.date ?? null,
    priority: overrides.priority ?? 'medium',
    created_date: overrides.created_date ?? `${TODAY} 09:00:00`,
    updated_date: overrides.updated_date ?? `${TODAY} 09:00:00`,
  });
}

function insertHabit(db, id, overrides = {}) {
  db.prepare(`
    INSERT INTO habits (id, title, status, frequency) VALUES (?, ?, ?, ?)
  `).run(id, overrides.title ?? id, overrides.status ?? 'active', overrides.frequency ?? 'daily');
}

function insertLog(db, id, habitId, date, { completed = 0, outcome } = {}) {
  db.prepare(
    'INSERT INTO habit_logs (id, habit_id, date, completed, outcome) VALUES (?, ?, ?, ?, ?)',
  ).run(id, habitId, date, completed, outcome ?? null);
}

test('same-title overdue task across dates collapses into one item, keeping the most overdue', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertTask(db, 't1', { title: 'Enviar relatório', date: '2026-07-10' }); // 8 days overdue
  insertTask(db, 't2', { title: 'Enviar relatório', date: '2026-07-15' }); // 3 days overdue
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const overdueItems = avoidance.items.filter((i) => i.type === 'task' && i.id.startsWith('task-overdue-'));
  assert.equal(overdueItems.length, 1);
  assert.equal(overdueItems[0].entity_id, 't1');
  assert.match(overdueItems[0].reason, /8 dias/);
});

test('overdue severity is high when >=3 days late, or when priority is high regardless of days', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertTask(db, 'old', { title: 'Bem atrasada', date: '2026-07-10', priority: 'medium' }); // 8 days
  insertTask(db, 'recent-medium', { title: 'Atrasada 1 dia', date: YESTERDAY, priority: 'medium' });
  insertTask(db, 'recent-high', { title: 'Urgente atrasada', date: YESTERDAY, priority: 'high' });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const byTitle = Object.fromEntries(avoidance.items.map((i) => [i.title, i]));
  assert.equal(byTitle['Bem atrasada'].severity, 'high');
  assert.equal(byTitle['Atrasada 1 dia'].severity, 'medium');
  assert.equal(byTitle['Urgente atrasada'].severity, 'high');
});

test('floating (dateless) tasks only surface once at least a week old', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertTask(db, 'old-floating', { title: 'Sem data há tempos', date: null, created_date: `${WEEK_AGO} 09:00:00` });
  insertTask(db, 'new-floating', { title: 'Sem data recente', date: null, created_date: '2026-07-12 09:00:00' });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const floating = avoidance.items.filter((i) => i.id.startsWith('task-floating-'));
  assert.equal(floating.length, 1);
  assert.equal(floating[0].title, 'Sem data há tempos');
});

test('a conscious skip today closes the loop — no open-habit item', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertHabit(db, 'h1');
  insertLog(db, 'l1', 'h1', TODAY, { outcome: 'skipped' });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const item = avoidance.items.find((i) => i.entity_id === 'h1' && i.type === 'habit');
  assert.equal(item, undefined);
});

test('yesterday skipped + today untouched → mild skip-open nudge', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertHabit(db, 'h1');
  insertLog(db, 'l1', 'h1', YESTERDAY, { outcome: 'skipped' });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const item = avoidance.items.find((i) => i.id === 'habit-skip-open-h1');
  assert.ok(item);
  assert.equal(item.severity, 'low');
});

test('neither yesterday nor today closed → open-habit item', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertHabit(db, 'h1');
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const item = avoidance.items.find((i) => i.id === 'habit-open-h1');
  assert.ok(item);
  assert.equal(item.severity, 'medium');
});

test('3+ skips in the trailing week produce a pattern item when the habit is otherwise closed', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertHabit(db, 'h1');
  insertLog(db, 'l1', 'h1', '2026-07-13', { outcome: 'skipped' });
  insertLog(db, 'l2', 'h1', '2026-07-14', { outcome: 'skipped' });
  insertLog(db, 'l3', 'h1', '2026-07-15', { outcome: 'skipped' });
  insertLog(db, 'l4', 'h1', YESTERDAY, { completed: 1, outcome: 'done' });
  insertLog(db, 'l5', 'h1', TODAY, { completed: 1, outcome: 'done' });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const item = avoidance.items.find((i) => i.id === 'habit-pattern-skip-h1');
  assert.ok(item);
  assert.equal(item.severity, 'low');
});

test('pattern-skip item is suppressed when an open/skip-open item already exists for the habit', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertHabit(db, 'h1');
  insertLog(db, 'l1', 'h1', '2026-07-13', { outcome: 'skipped' });
  insertLog(db, 'l2', 'h1', '2026-07-14', { outcome: 'skipped' });
  insertLog(db, 'l3', 'h1', '2026-07-15', { outcome: 'skipped' });
  // yesterday and today both left open → habit-open-h1 fires first
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const habitItems = avoidance.items.filter((i) => i.entity_id === 'h1' && i.type === 'habit');
  assert.equal(habitItems.length, 1);
  assert.equal(habitItems[0].id, 'habit-open-h1');
});

test('stale ideas are capped at 5', () => {
  const db = createTestDb({ withCaptureQueue: true });
  for (let i = 1; i <= 6; i += 1) {
    db.prepare(`
      INSERT INTO tasks (id, title, category, idea_status, created_date, updated_date)
      VALUES (?, ?, 'ideias', 'capturada', ?, ?)
    `).run(`idea${i}`, `Ideia ${i}`, `${WEEK_AGO} 09:00:00`, `${WEEK_AGO} 09:00:00`);
  }
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const ideaItems = avoidance.items.filter((i) => i.type === 'idea');
  assert.equal(ideaItems.length, 5);
});

test('failed captures aggregate into a single capture-failed item', () => {
  const db = createTestDb({ withCaptureQueue: true });
  db.prepare("INSERT INTO capture_queue (id, status) VALUES ('c1', 'failed')").run();
  db.prepare("INSERT INTO capture_queue (id, status) VALUES ('c2', 'failed')").run();
  db.prepare("INSERT INTO capture_queue (id, status) VALUES ('c3', 'pending')").run();
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const item = avoidance.items.find((i) => i.id === 'capture-failed');
  assert.ok(item);
  assert.match(item.title, /2 áudio/);
});

test('focus-gap triggers only when strictly under the 15-minute threshold with 3+ pending tasks', () => {
  const dbAtThreshold = createTestDb({ withCaptureQueue: true });
  for (let i = 1; i <= 3; i += 1) insertTask(dbAtThreshold, `p${i}`, { date: TODAY });
  dbAtThreshold.prepare(`
    INSERT INTO focus_sessions (id, date, duration_seconds) VALUES ('f1', ?, 900)
  `).run(TODAY);
  const atThreshold = buildAvoidanceInsights(dbAtThreshold, TODAY);
  assert.equal(atThreshold.items.find((i) => i.id === 'focus-gap'), undefined);

  const dbBelow = createTestDb({ withCaptureQueue: true });
  for (let i = 1; i <= 3; i += 1) insertTask(dbBelow, `p${i}`, { date: TODAY });
  dbBelow.prepare(`
    INSERT INTO focus_sessions (id, date, duration_seconds) VALUES ('f1', ?, 899)
  `).run(TODAY);
  const below = buildAvoidanceInsights(dbBelow, TODAY);
  assert.ok(below.items.find((i) => i.id === 'focus-gap'));
});

test('wellness-missing is suppressed when there is nothing pending or overdue', () => {
  const db = createTestDb({ withCaptureQueue: true });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  assert.equal(avoidance.items.find((i) => i.id === 'wellness-missing'), undefined);
});

test('wellness-missing appears when overdue work exists and no check-in was logged today', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertTask(db, 't1', { title: 'Atrasada', date: '2026-07-10' });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  assert.ok(avoidance.items.find((i) => i.id === 'wellness-missing'));
});

test('items are sorted by severity: high, then medium, then low', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertTask(db, 'high1', { title: 'Alta', date: '2026-07-10' }); // 8 days -> high
  insertTask(db, 'floating1', { title: 'Flutuante', date: null, created_date: `${WEEK_AGO} 09:00:00` }); // medium
  insertHabit(db, 'h1');
  insertLog(db, 'l1', 'h1', '2026-07-13', { outcome: 'skipped' });
  insertLog(db, 'l2', 'h1', '2026-07-14', { outcome: 'skipped' });
  insertLog(db, 'l3', 'h1', '2026-07-15', { outcome: 'skipped' });
  insertLog(db, 'l4', 'h1', YESTERDAY, { completed: 1, outcome: 'done' });
  insertLog(db, 'l5', 'h1', TODAY, { completed: 1, outcome: 'done' });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const severities = avoidance.items.map((i) => i.severity);
  const ranks = { high: 0, medium: 1, low: 2 };
  for (let i = 1; i < severities.length; i += 1) {
    assert.ok(ranks[severities[i - 1]] <= ranks[severities[i]], `${severities[i - 1]} should sort before ${severities[i]}`);
  }
});

test('pressure is 0 with no items and capped at 100 when many high-severity items pile up', () => {
  const emptyDb = createTestDb({ withCaptureQueue: true });
  assert.equal(buildAvoidanceInsights(emptyDb, TODAY).pressure, 0);

  const busyDb = createTestDb({ withCaptureQueue: true });
  for (let i = 1; i <= 8; i += 1) {
    insertTask(busyDb, `old${i}`, { title: `Atrasada ${i}`, date: '2026-07-01' }); // well over 3 days
  }
  const busy = buildAvoidanceInsights(busyDb, TODAY);
  assert.equal(busy.pressure, 100);
});

test('headline reflects item count: none, one, and many', () => {
  const empty = buildAvoidanceInsights(createTestDb({ withCaptureQueue: true }), TODAY);
  assert.equal(empty.headline, 'Nada gritando no radar — bom sinal.');

  const oneDb = createTestDb({ withCaptureQueue: true });
  insertTask(oneDb, 't1', { title: 'Só isso', date: YESTERDAY });
  // Suppress the separate wellness-missing item so only the overdue task counts.
  oneDb.prepare("INSERT INTO wellness_checks (id, date) VALUES ('w1', ?)").run(TODAY);
  const one = buildAvoidanceInsights(oneDb, TODAY);
  assert.equal(one.headline, '1 coisa pedindo atenção');

  const manyDb = createTestDb({ withCaptureQueue: true });
  for (let i = 1; i <= 8; i += 1) {
    insertTask(manyDb, `t${i}`, { title: `Tarefa ${i}`, date: '2026-07-01' });
  }
  // A 9th item of a different type — overdue tasks alone cap at DISPLAY_LIMIT (8) before
  // reaching "items", so total_count needs a second item type to exceed the limit.
  insertTask(manyDb, 'floating1', { title: 'Sem data', date: null, created_date: `${WEEK_AGO} 09:00:00` });
  // Suppress the separate wellness-missing item so the count stays exactly 9.
  manyDb.prepare("INSERT INTO wellness_checks (id, date) VALUES ('w1', ?)").run(TODAY);
  const many = buildAvoidanceInsights(manyDb, TODAY);
  assert.equal(many.total_count, 9);
  assert.match(many.headline, /9 no radar — 8 mais urgentes abaixo/);
});

test('buildRuleBasedPraxiaMirror returns a calm default when there is nothing to mirror', () => {
  const mirror = buildRuleBasedPraxiaMirror(buildAvoidanceInsights(createTestDb({ withCaptureQueue: true }), TODAY));
  assert.equal(mirror.source, 'rules');
  assert.equal(mirror.lines.length, 3);
});

test('buildRuleBasedPraxiaMirror mirrors the headline and top items when overdue tasks exist', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertTask(db, 't1', { title: 'Pendência', date: '2026-07-10' });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const mirror = buildRuleBasedPraxiaMirror(avoidance);
  assert.equal(mirror.lines[0], `Espelho: ${avoidance.headline}`);
  assert.ok(mirror.lines.some((l) => l.includes('tarefas com data passada')));
});

test('buildRuleBasedPraxiaMirror gives the floating-tasks hint when only floating tasks are pending', () => {
  const db = createTestDb({ withCaptureQueue: true });
  insertTask(db, 't1', { title: 'Sem data', date: null, created_date: `${WEEK_AGO} 09:00:00` });
  const avoidance = buildAvoidanceInsights(db, TODAY);
  const mirror = buildRuleBasedPraxiaMirror(avoidance);
  assert.ok(mirror.lines.some((l) => l.includes('sem data não há compromisso')));
});
