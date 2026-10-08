import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import express from 'express';
import { initProjectsSchema, seedProjectsIfEmpty } from './projects.js';
import {
  initContinuityGuidanceSchema,
  validateContinuityGuidance,
  upsertContinuityGuidance,
  getContinuityGuidance,
} from './continuityGuidance.js';
import { createProjectsRouter } from './routes/projects.js';
import { startTestServer, requestJson } from './test-support/helpers.mjs';

function setupDb() {
  const db = new Database(':memory:');
  initProjectsSchema(db);
  seedProjectsIfEmpty(db);
  initContinuityGuidanceSchema(db);
  db.exec("UPDATE projects SET parent_slug = 'gofluxo' WHERE slug = 'animalia'");
  return db;
}

test('criação idempotente da tabela continuity_guidance', () => {
  const db = new Database(':memory:');
  initContinuityGuidanceSchema(db);
  initContinuityGuidanceSchema(db);

  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='continuity_guidance'").get();
  assert.equal(table?.name, 'continuity_guidance');

  const columns = db.prepare('PRAGMA table_info(continuity_guidance)').all().map((c) => c.name);
  assert.deepEqual(columns, [
    'date',
    'summary',
    'priorities_json',
    'source',
    'generated_at',
    'created_at',
    'updated_at',
  ]);
  db.close();
});

test('zero, uma, duas e três prioridades válidas', () => {
  const db = setupDb();

  const base = {
    date: '2026-09-09',
    summary: 'Foco do dia',
    generated_at: '2026-09-09T07:50:00-03:00',
  };

  // Zero prioridades
  const res0 = upsertContinuityGuidance(db, { ...base, priorities: [] });
  assert.equal(res0.priorities.length, 0);
  assert.equal(res0.fresh, true);

  // Uma prioridade
  const res1 = upsertContinuityGuidance(db, {
    ...base,
    priorities: [
      { rank: 1, action: 'Ação 1', reason_code: 'income', reason: 'Renda direta', project_slug: 'rca' },
    ],
  });
  assert.equal(res1.priorities.length, 1);
  assert.equal(res1.priorities[0].rank, 1);
  assert.equal(res1.priorities[0].reason, 'Renda direta');

  // Duas prioridades
  const res2 = upsertContinuityGuidance(db, {
    ...base,
    priorities: [
      { rank: 1, action: 'Ação 1', reason_code: 'income', reason: 'Renda direta', project_slug: 'rca' },
      { rank: 2, action: 'Ação 2', reason_code: 'client_commitment', reason: 'Compromisso com cliente', project_slug: 'animalia' },
    ],
  });
  assert.equal(res2.priorities.length, 2);

  // Três prioridades
  const res3 = upsertContinuityGuidance(db, {
    ...base,
    priorities: [
      { rank: 1, action: 'Ação 1', reason_code: 'income', reason: 'Renda direta', project_slug: 'rca' },
      { rank: 2, action: 'Ação 2', reason_code: 'client_commitment', reason: 'Compromisso com cliente', project_slug: 'animalia' },
      { rank: 3, action: 'Ação 3', reason_code: 'continuity', reason: 'Continuidade da frente', project_slug: 'praxis' },
    ],
  });
  assert.equal(res3.priorities.length, 3);

  // Mais de 3 prioridades deve falhar
  assert.throws(() => {
    upsertContinuityGuidance(db, {
      ...base,
      priorities: [
        { rank: 1, action: 'Ação 1', reason_code: 'income', reason: 'R1' },
        { rank: 2, action: 'Ação 2', reason_code: 'client_commitment', reason: 'R2' },
        { rank: 3, action: 'Ação 3', reason_code: 'continuity', reason: 'R3' },
        { rank: 1, action: 'Ação 4', reason_code: 'manual', reason: 'R4' },
      ],
    });
  });

  db.close();
});

test('ranks duplicados falham validação', () => {
  const db = setupDb();
  assert.throws(() => {
    validateContinuityGuidance(db, {
      date: '2026-09-09',
      generated_at: '2026-09-09T07:50:00-03:00',
      priorities: [
        { rank: 1, action: 'Primeira', reason_code: 'income', reason: 'R1' },
        { rank: 1, action: 'Segunda', reason_code: 'continuity', reason: 'R2' },
      ],
    });
  }, /rank/i);
  db.close();
});

