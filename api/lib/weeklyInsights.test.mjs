import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDaysYmd, buildWeeklyInsights, isHabitDueOnDate } from './weeklyInsights.js';
import { createTestDb } from '../test-support/helpers.mjs';

test('addDaysYmd adds/subtracts calendar days across month boundaries', () => {
  assert.equal(addDaysYmd('2026-07-13', 6), '2026-07-19');
  assert.equal(addDaysYmd('2026-07-31', 1), '2026-08-01');
  assert.equal(addDaysYmd('2026-07-13', -7), '2026-07-06');
});

test('isHabitDueOnDate respects frequency', () => {
  const monday = '2026-07-13'; // Mon
  const saturday = '2026-07-18'; // Sat
  assert.equal(isHabitDueOnDate({ status: 'active', frequency: 'daily' }, monday), true);
  assert.equal(isHabitDueOnDate({ status: 'active', frequency: 'weekdays' }, monday), true);
  assert.equal(isHabitDueOnDate({ status: 'active', frequency: 'weekdays' }, saturday), false);
  assert.equal(isHabitDueOnDate({ status: 'active', frequency: 'weekends' }, saturday), true);
  assert.equal(isHabitDueOnDate({ status: 'active', frequency: 'weekends' }, monday), false);
});

test('isHabitDueOnDate weekly frequency respects recurrence_days, empty array = every day', () => {
  const monday = '2026-07-13';
  const tuesday = '2026-07-14';
  const habit = { status: 'active', frequency: 'weekly', recurrence_days: '[1]' }; // Monday only
  assert.equal(isHabitDueOnDate(habit, monday), true);
  assert.equal(isHabitDueOnDate(habit, tuesday), false);
  const everyDay = { status: 'active', frequency: 'weekly', recurrence_days: '[]' };
  assert.equal(isHabitDueOnDate(everyDay, monday), true);
  assert.equal(isHabitDueOnDate(everyDay, tuesday), true);
});

test('isHabitDueOnDate is false for non-active habits', () => {
  assert.equal(isHabitDueOnDate({ status: 'paused', frequency: 'daily' }, '2026-07-13'), false);
});

test('buildWeeklyInsights separates done vs skipped vs open habit slots', () => {
  const db = createTestDb();
  db.prepare("INSERT INTO habits (id, title, status, frequency) VALUES ('h1', 'Treino', 'active', 'daily')").run();
  const weekStart = '2026-07-13'; // Monday
  for (const [id, day, outcome, completed] of [
    ['a', '2026-07-13', 'done', 1],
    ['b', '2026-07-14', 'skipped', 0],
    ['c', '2026-07-15', 'done', 1],
    // 2026-07-16..19 left open (no log rows)
  ]) {
    db.prepare(
      'INSERT INTO habit_logs (id, habit_id, date, completed, outcome) VALUES (?, ?, ?, ?, ?)',
    ).run(id, 'h1', day, completed, outcome);
  }
  const weekly = buildWeeklyInsights(db, weekStart);
  assert.equal(weekly.victories.habits_done, 2);
  assert.equal(weekly.victories.habits_skipped, 1);
  assert.ok(weekly.victories.habits_open_slots >= 1);
  assert.equal(weekly.victories.habits_target, 7);
});

test('completedTasks counts tasks whose date OR completed_date falls in the week, excludes ideias', () => {
  const db = createTestDb();
  const weekStart = '2026-07-13';
  const weekEnd = '2026-07-19';
  db.prepare(`
    INSERT INTO tasks (id, title, status, category, date, completed_date)
    VALUES ('t1', 'Feita na semana (por date)', 'completed', 'pessoal', ?, NULL)
  `).run(weekStart);
  db.prepare(`
    INSERT INTO tasks (id, title, status, category, date, completed_date)
    VALUES ('t2', 'Feita na semana (por completed_date)', 'completed', 'pessoal', '2026-06-01', ?)
  `).run(weekEnd);
  db.prepare(`
    INSERT INTO tasks (id, title, status, category, date, completed_date)
    VALUES ('t3', 'Fora da semana', 'completed', 'pessoal', '2026-06-01', '2026-06-02')
  `).run();
  db.prepare(`
    INSERT INTO tasks (id, title, status, category, date)
    VALUES ('t4', 'Ideia completada', 'completed', 'ideias', ?)
  `).run(weekStart);
  const weekly = buildWeeklyInsights(db, weekStart);
  assert.equal(weekly.victories.tasks_completed_count, 2);
  assert.ok(weekly.victories.tasks_completed_samples.includes('Feita na semana (por date)'));
  assert.ok(weekly.victories.tasks_completed_samples.includes('Feita na semana (por completed_date)'));
});

