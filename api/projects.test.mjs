import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createProjectsRouter } from './routes/projects.js';
import { seedProjectsIfEmpty } from './projects.js';
import { createTestDb, requestJson, startTestServer } from './test-support/helpers.mjs';

const SEED_SLUGS = [
  'animalia',
  'carteirazap',
  'catalogozap',
  'encartezap',
  'faculdade',
  'gofluxo',
  'praxis',
  'rca',
  'site-pessoal',
];

async function mountProjects(t, { seed = true } = {}) {
  const db = createTestDb({ withProjects: true });
  if (seed) seedProjectsIfEmpty(db);
  const app = express();
  app.use(express.json());
  app.use('/api/projects', createProjectsRouter({ db }));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });
  return { db, server };
}

test('seed cria as frentes canônicas sem duplicar', async (t) => {
  const db = createTestDb({ withProjects: true });
  t.after(() => db.close());

  const first = seedProjectsIfEmpty(db);
  assert.equal(first.inserted, 9);
  const second = seedProjectsIfEmpty(db);
  assert.equal(second.inserted, 0);
  assert.equal(second.seeded, false);

  const rows = db.prepare('SELECT slug FROM projects ORDER BY slug').all();
  assert.deepEqual(rows.map((r) => r.slug), SEED_SLUGS);
});

test('GET /api/projects expõe continuidade, tipo, estado no ar e próximo passo', async (t) => {
  const { server } = await mountProjects(t);
  const list = await requestJson(server.base, '/api/projects');
  assert.equal(list.length, 9);

  const bySlug = Object.fromEntries(list.map((p) => [p.slug, p]));
  assert.equal(bySlug.praxis.focus, 1);
  assert.equal(bySlug.praxis.column, 'andando');
  assert.equal(bySlug.rca.focus, 1);
  assert.equal(bySlug.encartezap.column, 'pausado');
  assert.equal(bySlug.catalogozap.live, 1);
  assert.equal(bySlug.animalia.kind, 'cliente');
  assert.equal(bySlug.faculdade.kind, 'estudo');
  assert.match(bySlug.carteirazap.next_step, /Auditar Clientes/i);

  for (const row of list) {
    assert.ok('focus' in row);
    assert.ok('column' in row);
    assert.ok('current_slice' in row);
    assert.ok('next_step' in row);
    assert.ok('status_summary' in row);
    assert.ok('kind' in row);
    assert.ok('live' in row);
  }
});

test('PATCH de coluna persiste e registra timeline', async (t) => {
  const { server } = await mountProjects(t);
  const patched = await requestJson(server.base, '/api/projects/carteirazap', {
    method: 'PATCH',
    body: { column: 'aguardando' },
  });
  assert.equal(patched.slug, 'carteirazap');
  assert.equal(patched.column, 'aguardando');

  const again = await requestJson(server.base, '/api/projects');
  assert.equal(again.find((p) => p.slug === 'carteirazap').column, 'aguardando');

  const updates = await requestJson(server.base, '/api/projects/carteirazap/updates');
  assert.equal(updates.length, 1);
  assert.match(updates[0].summary, /aguardando/i);
  assert.equal(updates[0].source, 'praxis');
});

test('timeline aceita avanço manual', async (t) => {
  const { server } = await mountProjects(t);
  const created = await requestJson(server.base, '/api/projects/praxis/updates', {
    method: 'POST',
    body: { summary: 'Nova visão de continuidade implementada', source: 'manual' },
  });
  assert.equal(created.source, 'manual');

  const updates = await requestJson(server.base, '/api/projects/praxis/updates');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].summary, 'Nova visão de continuidade implementada');
});

test('máximo de dois focos continua protegido', async (t) => {
  const { server } = await mountProjects(t);

  const initial = await requestJson(server.base, '/api/projects');
  assert.equal(initial.filter((p) => p.focus === 1).length, 2);

  const res = await fetch(`${server.base}/api/projects/catalogozap`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ focus: 1 }),
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, 'FOCUS_LIMIT');

  await requestJson(server.base, '/api/projects/rca', {
    method: 'PATCH',
    body: { focus: 0 },
  });
  const second = await requestJson(server.base, '/api/projects/catalogozap', {
    method: 'PATCH',
    body: { focus: 1 },
  });
  assert.equal(second.focus, 1);

  const after = await requestJson(server.base, '/api/projects');
  assert.equal(after.filter((p) => p.focus === 1).length, 2);
});