test('rank fora de 1–3 falha validação', () => {
  const db = setupDb();
  const invalidRanks = [0, 4, -1, 1.5, '1', null];
  for (const rank of invalidRanks) {
    assert.throws(() => {
      validateContinuityGuidance(db, {
        date: '2026-09-09',
        generated_at: '2026-09-09T07:50:00-03:00',
        priorities: [
          { rank, action: 'Ação', reason_code: 'income', reason: 'Motivo' },
        ],
      });
    }, /rank/i, `Deveria falhar para rank=${rank}`);
  }
  db.close();
});

test('action vazia falha validação', () => {
  const db = setupDb();
  const invalidActions = ['', '   ', null, undefined];
  for (const action of invalidActions) {
    assert.throws(() => {
      validateContinuityGuidance(db, {
        date: '2026-09-09',
        generated_at: '2026-09-09T07:50:00-03:00',
        priorities: [
          { rank: 1, action, reason_code: 'income', reason: 'Motivo' },
        ],
      });
    }, /action/i);
  }
  db.close();
});

test('reason_code inválido falha validação', () => {
  const db = setupDb();
  const invalidCodes = ['random', '', null, 123, 'unknown'];
  for (const reason_code of invalidCodes) {
    assert.throws(() => {
      validateContinuityGuidance(db, {
        date: '2026-09-09',
        generated_at: '2026-09-09T07:50:00-03:00',
        priorities: [
          { rank: 1, action: 'Ação válida', reason_code, reason: 'Motivo' },
        ],
      });
    }, /reason_code/i);
  }
  db.close();
});

test('project_slug inexistente falha validação', () => {
  const db = setupDb();
  assert.throws(() => {
    validateContinuityGuidance(db, {
      date: '2026-09-09',
      generated_at: '2026-09-09T07:50:00-03:00',
      priorities: [
        { rank: 1, action: 'Ação válida', reason_code: 'income', reason: 'Motivo', project_slug: 'frente-que-nao-existe' },
      ],
    });
  }, /project/i);
  db.close();
});

test('substituição atômica no mesmo dia sem misturar ranks antigos', () => {
  const db = setupDb();
  const date = '2026-09-09';

  // Manhã: 2 prioridades
  upsertContinuityGuidance(db, {
    date,
    summary: 'Orientação da manhã',
    generated_at: '2026-09-09T07:50:00-03:00',
    priorities: [
      { rank: 1, action: 'Ação 1 manhã', reason_code: 'income', reason: 'Renda', project_slug: 'rca' },
      { rank: 2, action: 'Ação 2 manhã', reason_code: 'client_commitment', reason: 'Cliente', project_slug: 'animalia' },
    ],
  });

  const morning = getContinuityGuidance(db, date);
  assert.equal(morning.summary, 'Orientação da manhã');
  assert.equal(morning.priorities.length, 2);

  // Tarde: 1 prioridade diferente
  upsertContinuityGuidance(db, {
    date,
    summary: 'Orientação da tarde atualizada',
    generated_at: '2026-09-09T13:50:00-03:00',
    priorities: [
      { rank: 1, action: 'Ação nova da tarde', reason_code: 'continuity', reason: 'Continuidade', project_slug: 'praxis' },
    ],
  });

  const afternoon = getContinuityGuidance(db, date);
  assert.equal(afternoon.summary, 'Orientação da tarde atualizada');
  assert.equal(afternoon.generated_at, '2026-09-09T13:50:00-03:00');
  assert.equal(afternoon.priorities.length, 1);
  assert.equal(afternoon.priorities[0].rank, 1);
  assert.equal(afternoon.priorities[0].action, 'Ação nova da tarde');
  assert.equal(afternoon.priorities[0].reason, 'Continuidade');
  assert.equal(afternoon.priorities[0].project_slug, 'praxis');

  db.close();
});