test('stalePending/overdue only counts pending non-ideias tasks dated before the week', () => {
  const db = createTestDb();
  const weekStart = '2026-07-13';
  db.prepare(`INSERT INTO tasks (id, title, status, category, date) VALUES ('t1', 'Atrasada', 'pending', 'pessoal', '2026-07-01')`).run();
  db.prepare(`INSERT INTO tasks (id, title, status, category, date) VALUES ('t2', 'Ideia atrasada', 'pending', 'ideias', '2026-07-01')`).run();
  db.prepare(`INSERT INTO tasks (id, title, status, category, date) VALUES ('t3', 'Concluída atrasada', 'completed', 'pessoal', '2026-07-01')`).run();
  db.prepare(`INSERT INTO tasks (id, title, status, category, date) VALUES ('t4', 'Dentro da semana', 'pending', 'pessoal', ?)`).run(weekStart);
  const weekly = buildWeeklyInsights(db, weekStart);
  assert.equal(weekly.bottlenecks.overdue_tasks_count, 1);
  assert.deepEqual(weekly.bottlenecks.overdue_samples, ['Atrasada']);
});

test('bottlenecks.top_skipped sorts by skip count and surfaces the most common skip reason', () => {
  const db = createTestDb();
  db.prepare("INSERT INTO habits (id, title, status, frequency) VALUES ('h1', 'Água', 'active', 'daily')").run();
  db.prepare("INSERT INTO habits (id, title, status, frequency) VALUES ('h2', 'Leitura', 'active', 'daily')").run();
  const weekStart = '2026-07-13';
  const rows = [
    ['a', 'h1', '2026-07-13', 'time'],
    ['b', 'h1', '2026-07-14', 'time'],
    ['c', 'h2', '2026-07-13', 'energy'],
  ];
  for (const [id, habitId, day, reason] of rows) {
    db.prepare(
      'INSERT INTO habit_logs (id, habit_id, date, completed, outcome, skip_reason) VALUES (?, ?, ?, 0, ?, ?)',
    ).run(id, habitId, day, 'skipped', reason);
  }
  const weekly = buildWeeklyInsights(db, weekStart);
  assert.equal(weekly.bottlenecks.top_skipped[0].title, 'Água');
  assert.equal(weekly.bottlenecks.top_skipped[0].skips, 2);
  assert.equal(weekly.bottlenecks.top_skipped[0].top_reason, 'time');
});

test('suggested_priorities leads with overdue tasks when present', () => {
  const db = createTestDb();
  const weekStart = '2026-07-13';
  db.prepare(`INSERT INTO tasks (id, title, status, category, date) VALUES ('t1', 'Responder cliente', 'pending', 'pessoal', '2026-07-01')`).run();
  const weekly = buildWeeklyInsights(db, weekStart);
  assert.match(weekly.suggested_priorities[0], /Fechar pendência atrasada: Responder cliente/);
});

test('suggested_priorities falls back to generic suggestions when no signals fire', () => {
  const db = createTestDb();
  const weekly = buildWeeklyInsights(db, '2026-07-13');
  assert.ok(weekly.suggested_priorities.length >= 1);
  assert.ok(weekly.suggested_priorities.length <= 3);
});

test('nutrition falls back to null when nutrition tables are not initialized', () => {
  const db = createTestDb(); // withNutrition: false
  const weekly = buildWeeklyInsights(db, '2026-07-13');
  assert.equal(weekly.nutrition, null);
});

