/** Projetos — memória operacional das frentes do João. */

import { randomUUID } from 'crypto';

export const PROJECT_COLUMNS = ['andando', 'radar', 'aguardando', 'pausado'];
export const PROJECT_KINDS = ['produto', 'cliente', 'trabalho', 'estudo'];
export const FOCUS_LIMIT = 2;

export const PROJECT_COLUMN_LABELS = {
  andando: 'Andando',
  radar: 'Radar',
  aguardando: 'Aguardando',
  pausado: 'Pausado',
};

const COLUMN_MOVE_NOTES = {
  andando: 'Voltou para a mesa',
  radar: 'Foi para o radar',
  aguardando: 'Ficou aguardando',
  pausado: 'Pausa consciente',
};

const SEED_PROJECTS = [
  {
    slug: 'praxis',
    name: 'Praxis',
    tagline: 'O app do dia: hábitos, tarefas, treino e continuidade.',
    kind: 'produto',
    column: 'andando',
    focus: 1,
    live: 1,
    objective: 'Ser o cockpit simples do dia a dia do João, sem virar uma lista infinita de coisas.',
    status_summary: 'Produto ativo e em evolução contínua para uso próprio.',
    current_slice: 'Jota Fit + continuidade das frentes',
    next_step: 'Usar a nova visão de Projetos no fluxo real e corrigir o que atrapalhar a retomada.',
    prod_url: 'https://dopraxis.vercel.app',
    repo_path: 'apps/praxis',
    sort_order: 1,
  },
  {
    slug: 'catalogozap',
    name: 'CatálogoZap',
    tagline: 'Catálogo no WhatsApp para vender na farmácia.',
    kind: 'produto',
    column: 'radar',
    focus: 0,
    live: 1,
    objective: 'Simplificar catálogo, proposta e pedido do RCA com uma experiência rápida pelo WhatsApp.',
    status_summary: 'Produto funcional e em uso, com melhorias recentes no checkout e histórico.',
    current_slice: '',
    next_step: 'Validar o fluxo real em campo antes de abrir nova frente de produto.',
    prod_url: 'https://catalogo-zap.vercel.app',
    repo_path: 'apps/catalogozap',
    sort_order: 2,
  },
  {
    slug: 'carteirazap',
    name: 'CarteiraZap',
    tagline: 'CRM operacional do RCA no WhatsApp.',
    kind: 'produto',
    column: 'andando',
    focus: 0,
    live: 0,
    objective: 'Dar ao RCA uma visão simples de clientes, positivação, follow-up e ações comerciais.',
    status_summary: 'Projeto em retomada; estrutura antiga ainda precisa convergir para o padrão do CatálogoZap.',
    current_slice: 'Auditoria e simplificação das abas',
    next_step: 'Auditar Clientes contra os dados reais e definir o modelo canônico antes de refatorar o restante.',
    prod_url: '',
    repo_path: 'apps/carteirazap',
    sort_order: 3,
  },
  {
    slug: 'encartezap',
    name: 'EncarteZap',
    tagline: 'Encarte da farmácia no WhatsApp do cliente.',
    kind: 'produto',
    column: 'pausado',
    focus: 0,
    live: 1,
    objective: 'Permitir que a farmácia publique e distribua ofertas com o mínimo de operação manual.',
    status_summary: 'Produto existente, pausado de propósito enquanto outras frentes têm mais alavancagem.',
    current_slice: 'Pausa consciente',
    next_step: 'Retomar apenas com hipótese comercial ou validação real de lojista.',
    prod_url: '',
    repo_path: 'apps/encartezap',
    sort_order: 4,
  },
  {
    slug: 'site-pessoal',
    name: 'Site pessoal',
    tagline: 'Hub vivo do que João vende, constrói e pratica.',
    kind: 'produto',
    column: 'radar',
    focus: 0,
    live: 1,
    objective: 'Explicar de forma humana quem João é e provar o que está construindo sem virar brochure genérica.',
    status_summary: 'Projeto ativo em retomada, com copy e posicionamento sendo refinados.',
    current_slice: 'Copy e estrutura dos projetos',
    next_step: 'Fechar a narrativa da home e publicar apenas projetos que representam o momento atual.',
    prod_url: 'https://jotavictor.com',
    repo_path: 'apps/jotavictor-site',
    sort_order: 5,
  },
  {
    slug: 'gofluxo',
    name: 'GoFluxo',
    tagline: 'Automação e agentes aplicados a operações reais.',
    kind: 'trabalho',
    column: 'radar',
    focus: 0,
    live: 0,
    objective: 'Transformar automação e agentes em entregas confiáveis para empresas, com escopo e valor claros.',
    status_summary: 'Frente em construção com Breno, com oportunidades além da Animália ainda em estágio inicial.',
    current_slice: 'Estruturação comercial e de entrega',
    next_step: 'Consolidar o que a GoFluxo vende, como entrega e qual é o próximo projeto realmente iniciado.',
    prod_url: '',
    repo_path: '',
    sort_order: 6,
  },
  {
    slug: 'animalia',
    name: 'Animália',
    tagline: 'Projeto cliente-piloto da GoFluxo.',
    kind: 'cliente',
    column: 'andando',
    focus: 0,
    live: 1,
    objective: 'Entregar automações úteis para a operação da clínica e transformar o piloto em prova concreta de valor.',
    status_summary: 'Cliente-piloto ativo; estado é distribuído entre agente, infraestrutura GoFluxo e site oficial.',
    current_slice: 'Piloto operacional',
    next_step: 'Avançar somente a próxima entrega validada com o cliente e manter produção, lab e documentação coerentes.',
    prod_url: 'https://animalia.gofluxo.com.br',
    repo_path: 'apps/animalia',
    sort_order: 7,
  },
  {
    slug: 'rca',
    name: 'RCA',
    tagline: 'Trabalho comercial que sustenta o resto.',
    kind: 'trabalho',
    column: 'andando',
    focus: 1,
    live: 1,
    objective: 'Cumprir bem o trabalho comercial, proteger renda e manter a carteira de clientes em movimento.',
    status_summary: 'Frente prioritária do dia a dia; o próximo passo deve vir das tarefas e pendências reais da Praxis.',
    current_slice: 'Execução comercial da semana',
    next_step: 'Resolver a ação comercial mais urgente e executável registrada na Praxis.',
    prod_url: '',
    repo_path: '',
    sort_order: 8,
  },
  {
    slug: 'faculdade',
    name: 'Faculdade',
    tagline: 'Obrigações e avanço acadêmico sem acúmulo desnecessário.',
    kind: 'estudo',
    column: 'andando',
    focus: 0,
    live: 1,
    objective: 'Manter presença, pagamentos, trabalhos e estudo em dia com o mínimo de carga mental acumulada.',
    status_summary: 'Frente contínua; deve refletir as pendências acadêmicas reais, não metas abstratas de produtividade.',
    current_slice: 'Semana acadêmica atual',
    next_step: 'Executar a pendência acadêmica mais próxima ou preparar a próxima aula/prova relevante.',
    prod_url: '',
    repo_path: '',
    sort_order: 9,
  },
];