test('payload inválido preserva registro anterior', () => {
  const db = setupDb();
  const date = '2026-09-09';

  // Registro inicial válido
  upsertContinuityGuidance(db, {
    date,
    summary: 'Orientação inicial válida',
    generated_at: '2026-09-09T07:50:00-03:00',
    priorities: [
      { rank: 1, action: 'Ação válida', reason_code: 'income', reason: 'Motivo', project_slug: 'rca' },
    ],
  });

  // Tentativa com payload inválido (reason_code inexistente)
  assert.throws(() => {
    upsertContinuityGuidance(db, {
      date,
      summary: 'Atualização que deve falhar',
      generated_at: '2026-09-09T12:00:00-03:00',
      priorities: [
        { rank: 1, action: 'Ação falha', reason_code: 'codigo_invalido', reason: 'Motivo' },
      ],
    });
  });

  // Confere que registro anterior permanece inalterado
  const current = getContinuityGuidance(db, date);
  assert.equal(current.summary, 'Orientação inicial válida');
  assert.equal(current.generated_at, '2026-09-09T07:50:00-03:00');
  assert.equal(current.priorities.length, 1);
  assert.equal(current.priorities[0].action, 'Ação válida');
  assert.equal(current.priorities[0].reason, 'Motivo');

  db.close();
});

test('orientação de ontem retorna fallback fresco=false hoje', () => {
  const db = setupDb();
  const yesterday = '2026-09-08';
  const today = '2026-09-09';

  upsertContinuityGuidance(db, {
    date: yesterday,
    summary: 'Orientação de ontem',
    generated_at: '2026-09-08T07:50:00-03:00',
    priorities: [
      { rank: 1, action: 'Ação de ontem', reason_code: 'continuity', reason: 'Continuidade', project_slug: 'praxis' },
    ],
  });

  const res = getContinuityGuidance(db, today);
  assert.equal(res.date, today);
  assert.equal(res.summary, '');
  assert.equal(res.generated_at, null);
  assert.deepEqual(res.priorities, []);
  assert.equal(res.fresh, false);

  db.close();
});

test('hidratação de projeto inclui parent_slug e dados canônicos', () => {
  const db = setupDb();
  const date = '2026-09-09';

  upsertContinuityGuidance(db, {
    date,
    summary: 'Orientação com projetos',
    generated_at: '2026-09-09T07:50:00-03:00',
    priorities: [
      { rank: 1, action: 'Trabalhar no RCA', reason_code: 'income', reason: 'Renda', project_slug: 'rca' },
      { rank: 2, action: 'Ajustar Animália', reason_code: 'client_commitment', reason: 'Cliente', project_slug: 'animalia' },
      { rank: 3, action: 'Ação genérica sem frente', reason_code: 'manual', reason: 'Manual' },
    ],
  });

  const res = getContinuityGuidance(db, date);
  assert.equal(res.priorities.length, 3);

  // RCA
  assert.deepEqual(res.priorities[0].project, {
    id: 'rca',
    slug: 'rca',
    name: 'RCA',
    kind: 'trabalho',
    column: 'andando',
    parent_slug: '',
  });

  // Animália (com parent_slug = gofluxo)
  assert.deepEqual(res.priorities[1].project, {
    id: 'animalia',
    slug: 'animalia',
    name: 'Animália',
    kind: 'cliente',
    column: 'andando',
    parent_slug: 'gofluxo',
  });

  // Sem project_slug
  assert.equal(res.priorities[2].project_slug, null);
  assert.equal('project' in res.priorities[2] && res.priorities[2].project !== null, false);

  db.close();
});

// ===================================================================
// Testes de regressão após QA independente da A.N.A.
// ===================================================================

test('QA-1: reason é obrigatório e precisa conter texto não vazio em cada prioridade', () => {
  const db = setupDb();
  const base = {
    date: '2026-09-09',
    summary: 'Foco do dia',
    generated_at: '2026-09-09T07:50:00-03:00',
  };

  const invalidReasons = [undefined, null, '', '   ', 123, {}, []];
  for (const reason of invalidReasons) {
    assert.throws(() => {
      validateContinuityGuidance(db, {
        ...base,
        priorities: [
          { rank: 1, action: 'Ação válida', reason_code: 'income', reason },
        ],
      });
    }, /reason/i, `Deveria rejeitar reason=${JSON.stringify(reason)}`);
  }

  // Falha também se reason for omitido do objeto da prioridade
  assert.throws(() => {
    validateContinuityGuidance(db, {
      ...base,
      priorities: [
        { rank: 1, action: 'Ação válida', reason_code: 'income' },
      ],
    });
  }, /reason/i, 'Deveria rejeitar prioridade sem propriedade reason');

  // Reason válido deve ser aceito
  assert.doesNotThrow(() => {
    validateContinuityGuidance(db, {
      ...base,
      priorities: [
        { rank: 1, action: 'Ação válida', reason_code: 'income', reason: 'Protege renda e fechamento' },
      ],
    });
  });

  db.close();
});