test('ideas new_captures and promoted are counted within the week window', () => {
  const db = createTestDb();
  const weekStart = '2026-07-13';
  db.prepare(`
    INSERT INTO tasks (id, title, category, idea_status, created_date, updated_date)
    VALUES ('i1', 'Ideia nova', 'ideias', 'capturada', ?, ?)
  `).run(`${weekStart} 10:00:00`, `${weekStart} 10:00:00`);
  db.prepare(`
    INSERT INTO tasks (id, title, category, idea_status, created_date, updated_date)
    VALUES ('i2', 'Ideia promovida', 'ideias', 'virou_tarefa', '2026-06-01 10:00:00', ?)
  `).run(`${weekStart} 11:00:00`);
  const weekly = buildWeeklyInsights(db, weekStart);
  assert.equal(weekly.ideas.new_captures, 1);
  assert.equal(weekly.ideas.promoted, 1);
});

test('drafts fall back to placeholder strings for an empty week', () => {
  const db = createTestDb();
  const weekly = buildWeeklyInsights(db, '2026-07-13');
  assert.equal(typeof weekly.drafts.highlights, 'string');
  assert.ok(weekly.drafts.highlights.length > 0);
  assert.equal(typeof weekly.drafts.blockers, 'string');
});

test('in-progress week excludes future days (habit window)', () => {
  const db = createTestDb();
  db.prepare("INSERT INTO habits (id, title, status, frequency) VALUES ('h1', 'Água', 'active', 'daily')").run();
  const weekStart = '2026-07-13'; // segunda
  // options.today = quarta (2026-07-15): só seg, ter, qua contam.
  const weekly = buildWeeklyInsights(db, weekStart, { today: '2026-07-15' });
  assert.equal(weekly.victories.habits_target, 3);
  assert.equal(weekly.victories.habits_open_slots, 3);
  // Só os dias transcorridos (seg, ter, qua) podem contar como abertos; nunca o futuro.
  assert.equal(weekly.bottlenecks.missed_habits.length, 1);
  assert.equal(weekly.bottlenecks.missed_habits[0].title, 'Água');
  assert.equal(weekly.bottlenecks.missed_habits[0].misses, 3);
});

test('future week has zero habit slots (no denominator)', () => {
  const db = createTestDb();
  db.prepare("INSERT INTO habits (id, title, status, frequency) VALUES ('h1', 'Treino', 'active', 'daily')").run();
  const weekStart = '2026-07-27'; // semana futura
  const weekly = buildWeeklyInsights(db, weekStart, { today: '2026-07-15' });
  assert.equal(weekly.victories.habits_target, 0);
  assert.equal(weekly.victories.habits_done, 0);
  assert.equal(weekly.victories.habits_open_slots, 0);
});

test('life_history includes in-week project_updates and excludes out-of-week', () => {
  const db = createTestDb({ withProjects: true });
  db.prepare(
    "INSERT INTO projects (id, slug, name) VALUES ('p1', 'rca', 'RCA')",
  ).run();
  db.prepare(
    "INSERT INTO project_updates (id, project_id, date, summary, source) VALUES ('u1', 'p1', '2026-07-14', 'Avanço no RCA', 'conclusao')",
  ).run();
  db.prepare(
    "INSERT INTO project_updates (id, project_id, date, summary, source) VALUES ('u2', 'p1', '2026-06-01', 'Fora da semana', 'seneca')",
  ).run();
  const weekly = buildWeeklyInsights(db, '2026-07-13', { today: '2026-07-20' });
  assert.equal(weekly.life_history.project_updates.length, 1);
  assert.equal(weekly.life_history.project_updates[0].summary, 'Avanço no RCA');
  assert.equal(weekly.life_history.project_updates[0].front, 'rca');
});

test('life_history groups completed tasks by area', () => {
  const db = createTestDb();
  db.prepare(
    "INSERT INTO tasks (id, title, status, category, date, completed_date) VALUES ('t1', 'Fechar pedido', 'completed', 'rca', '2026-07-13', '2026-07-13')",
  ).run();
  db.prepare(
    "INSERT INTO tasks (id, title, status, category, date, completed_date) VALUES ('t2', 'Estudar anatomia', 'completed', 'estudo', '2026-07-14', '2026-07-14')",
  ).run();
  db.prepare(
    "INSERT INTO tasks (id, title, status, category, date, completed_date) VALUES ('t3', 'Ideia solta', 'completed', 'ideias', '2026-07-13', '2026-07-13')",
  ).run();
  const weekly = buildWeeklyInsights(db, '2026-07-13', { today: '2026-07-20' });
  const areas = weekly.life_history.completed_by_area;
  const rca = areas.find((a) => a.area === 'rca');
  const fac = areas.find((a) => a.area === 'faculdade');
  assert.ok(rca);
  assert.ok(fac);
  assert.equal(rca.count, 1);
  assert.equal(fac.count, 1);
  // ideias nunca entram na área de vida.
  assert.equal(areas.find((a) => a.area === 'ideias'), undefined);
});