export function todayFortaleza(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(date);
}

function tableColumns(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
}

function ensureColumn(db, table, name, definition) {
  const columns = tableColumns(db, table);
  if (!columns.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
}

export function initProjectsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tagline TEXT DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'produto',
      column TEXT NOT NULL DEFAULT 'radar',
      focus INTEGER NOT NULL DEFAULT 0,
      live INTEGER NOT NULL DEFAULT 0,
      objective TEXT DEFAULT '',
      status_summary TEXT DEFAULT '',
      current_slice TEXT DEFAULT '',
      next_step TEXT DEFAULT '',
      last_move_at TEXT DEFAULT '',
      last_move_note TEXT DEFAULT '',
      last_reviewed_at TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      shipped_note TEXT DEFAULT '',
      blocked_note TEXT DEFAULT '',
      prod_url TEXT DEFAULT '',
      repo_path TEXT DEFAULT '',
      sort_order INTEGER,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_updates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      date TEXT NOT NULL,
      summary TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      created_by TEXT DEFAULT 'joao',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_project_updates_project_date
      ON project_updates(project_id, date DESC, created_at DESC);
  `);

  // Compatibilidade com a v1 já em produção.
  ensureColumn(db, 'projects', 'kind', "TEXT NOT NULL DEFAULT 'produto'");
  ensureColumn(db, 'projects', 'live', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'projects', 'objective', "TEXT DEFAULT ''");
  ensureColumn(db, 'projects', 'status_summary', "TEXT DEFAULT ''");
  ensureColumn(db, 'projects', 'next_step', "TEXT DEFAULT ''");
  ensureColumn(db, 'projects', 'last_reviewed_at', "TEXT DEFAULT ''");
  // Sub-frente: uma frente pode pertencer a outra (ex.: Animália é serviço da GoFluxo).
  ensureColumn(db, 'projects', 'parent_slug', "TEXT DEFAULT ''");
  // Migração: Animália é serviço da GoFluxo. Só preenche se estiver vazio, para não sobrescrever o João.
  db.exec(
    "UPDATE projects SET parent_slug = 'gofluxo' WHERE slug = 'animalia' AND TRIM(COALESCE(parent_slug, '')) = ''",
  );

  // "No ar" é uma característica do projeto, não uma etapa de trabalho.
  db.exec("UPDATE projects SET live = 1 WHERE column = 'no_ar'");
  db.exec("UPDATE projects SET column = 'andando' WHERE column = 'no_ar'");
  db.exec("UPDATE projects SET column = 'pausado' WHERE column = 'parado'");
}

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    focus: row.focus ? 1 : 0,
    live: row.live ? 1 : 0,
  };
}

function nextSort(db) {
  const row = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM projects').get();
  return (row?.m || 0) + 1;
}

function countFocused(db, exceptId) {
  if (exceptId) {
    const row = db.prepare(
      'SELECT COUNT(*) AS n FROM projects WHERE focus = 1 AND id != ?',
    ).get(exceptId);
    return row?.n || 0;
  }
  const row = db.prepare('SELECT COUNT(*) AS n FROM projects WHERE focus = 1').get();
  return row?.n || 0;
}

function focusLimitError() {
  const err = new Error('FOCUS_LIMIT');
  err.status = 409;
  err.code = 'FOCUS_LIMIT';
  return err;
}

function notFoundError() {
  const err = new Error('Not found');
  err.status = 404;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  err.code = message;
  return err;
}

export function getProject(db, idOrSlug) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? OR slug = ?').get(idOrSlug, idOrSlug);
  return mapRow(row);
}

export function listProjects(db) {
  return db.prepare('SELECT * FROM projects ORDER BY focus DESC, sort_order ASC, name ASC').all().map(mapRow);
}

/** Insere frentes canônicas ausentes. Nunca sobrescreve conteúdo já editado pelo João. */
export function seedProjectsIfEmpty(db) {
  const insert = db.prepare(`
    INSERT INTO projects (
      id, slug, name, tagline, kind, column, focus, live, objective, status_summary,
      current_slice, next_step, last_move_at, last_move_note, last_reviewed_at,
      notes, shipped_note, blocked_note, prod_url, repo_path, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let hydrated = 0;
  const run = db.transaction(() => {
    for (const seed of SEED_PROJECTS) {
      const current = db.prepare('SELECT * FROM projects WHERE slug = ?').get(seed.slug);
      if (!current) {
        insert.run(
          seed.slug,
          seed.slug,
          seed.name,
          seed.tagline,
          seed.kind,
          seed.column,
          seed.focus ? 1 : 0,
          seed.live ? 1 : 0,
          seed.objective || '',
          seed.status_summary || '',
          seed.current_slice || '',
          seed.next_step || '',
          '',
          '',
          '',
          '',
          '',
          '',
          seed.prod_url || '',
          seed.repo_path || '',
          seed.sort_order,
        );
        inserted += 1;
        continue;
      }

      // Migração v1 → v2: preenche somente os novos metadados ainda vazios.
      // Depois que o João/Sêneca escreverem objetivo/estado, o seed para de interferir.
      const needsHydration = !String(current.objective || '').trim();
      if (!needsHydration) continue;
      db.prepare(`
        UPDATE projects SET
          tagline = CASE WHEN TRIM(COALESCE(tagline, '')) = '' THEN ? ELSE tagline END,
          kind = ?,
          live = ?,
          objective = ?,
          status_summary = ?,
          current_slice = CASE WHEN TRIM(COALESCE(current_slice, '')) = '' THEN ? ELSE current_slice END,
          next_step = ?,
          prod_url = CASE WHEN TRIM(COALESCE(prod_url, '')) = '' THEN ? ELSE prod_url END,
          repo_path = CASE WHEN TRIM(COALESCE(repo_path, '')) = '' THEN ? ELSE repo_path END,
          updated_date = datetime('now')
        WHERE id = ?
      `).run(
        seed.tagline || '',
        seed.kind,
        seed.live ? 1 : 0,
        seed.objective || '',
        seed.status_summary || '',
        seed.current_slice || '',
        seed.next_step || '',
        seed.prod_url || '',
        seed.repo_path || '',
        current.id,
      );
      hydrated += 1;
    }
  });
  run();
  return { seeded: inserted > 0, inserted, hydrated };
}

export function createProject(db, body) {
  const slug = String(body.slug || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  if (!slug) throw badRequest('slug required');
  if (!name) throw badRequest('name required');
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(slug)) throw badRequest('invalid slug');

  const existing = db.prepare('SELECT 1 AS ok FROM projects WHERE slug = ?').get(slug);
  if (existing) throw badRequest('slug already exists');

  const column = PROJECT_COLUMNS.includes(body.column) ? body.column : 'radar';
  const kind = PROJECT_KINDS.includes(body.kind) ? body.kind : 'produto';
  const focus = body.focus ? 1 : 0;
  if (focus && countFocused(db) >= FOCUS_LIMIT) throw focusLimitError();

  const id = body.id || randomUUID();
  const sort = body.sort_order != null ? Number(body.sort_order) : nextSort(db);

  db.prepare(`
    INSERT INTO projects (
      id, slug, name, tagline, kind, column, focus, live, objective, status_summary,
      current_slice, next_step, last_move_at, last_move_note, last_reviewed_at,
      notes, shipped_note, blocked_note, prod_url, repo_path, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    slug,
    name,
    String(body.tagline || ''),
    kind,
    column,
    focus,
    body.live ? 1 : 0,
    String(body.objective || ''),
    String(body.status_summary || ''),
    String(body.current_slice || ''),
    String(body.next_step || ''),
    String(body.last_move_at || ''),
    String(body.last_move_note || ''),
    String(body.last_reviewed_at || ''),
    String(body.notes || ''),
    String(body.shipped_note || ''),
    String(body.blocked_note || ''),
    String(body.prod_url || ''),
    String(body.repo_path || ''),
    sort,
  );

  return getProject(db, id);
}

export function setProjectFocus(db, idOrSlug, focus) {
  const existing = getProject(db, idOrSlug);
  if (!existing) return null;

  const next = focus ? 1 : 0;
  if (existing.focus === next) return existing;

  if (next === 1 && countFocused(db, existing.id) >= FOCUS_LIMIT) {
    throw focusLimitError();
  }

  db.prepare(`
    UPDATE projects SET focus = ?, updated_date = datetime('now') WHERE id = ?
  `).run(next, existing.id);

  return getProject(db, existing.id);
}

export function createProjectUpdate(db, idOrSlug, body = {}) {
  const project = getProject(db, idOrSlug);
  if (!project) return null;
  const summary = String(body.summary || '').trim();
  if (!summary) throw badRequest('summary required');
  const id = body.id || randomUUID();
  const date = String(body.date || todayFortaleza()).slice(0, 10);
  const source = String(body.source || 'manual').trim() || 'manual';
  const createdBy = String(body.created_by || 'joao').trim() || 'joao';
  db.prepare(`
    INSERT INTO project_updates (id, project_id, date, summary, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, project.id, date, summary, source, createdBy);
  return db.prepare('SELECT * FROM project_updates WHERE id = ?').get(id);
}

export function listProjectUpdates(db, idOrSlug, limit = 40) {
  const project = getProject(db, idOrSlug);
  if (!project) return null;
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 40));
  return db.prepare(`
    SELECT * FROM project_updates
    WHERE project_id = ?
    ORDER BY date DESC, created_at DESC
    LIMIT ?
  `).all(project.id, safeLimit);
}