test('QA-2: date precisa ser uma data civil real no formato YYYY-MM-DD', () => {
  const db = setupDb();
  const base = {
    summary: 'Foco do dia',
    generated_at: '2026-09-09T07:50:00-03:00',
    priorities: [],
  };

  const invalidDates = [
    '2026-02-30', // fevereiro não tem 30 dias
    '2026-00-10', // mês 00 não existe
    '2026-13-01', // mês 13 não existe
    '2026-04-31', // abril tem 30 dias
    '2023-02-29', // 2023 não é bissexto
    '2026-09-00', // dia 00 não existe
    '2026-09-32', // dia 32 não existe
    'not-a-date',
    '2026/09/09',
    '2026-9-9',
    '',
    null,
    undefined,
  ];

  for (const date of invalidDates) {
    assert.throws(() => {
      validateContinuityGuidance(db, {
        ...base,
        date,
      });
    }, /date/i, `Deveria rejeitar date=${date}`);
  }

  // Datas civis válidas
  assert.doesNotThrow(() => {
    validateContinuityGuidance(db, { ...base, date: '2026-09-09' });
    validateContinuityGuidance(db, { ...base, date: '2024-02-29' }); // 2024 é bissexto
    validateContinuityGuidance(db, { ...base, date: '2026-12-31' });
    validateContinuityGuidance(db, { ...base, date: '2026-01-01' });
  });

  db.close();
});

test('QA-3: generated_at precisa ser timestamp ISO 8601 válido com timezone explícito', () => {
  const db = setupDb();
  const base = {
    date: '2026-09-09',
    summary: 'Foco do dia',
    priorities: [],
  };

  const invalidTimestamps = [
    'not-a-timestamp',
    'arbitrary string',
    '2026-09-09',
    '2026-09-09T07:50:00', // sem timezone
    '2026-09-09T07:50:00.000', // sem timezone
    '2026-02-30T07:50:00Z', // data impossível (fevereiro 30)
    '2026-13-01T07:50:00-03:00', // mês 13 impossível
    '2026-00-10T07:50:00Z', // mês 00 impossível
    '2026-09-09T25:00:00Z', // hora impossível
    '2026-09-09T07:60:00Z', // minuto impossível
    '2026-09-09T07:50:60Z', // segundo impossível
    '2026-09-09T07:50:00+25:00', // timezone offset hora impossível
    '2026-09-09T07:50:00-03:60', // timezone offset minuto impossível
    '',
    null,
    undefined,
    12345,
  ];

  for (const generated_at of invalidTimestamps) {
    assert.throws(() => {
      validateContinuityGuidance(db, {
        ...base,
        generated_at,
      });
    }, /generated_at/i, `Deveria rejeitar generated_at=${generated_at}`);
  }

  // Timestamps ISO 8601 válidos com timezone explícito
  const validTimestamps = [
    '2026-09-09T07:50:00-03:00',
    '2026-09-09T07:50:00Z',
    '2026-09-09T07:50:00.123Z',
    '2026-09-09T07:50:00.456+02:00',
    '2024-02-29T23:59:59Z',
  ];
  for (const generated_at of validTimestamps) {
    assert.doesNotThrow(() => {
      validateContinuityGuidance(db, {
        ...base,
        generated_at,
      });
    }, `Deveria aceitar generated_at=${generated_at}`);
  }

  db.close();
});