test('Fiz isso registra o próximo passo na timeline e mantém a frente aberta', async (t) => {
  const { server } = await mountProjects(t);
  const before = await requestJson(server.base, '/api/projects/carteirazap');
  assert.match(before.next_step, /Auditar Clientes/i);
  const originalColumn = before.column;
  const originalFocus = before.focus;

  const result = await requestJson(server.base, '/api/projects/carteirazap/complete-next-step', {
    method: 'POST',
    body: {},
  });

  assert.equal(result.project.next_step, '');
  assert.equal(result.project.column, originalColumn);
  assert.equal(result.project.focus, originalFocus);
  assert.equal(result.project.last_move_note, 'Próximo passo concluído');
  assert.match(result.update.summary, /^Concluído:/i);
  assert.equal(result.update.source, 'conclusao');
  assert.match(result.completed_step, /Auditar Clientes/i);

  const updates = await requestJson(server.base, '/api/projects/carteirazap/updates');
  assert.equal(updates.length, 1);
  assert.match(updates[0].summary, /Auditar Clientes/i);
});

test('Fiz isso recusa frente sem próximo passo para não criar conclusão falsa', async (t) => {
  const { server } = await mountProjects(t);
  await requestJson(server.base, '/api/projects/carteirazap/complete-next-step', {
    method: 'POST',
    body: {},
  });

  const res = await fetch(`${server.base}/api/projects/carteirazap/complete-next-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'no next step');
});


test('Fiz isso com expected_step não apaga um próximo passo que mudou no meio da sessão', async (t) => {
  const { server } = await mountProjects(t);
  const before = await requestJson(server.base, '/api/projects/carteirazap');
  const antigo = before.next_step;

  await requestJson(server.base, '/api/projects/carteirazap', {
    method: 'PATCH',
    body: { next_step: 'Revisar o fluxo novo antes de mexer em Clientes' },
  });

  const res = await fetch(`${server.base}/api/projects/carteirazap/complete-next-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_step: antigo }),
  });

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, 'NEXT_STEP_CHANGED');

  const after = await requestJson(server.base, '/api/projects/carteirazap');
  assert.equal(after.next_step, 'Revisar o fluxo novo antes de mexer em Clientes');
  assert.equal(after.column, before.column);
  assert.equal(after.focus, before.focus);
  assert.equal(after.live, before.live);

  const updates = await requestJson(server.base, '/api/projects/carteirazap/updates');
  assert.equal(updates.length, 0);
});

test('Fiz isso com expected_step exato conclui, registra timeline e preserva column, focus e live', async (t) => {
  const { server } = await mountProjects(t);
  const before = await requestJson(server.base, '/api/projects/praxis');
  assert.ok(before.next_step);
  assert.equal(before.focus, 1);
  assert.equal(before.column, 'andando');
  assert.equal(before.live, 1);

  const res = await fetch(`${server.base}/api/projects/praxis/complete-next-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_step: before.next_step }),
  });

  assert.equal(res.status, 200);
  const result = await res.json();
  assert.equal(result.project.next_step, '');
  assert.equal(result.project.column, 'andando');
  assert.equal(result.project.focus, 1);
  assert.equal(result.project.live, 1);
  assert.equal(result.update.source, 'conclusao');
  assert.match(result.update.summary, new RegExp(`Concluído: ${before.next_step.slice(0, 20)}`, 'i'));

  const after = await requestJson(server.base, '/api/projects/praxis');
  assert.equal(after.next_step, '');
  assert.equal(after.column, 'andando');
  assert.equal(after.focus, 1);
  assert.equal(after.live, 1);

  const updates = await requestJson(server.base, '/api/projects/praxis/updates');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].source, 'conclusao');
});

test('concluir próximo passo nunca move nem altera frentes em radar ou pausado', async (t) => {
  const { server } = await mountProjects(t);
  const catalog = await requestJson(server.base, '/api/projects/catalogozap');
  assert.equal(catalog.column, 'radar');
  assert.ok(catalog.next_step);

  const resCatalog = await fetch(`${server.base}/api/projects/catalogozap/complete-next-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_step: catalog.next_step }),
  });
  assert.equal(resCatalog.status, 200);
  const afterCatalog = await requestJson(server.base, '/api/projects/catalogozap');
  assert.equal(afterCatalog.column, 'radar');
  assert.equal(afterCatalog.next_step, '');

  const encarte = await requestJson(server.base, '/api/projects/encartezap');
  assert.equal(encarte.column, 'pausado');
  assert.ok(encarte.next_step);

  const resEncarte = await fetch(`${server.base}/api/projects/encartezap/complete-next-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_step: encarte.next_step }),
  });
  assert.equal(resEncarte.status, 200);
  const afterEncarte = await requestJson(server.base, '/api/projects/encartezap');
  assert.equal(afterEncarte.column, 'pausado');
  assert.equal(afterEncarte.next_step, '');
});
