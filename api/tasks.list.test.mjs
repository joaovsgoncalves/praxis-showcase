import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createTasksRouter } from './routes/tasks.js';
import { buildRouteCtx, createTestDb, requestJson, startTestServer } from './test-support/helpers.mjs';

test('include_overdue keeps today pending tasks when old rows fill the base limit', async (t) => {
  const db = createTestDb();
  const app = express();
  app.use('/api/tasks', createTasksRouter(buildRouteCtx(db)));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const insert = db.prepare(`
    INSERT INTO tasks (id, title, date, status, priority, category, sort_order, completed_date)
    VALUES (?, ?, ?, ?, 'medium', 'pessoal', ?, ?)
  `);

  for (let index = 0; index < 50; index += 1) {
    insert.run(`old-${index}`, `Old task ${index}`, '2026-06-01', 'completed', index, '2026-06-01');
  }
  insert.run('today-open', 'Task due today', '2026-07-18', 'pending', 100, null);

  const tasks = await requestJson(server.base, '/api/tasks?limit=50&include_overdue=1&today=2026-07-18');

  assert.ok(tasks.some((task) => task.id === 'today-open'));
});

test('include_overdue includes upcoming (tomorrow) pending tasks when old rows fill base limit', async (t) => {
  const db = createTestDb();
  const app = express();
  app.use('/api/tasks', createTasksRouter(buildRouteCtx(db)));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const insert = db.prepare(`
    INSERT INTO tasks (id, title, date, status, priority, category, sort_order, completed_date)
    VALUES (?, ?, ?, ?, 'medium', 'pessoal', ?, ?)
  `);

  for (let index = 0; index < 50; index += 1) {
    insert.run(`old-${index}`, `Old task ${index}`, '2026-06-01', 'completed', index, '2026-06-01');
  }
  insert.run('tomorrow-open', 'Task due tomorrow', '2026-07-19', 'pending', 100, null);

  const tasks = await requestJson(server.base, '/api/tasks?limit=50&include_overdue=1&today=2026-07-18');

  assert.ok(tasks.some((task) => task.id === 'tomorrow-open'));
});

test('include_overdue returns overdue, today, and future open tasks together', async (t) => {
  const db = createTestDb();
  const app = express();
  app.use('/api/tasks', createTasksRouter(buildRouteCtx(db)));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const insert = db.prepare(`
    INSERT INTO tasks (id, title, date, status, priority, category, sort_order, completed_date)
    VALUES (?, ?, ?, ?, 'medium', 'pessoal', ?, ?)
  `);

  for (let index = 0; index < 50; index += 1) {
    insert.run(`old-${index}`, `Old task ${index}`, '2026-06-01', 'completed', index, '2026-06-01');
  }
  insert.run('overdue-open', 'Task overdue', '2026-07-15', 'pending', 10, null);
  insert.run('today-open', 'Task due today', '2026-07-18', 'pending', 20, null);
  insert.run('future-open', 'Task due future', '2026-07-25', 'pending', 30, null);

  const tasks = await requestJson(server.base, '/api/tasks?limit=50&include_overdue=1&today=2026-07-18');

  const ids = tasks.map((task) => task.id);
  assert.ok(ids.includes('overdue-open'), 'overdue task missing');
  assert.ok(ids.includes('today-open'), 'today task missing');
  assert.ok(ids.includes('future-open'), 'future task missing');
});

test('include_overdue excludes open ideas from operational open tasks', async (t) => {
  const db = createTestDb();
  const app = express();
  app.use('/api/tasks', createTasksRouter(buildRouteCtx(db)));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const insertWithCategory = db.prepare(`
    INSERT INTO tasks (id, title, date, status, priority, category, sort_order, completed_date)
    VALUES (?, ?, ?, ?, 'medium', ?, ?, ?)
  `);

  insertWithCategory.run('open-idea', 'Captured Idea', '2026-07-18', 'pending', 'ideias', 1, null);
  insertWithCategory.run('open-task', 'Real Task', '2026-07-18', 'pending', 'pessoal', 2, null);

  const tasks = await requestJson(server.base, '/api/tasks?limit=50&include_overdue=1&today=2026-07-18');

  const ids = tasks.map((task) => task.id);
  assert.ok(ids.includes('open-task'), 'real task missing');
  assert.ok(!ids.includes('open-idea'), 'idea task should not be in operational list');
});

test('unfiltered list honors requested limit above 200 so dump matches DB', async (t) => {
  const db = createTestDb();
  const app = express();
  app.use('/api/tasks', createTasksRouter(buildRouteCtx(db)));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const insert = db.prepare(`
    INSERT INTO tasks (id, title, date, status, priority, category, sort_order, completed_date)
    VALUES (?, ?, ?, ?, 'medium', 'pessoal', ?, ?)
  `);

  for (let index = 0; index < 200; index += 1) {
    insert.run(`old-${index}`, `Old task ${index}`, '2026-06-01', 'completed', index, '2026-06-01');
  }
  insert.run('today-open-1', 'Pending after cap', '2026-07-18', 'pending', 500, null);
  insert.run('today-open-2', 'Another pending after cap', '2026-07-18', 'pending', 501, null);

  const capped = await requestJson(server.base, '/api/tasks?limit=200');
  assert.equal(capped.length, 200);

  const dump = await requestJson(server.base, '/api/tasks?limit=1000');
  const dumpIds = dump.map((task) => task.id);
  assert.equal(dump.length, 202);
  assert.ok(dumpIds.includes('today-open-1'), 'pending after 200-row cap missing from dump');
  assert.ok(dumpIds.includes('today-open-2'), 'second pending after cap missing from dump');
});

test('unfiltered list supports offset pagination', async (t) => {
  const db = createTestDb();
  const app = express();
  app.use('/api/tasks', createTasksRouter(buildRouteCtx(db)));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const insert = db.prepare(`
    INSERT INTO tasks (id, title, date, status, priority, category, sort_order, completed_date)
    VALUES (?, ?, ?, ?, 'medium', 'pessoal', ?, ?)
  `);
  for (let index = 0; index < 5; index += 1) {
    insert.run(`row-${index}`, `Row ${index}`, '2026-07-18', 'pending', index, null);
  }

  const page1 = await requestJson(server.base, '/api/tasks?limit=2&offset=0');
  const page2 = await requestJson(server.base, '/api/tasks?limit=2&offset=2');
  const page3 = await requestJson(server.base, '/api/tasks?limit=2&offset=4');

  assert.equal(page1.length, 2);
  assert.equal(page2.length, 2);
  assert.equal(page3.length, 1);
  const ids = [...page1, ...page2, ...page3].map((task) => task.id);
  assert.deepEqual(ids, ['row-0', 'row-1', 'row-2', 'row-3', 'row-4']);
});