test('life_history dedups a conclusão (update) contra a tarefa do mesmo entregável', () => {
  const db = createTestDb({ withProjects: true });
  db.prepare("INSERT INTO projects (id, slug, name) VALUES ('p1', 'rca', 'RCA')").run();
  // Registro de conclusão na continuidade (Fiz isso) para o pedido Gabriela.
  db.prepare(
    "INSERT INTO project_updates (id, project_id, date, summary, source) VALUES ('u1', 'p1', '2026-07-14', 'Concluído: Fechar o pedido da Gabriela na Medfarma Extremoz', 'conclusao')",
  ).run();
  // Tarefa concluída que representa o MESMO entregável.
  db.prepare(
    "INSERT INTO tasks (id, title, status, category, date, completed_date) VALUES ('t1', 'Fechar pedido Gabriela — Medfarma Extremoz', 'completed', 'farmacia', '2026-07-14', '2026-07-14')",
  ).run();
  const weekly = buildWeeklyInsights(db, '2026-07-13', { today: '2026-07-20' });
  const rca = weekly.life_history.completed_by_area.find((a) => a.area === 'rca');
  // A conclusão e a tarefa são a mesma coisa: conta 1, não 2.
  assert.equal(rca.count, 1);
  assert.equal(weekly.life_history.project_updates.length, 1);
});

test('life_history counts distinct deliverables when no overlap', () => {
  const db = createTestDb({ withProjects: true });
  db.prepare("INSERT INTO projects (id, slug, name) VALUES ('p1', 'rca', 'RCA')").run();
  db.prepare(
    "INSERT INTO project_updates (id, project_id, date, summary, source) VALUES ('u1', 'p1', '2026-07-14', 'Retorno Isabelita / Bezerra foi concluído hoje.', 'seneca')",
  ).run();
  db.prepare(
    "INSERT INTO tasks (id, title, status, category, date, completed_date) VALUES ('t1', 'Preparar RCA de seg-qua', 'completed', 'farmacia', '2026-07-14', '2026-07-14')",
  ).run();
  const weekly = buildWeeklyInsights(db, '2026-07-13', { today: '2026-07-20' });
  const rca = weekly.life_history.completed_by_area.find((a) => a.area === 'rca');
  // Assuntos distintos: contam 2 (1 update + 1 tarefa).
  assert.equal(rca.count, 2);
});

test('life_history agrupa Animália dentro da área GoFluxo (serviço da GoFluxo)', () => {
  const db = createTestDb({ withProjects: true });
  db.prepare("INSERT INTO projects (id, slug, name) VALUES ('p1', 'animalia', 'Animália')").run();
  db.prepare(
    "INSERT INTO project_updates (id, project_id, date, summary, source) VALUES ('u1', 'p1', '2026-07-14', 'Check-in com a Ester e ajuste do hub', 'seneca')",
  ).run();
  const weekly = buildWeeklyInsights(db, '2026-07-13', { today: '2026-07-20' });
  const areas = weekly.life_history.completed_by_area;
  // Animália não pode virar área própria: deve entrar em 'gofluxo'.
  assert.equal(areas.find((a) => a.area === 'animalia'), undefined);
  const gofluxo = areas.find((a) => a.area === 'gofluxo');
  assert.ok(gofluxo);
  assert.equal(gofluxo.count, 1);
});

test('life_history is safe when projects tables are absent', () => {
  const db = createTestDb();
  const weekly = buildWeeklyInsights(db, '2026-07-13', { today: '2026-07-20' });
  assert.deepEqual(weekly.life_history.project_updates, []);
  assert.equal(typeof weekly.life_history.summary, 'string');
});