test('QA-4: priorities_json corrompido ou não-array retorna fallback honesto com fresh=false', () => {
  const db = setupDb();
  const date = '2026-09-09';

  const corruptedValues = [
    '{not-valid-json',
    '{"rank":1}', // objeto JSON, não array
    '"uma string qualquer"', // string JSON, não array
    '12345', // número JSON, não array
    'null', // null JSON, não array
    'true', // boolean JSON, não array
    '', // string vazia
  ];

  for (const val of corruptedValues) {
    db.prepare('DELETE FROM continuity_guidance').run();
    db.prepare(`
      INSERT INTO continuity_guidance (date, summary, priorities_json, source, generated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(date, 'Sumário sensível que não deve vazar', val, 'seneca', '2026-09-09T07:50:00-03:00');

    const res = getContinuityGuidance(db, date);
    assert.equal(res.date, date, `Falha no date para val=${val}`);
    assert.equal(res.fresh, false, `fresh deve ser false para val=${val}`);
    assert.equal(res.summary, '', `summary deve ser vazia para val=${val}`);
    assert.equal(res.generated_at, null, `generated_at deve ser null para val=${val}`);
    assert.deepEqual(res.priorities, [], `priorities deve ser [] para val=${val}`);
  }

  db.close();
});

// ===================================================================
// Testes de rotas Express HTTP
// ===================================================================

test('GET /api/projects/guidance/today retorna 200 com fallback quando vazia', async (t) => {
  const db = setupDb();
  const app = express();
  app.use(express.json());
  const fixedToday = () => '2026-09-09';
  app.use('/api/projects', createProjectsRouter({ db, getLocalDateString: fixedToday }));

  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const res = await requestJson(server.base, '/api/projects/guidance/today');
  assert.equal(res.date, '2026-09-09');
  assert.equal(res.summary, '');
  assert.equal(res.generated_at, null);
  assert.deepEqual(res.priorities, []);
  assert.equal(res.fresh, false);
});

test('GET /api/projects/guidance/today retorna 200 com fallback quando priorities_json corrompido', async (t) => {
  const db = setupDb();
  const fixedToday = () => '2026-09-09';

  db.prepare(`
    INSERT INTO continuity_guidance (date, summary, priorities_json, source, generated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('2026-09-09', 'Sumário corrupto', '{bad-json', 'seneca', '2026-09-09T07:50:00-03:00');

  const app = express();
  app.use(express.json());
  app.use('/api/projects', createProjectsRouter({ db, getLocalDateString: fixedToday }));

  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const res = await requestJson(server.base, '/api/projects/guidance/today');
  assert.equal(res.date, '2026-09-09');
  assert.equal(res.summary, '');
  assert.equal(res.generated_at, null);
  assert.deepEqual(res.priorities, []);
  assert.equal(res.fresh, false);
});

test('GET /api/projects/guidance/today retorna 200 com orientação fresca e hidratada', async (t) => {
  const db = setupDb();
  const fixedToday = () => '2026-09-09';

  upsertContinuityGuidance(db, {
    date: '2026-09-09',
    summary: 'RCA vem primeiro porque há ação comercial com impacto imediato.',
    generated_at: '2026-09-09T07:50:00-03:00',
    priorities: [
      {
        rank: 1,
        action: 'Disparar o follow-up da campanha para clientes com investimento adicional.',
        reason_code: 'income',
        reason: 'Protege renda e fechamento',
        project_slug: 'rca',
        task_id: 'task-123',
      },
    ],
  });

  const app = express();
  app.use(express.json());
  app.use('/api/projects', createProjectsRouter({ db, getLocalDateString: fixedToday }));

  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const res = await requestJson(server.base, '/api/projects/guidance/today');
  assert.equal(res.date, '2026-09-09');
  assert.equal(res.fresh, true);
  assert.equal(res.summary, 'RCA vem primeiro porque há ação comercial com impacto imediato.');
  assert.equal(res.priorities.length, 1);
  assert.equal(res.priorities[0].rank, 1);
  assert.equal(res.priorities[0].reason, 'Protege renda e fechamento');
  assert.equal(res.priorities[0].project.slug, 'rca');
  assert.equal(res.priorities[0].project.name, 'RCA');
});

test('precedência da rota /guidance/today sobre /:id', async (t) => {
  const db = setupDb();
  const fixedToday = () => '2026-09-09';
  const app = express();
  app.use(express.json());
  app.use('/api/projects', createProjectsRouter({ db, getLocalDateString: fixedToday }));

  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const response = await fetch(`${server.base}/api/projects/guidance/today`);
  assert.equal(response.status, 200);

  // Se houvesse colisão com /:id, tentaria buscar um projeto com id/slug='guidance',
  // o que retornaria 404 Not Found porque esse projeto não existe.
  const payload = await response.json();
  assert.ok('fresh' in payload);
  assert.ok('priorities' in payload);
});