/** Fecha apenas o próximo passo, não a frente inteira. Mantém foco/coluna intactos. */
export function completeProjectNextStep(db, idOrSlug, body = {}) {
  const project = getProject(db, idOrSlug);
  if (!project) return null;

  const currentNextStep = String(project.next_step || '').trim();
  if (!currentNextStep) throw badRequest('no next step');

  const expectedStep = String(body.expected_step || '').trim();
  if (expectedStep && expectedStep !== currentNextStep) {
    throw conflict('NEXT_STEP_CHANGED');
  }

  const date = todayFortaleza();
  const rawSummary = String(body.summary || currentNextStep).trim() || currentNextStep;
  const summary = /^conclu[ií]do:/i.test(rawSummary) ? rawSummary : `Concluído: ${rawSummary}`;
  const source = String(body.source || 'conclusao').trim() || 'conclusao';
  const createdBy = String(body.created_by || 'joao').trim() || 'joao';

  const run = db.transaction(() => {
    const update = createProjectUpdate(db, project.id, {
      date,
      summary,
      source,
      created_by: createdBy,
    });

    db.prepare(`
      UPDATE projects SET
        next_step = '',
        last_reviewed_at = ?,
        last_move_at = ?,
        last_move_note = 'Próximo passo concluído',
        updated_date = datetime('now')
      WHERE id = ?
    `).run(date, date, project.id);

    return {
      project: getProject(db, project.id),
      update,
      completed_step: currentNextStep,
    };
  });

  return run();
}

export function moveProjectColumn(db, idOrSlug, column, { note } = {}) {
  const existing = getProject(db, idOrSlug);
  if (!existing) return null;
  if (!PROJECT_COLUMNS.includes(column)) throw badRequest('invalid column');
  if (existing.column === column) return existing;

  const moveNote = note != null && String(note).trim()
    ? String(note).trim()
    : (COLUMN_MOVE_NOTES[column] || '');
  const date = todayFortaleza();

  db.prepare(`
    UPDATE projects SET
      column = ?,
      last_move_at = ?,
      last_move_note = ?,
      updated_date = datetime('now')
    WHERE id = ?
  `).run(column, date, moveNote, existing.id);

  createProjectUpdate(db, existing.id, {
    date,
    summary: moveNote,
    source: 'praxis',
    created_by: 'joao',
  });

  return getProject(db, existing.id);
}

const TEXT_FIELDS = [
  'name',
  'tagline',
  'kind',
  'objective',
  'status_summary',
  'current_slice',
  'next_step',
  'last_move_at',
  'last_move_note',
  'last_reviewed_at',
  'notes',
  'shipped_note',
  'blocked_note',
  'prod_url',
  'repo_path',
];

export function updateProject(db, idOrSlug, body = {}) {
  const existing = getProject(db, idOrSlug);
  if (!existing) return null;

  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  if (!name) throw badRequest('name required');

  const next = { ...existing, name };
  for (const field of TEXT_FIELDS) {
    if (field === 'name') continue;
    if (body[field] !== undefined) next[field] = String(body[field]);
  }
  if (!PROJECT_KINDS.includes(next.kind)) next.kind = existing.kind || 'produto';
  if (body.live !== undefined) next.live = body.live ? 1 : 0;
  if (body.sort_order !== undefined) next.sort_order = Number(body.sort_order);

  db.prepare(`
    UPDATE projects SET
      name = ?,
      tagline = ?,
      kind = ?,
      live = ?,
      objective = ?,
      status_summary = ?,
      current_slice = ?,
      next_step = ?,
      last_move_at = ?,
      last_move_note = ?,
      last_reviewed_at = ?,
      notes = ?,
      shipped_note = ?,
      blocked_note = ?,
      prod_url = ?,
      repo_path = ?,
      sort_order = ?,
      updated_date = datetime('now')
    WHERE id = ?
  `).run(
    next.name,
    next.tagline,
    next.kind,
    next.live ? 1 : 0,
    next.objective,
    next.status_summary,
    next.current_slice,
    next.next_step,
    next.last_move_at,
    next.last_move_note,
    next.last_reviewed_at,
    next.notes,
    next.shipped_note,
    next.blocked_note,
    next.prod_url,
    next.repo_path,
    next.sort_order,
    existing.id,
  );

  return getProject(db, existing.id);
}

/** Apply column / focus / field patch in one transaction. */
export function applyProjectPatch(db, idOrSlug, body = {}) {
  const existing = getProject(db, idOrSlug);
  if (!existing) return null;

  const run = db.transaction(() => {
    if (body.column !== undefined) {
      const moved = moveProjectColumn(db, existing.id, body.column, { note: body.last_move_note });
      if (!moved) throw notFoundError();
    }
    if (body.focus !== undefined) {
      const focused = setProjectFocus(db, existing.id, body.focus);
      if (!focused) throw notFoundError();
    }
    const rest = { ...body };
    delete rest.column;
    delete rest.focus;
    delete rest.slug;
    delete rest.id;
    const hasFields = Object.keys(rest).some((key) => rest[key] !== undefined);
    if (hasFields) updateProject(db, existing.id, rest);
    return getProject(db, existing.id);
  });

  return run();
}
