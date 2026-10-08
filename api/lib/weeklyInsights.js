import { buildNutritionSummary } from '../nutrition.js';

/**
 * Agregação semanal para /api/insights/weekly (Praxis onda 8).
 */

export function addDaysYmd(ymd, days) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function parseRecurrenceDays(habit) {
  if (!habit?.recurrence_days) return [];
  try {
    const raw = typeof habit.recurrence_days === 'string'
      ? JSON.parse(habit.recurrence_days)
      : habit.recurrence_days;
    return Array.isArray(raw)
      ? [...new Set(raw.map(Number).filter((n) => n >= 0 && n <= 6))]
      : [];
  } catch {
    return [];
  }
}

export function isHabitDueOnDate(habit, dateStr) {
  if (!habit || habit.status !== 'active') return false;
  if (habit.tracking_mode === 'since') return false;
  const d = new Date(`${dateStr}T12:00:00`);
  const dow = d.getDay();
  const freq = habit.frequency || 'daily';
  if (freq === 'daily') return true;
  if (freq === 'weekdays') return dow >= 1 && dow <= 5;
  if (freq === 'weekends') return dow === 0 || dow === 6;
  if (freq === 'weekly') {
    const days = parseRecurrenceDays(habit);
    return days.length ? days.includes(dow) : true;
  }
  return true;
}

function cleanTitle(title) {
  return String(title || '').replace(/^P\d+\s*[-–—:]?\s*/i, '').trim();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} weekStart YYYY-MM-DD (segunda)
 * @param {{ today?: string }} [options] today = 'YYYY-MM-DD' (default: data local)
 */
export function buildWeeklyInsights(db, weekStart, options = {}) {
  const weekEnd = addDaysYmd(weekStart, 6);
  const today = String(options.today || localYmd());
  // Semana em andamento: só conta dias já transcorridos (não pune o futuro).
  const effEnd = today < weekEnd ? today : weekEnd;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDaysYmd(weekStart, i);
    if (d > effEnd) break;
    days.push(d);
  }

  const completedTasks = db.prepare(`
    SELECT id, title, priority, category, date, completed_date
    FROM tasks
    WHERE status = 'completed'
      AND category != 'ideias'
      AND (
        (date IS NOT NULL AND date BETWEEN ? AND ?)
        OR (completed_date IS NOT NULL AND completed_date BETWEEN ? AND ?)
      )
    ORDER BY completed_date DESC, updated_date DESC
    LIMIT 50
  `).all(weekStart, weekEnd, weekStart, weekEnd);

  const stalePending = db.prepare(`
    SELECT title FROM tasks
    WHERE status = 'pending'
      AND category != 'ideias'
      AND date IS NOT NULL
      AND date < ?
    ORDER BY date ASC
    LIMIT 10
  `).all(weekStart);

  const overdueCount = stalePending.length;

  const activeHabits = db.prepare("SELECT * FROM habits WHERE status = 'active'").all();
  let habitSlots = 0;
  let habitDone = 0;
  let habitSkipped = 0;
  let habitOpenSlots = 0;
  const missByHabit = {};
  const skipByHabit = {};
  const skipReasonByHabit = {};

  for (const day of days) {
    for (const h of activeHabits) {
      if (!isHabitDueOnDate(h, day)) continue;
      habitSlots += 1;
      const log = db.prepare(
        'SELECT completed, outcome, skip_reason FROM habit_logs WHERE habit_id = ? AND date = ?',
      ).get(h.id, day);
      const isSkipped = log && log.outcome === 'skipped';
      const isDone = log && !isSkipped && (
        log.outcome === 'done' || log.completed === 1 || log.completed === true
      );
      if (isDone) {
        habitDone += 1;
      } else if (isSkipped) {
        habitSkipped += 1;
        const key = h.title || h.id;
        skipByHabit[key] = (skipByHabit[key] || 0) + 1;
        if (log.skip_reason) {
          if (!skipReasonByHabit[key]) skipReasonByHabit[key] = {};
          const r = log.skip_reason;
          skipReasonByHabit[key][r] = (skipReasonByHabit[key][r] || 0) + 1;
        }
      } else {
        habitOpenSlots += 1;
        const key = h.title || h.id;
        missByHabit[key] = (missByHabit[key] || 0) + 1;
      }
    }
  }

  const habitPct = habitSlots > 0 ? Math.round((habitDone / habitSlots) * 100) : null;

  const focusAgg = db.prepare(`
    SELECT COUNT(*) as sessions, COALESCE(SUM(duration_seconds), 0) as total_seconds
    FROM focus_sessions
    WHERE date BETWEEN ? AND ?
  `).get(weekStart, weekEnd);

  const focusMinutes = Math.round((focusAgg?.total_seconds || 0) / 60);
  const focusSessions = focusAgg?.sessions || 0;

  const wellnessRows = db.prepare(`
    SELECT mood, productivity, sleep_hours, sleep_quality
    FROM wellness_checks
    WHERE date BETWEEN ? AND ?
  `).all(weekStart, weekEnd);

  let avgMood = null;
  let avgProductivity = null;
  let avgSleep = null;
  if (wellnessRows.length > 0) {
    const sum = wellnessRows.reduce(
      (acc, w) => ({
        mood: acc.mood + (w.mood || 0),
        productivity: acc.productivity + (w.productivity || 0),
        sleep: acc.sleep + (w.sleep_hours || 0),
      }),
      { mood: 0, productivity: 0, sleep: 0 },
    );
    const n = wellnessRows.length;
    avgMood = +(sum.mood / n).toFixed(1);
    avgProductivity = +(sum.productivity / n).toFixed(1);
    avgSleep = +(sum.sleep / n).toFixed(1);
  }

  const ideasNew = db.prepare(`
    SELECT COUNT(*) as c FROM tasks
    WHERE category = 'ideias'
      AND substr(created_date, 1, 10) BETWEEN ? AND ?
  `).get(weekStart, weekEnd).c;

  const ideasPromoted = db.prepare(`
    SELECT COUNT(*) as c FROM tasks
    WHERE category = 'ideias'
      AND idea_status = 'virou_tarefa'
      AND substr(updated_date, 1, 10) BETWEEN ? AND ?
  `).get(weekStart, weekEnd).c;

  const promissoras = db.prepare(`
    SELECT title FROM tasks
    WHERE category = 'ideias' AND idea_status = 'promissora'
    ORDER BY updated_date DESC
    LIMIT 5
  `).all();

  const topMissed = Object.entries(missByHabit)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, misses]) => ({ title: cleanTitle(title), misses }));

  const topSkipped = Object.entries(skipByHabit)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, skips]) => {
      const reasons = skipReasonByHabit[title] || {};
      const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      return { title: cleanTitle(title), skips, top_reason: topReason };
    });

  const victoryTitles = completedTasks
    .slice(0, 5)
    .map((t) => cleanTitle(t.title))
    .filter(Boolean);

  const suggested_priorities = [];

  if (overdueCount > 0) {
    const first = cleanTitle(stalePending[0]?.title);
    suggested_priorities.push(
      first
        ? `Fechar pendência atrasada: ${first}${overdueCount > 1 ? ` (+${overdueCount - 1})` : ''}`
        : `Fechar ${overdueCount} tarefa(s) atrasada(s)`,
    );
  }

  if (topMissed[0]) {
    suggested_priorities.push(
      `Reforçar hábito em aberto: ${topMissed[0].title} (${topMissed[0].misses} slot(s) sem registro)`,
    );
  } else if (topSkipped[0]) {
    const reasonLabel = {
      time: 'tempo',
      energy: 'energia',
      context: 'contexto',
      other: 'outro',
    }[topSkipped[0].top_reason] || null;
    suggested_priorities.push(
      reasonLabel
        ? `${topSkipped[0].title}: não rolou ${topSkipped[0].skips}× (${reasonLabel}) — encolher janela?`
        : `${topSkipped[0].title}: não rolou ${topSkipped[0].skips}× — rever frequência?`,
    );
  }

  if (promissoras[0]) {
    suggested_priorities.push(`Ideia promissora → tarefa: ${cleanTitle(promissoras[0].title)}`);
  } else if (ideasNew > 0) {
    suggested_priorities.push(`Revisar ${ideasNew} ideia(s) capturada(s) nesta semana`);
  }

  if (focusMinutes < 60 && focusSessions < 3) {
    suggested_priorities.push('Reservar 2–3 blocos de foco na próxima semana');
  }

  while (suggested_priorities.length < 3) {
    if (habitPct !== null && habitPct < 70) {
      suggested_priorities.push('Subir consistência de hábitos (meta: 70%+ na semana)');
      break;
    }
    suggested_priorities.push('Escolher uma meta da semana e quebrar em 3 tarefas concretas');
    break;
  }

  const uniquePriorities = [...new Set(suggested_priorities)].slice(0, 3);

  const patternParts = [];
  if (habitPct !== null) patternParts.push(`Hábitos em ${habitPct}% (${habitDone}/${habitSlots})`);
  if (focusMinutes > 0) patternParts.push(`${focusMinutes} min de foco em ${focusSessions} sessão(ões)`);
  if (avgMood !== null) patternParts.push(`humor médio ${avgMood}/5`);
  const pattern_summary = patternParts.length
    ? patternParts.join(' · ')
    : 'Poucos dados nesta semana — vale registrar hábitos, foco e bem-estar.';

  const bottleneckParts = [];
  if (overdueCount > 0) bottleneckParts.push(`${overdueCount} tarefa(s) atrasada(s) no radar`);
  if (topMissed.length > 0) bottleneckParts.push(`hábito mais fraco: ${topMissed[0].title}`);
  if (wellnessRows.length < 3) bottleneckParts.push('poucos check-ins de bem-estar');
  const bottleneck_summary = bottleneckParts.length
    ? bottleneckParts.join('; ')
    : 'Nenhum gargalo óbvio — mantém o ritmo.';

  const draft_highlights = [
    victoryTitles.length ? `Tarefas concluídas: ${victoryTitles.join('; ')}` : null,
    habitPct !== null && habitPct >= 70 ? `Hábitos consistentes (${habitPct}%).` : null,
    focusMinutes >= 90 ? `${focusMinutes} minutos de foco registrados.` : null,
    ideasPromoted > 0 ? `${ideasPromoted} ideia(s) viraram tarefa.` : null,
  ].filter(Boolean).join('\n') || 'Registre aqui o que você sente que funcionou.';

  const draft_blockers = [
    overdueCount > 0 ? `${overdueCount} pendência(s) atrasada(s).` : null,
    topMissed[0] ? `Hábito ${topMissed[0].title} ficou em aberto ${topMissed[0].misses}x.` : null,
    topSkipped[0] ? `${topSkipped[0].title}: não rolou ${topSkipped[0].skips}x.` : null,
    habitPct !== null && habitPct < 50 ? 'Consistência de hábitos abaixo de 50%.' : null,
  ].filter(Boolean).join('\n') || 'O que travou energia ou atenção?';

  const draft_learnings = pattern_summary;

  const draft_next_week_focus = uniquePriorities.map((p, i) => `${i + 1}. ${p}`).join('\n');

  let nutrition = null;
  try {
    nutrition = buildNutritionSummary(db, { from: weekStart, to: weekEnd });
  } catch {
    nutrition = null;
  }

  return {
    week_start: weekStart,
    week_end: weekEnd,
    generated_at: new Date().toISOString(),
    nutrition: nutrition
      ? {
          days_logged: nutrition.days_logged,
          log_count: nutrition.log_count,
          averages: nutrition.averages,
          targets: nutrition.targets,
          days_hit_protein: nutrition.days_hit_protein,
          top_foods: nutrition.top_foods?.slice(0, 5) || [],
        }
      : null,
    victories: {
      tasks_completed_count: completedTasks.length,
      tasks_completed_samples: victoryTitles,
      habits_done: habitDone,
      habits_skipped: habitSkipped,
      habits_open_slots: habitOpenSlots,
      habits_target: habitSlots,
      habits_completion_pct: habitPct,
      focus_minutes: focusMinutes,
      focus_sessions: focusSessions,
      ideas_promoted: ideasPromoted,
    },
    patterns: {
      summary: pattern_summary,
      wellness_days: wellnessRows.length,
      avg_mood: avgMood,
      avg_productivity: avgProductivity,
      avg_sleep_hours: avgSleep,
    },
    bottlenecks: {
      summary: bottleneck_summary,
      overdue_tasks_count: overdueCount,
      overdue_samples: stalePending.map((t) => cleanTitle(t.title)).filter(Boolean),
      missed_habits: topMissed,
      top_skipped: topSkipped,
      habits_skipped: habitSkipped,
    },
    ideas: {
      new_captures: ideasNew,
      promissoras_count: promissoras.length,
      promoted: ideasPromoted,
      promissora_samples: promissoras.map((i) => cleanTitle(i.title)),
    },
    suggested_priorities: uniquePriorities,
    drafts: {
      highlights: draft_highlights,
      blockers: draft_blockers,
      learnings: draft_learnings,
      next_week_focus: draft_next_week_focus,
    },
    life_history: buildLifeHistory(db, weekStart, weekEnd),
  };
}

/** Data local YYYY-MM-DD (evita depender do fuso UTC na ausência de options.today). */
function localYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normaliza título removendo prefixos P1/P2/P3 usados pelo app. */
function cleanTitleSafe(title) {
  return String(title || '').replace(/^P\d+\s*[-–—:]?\s*/i, '').trim();
}

const AREA_OF_CATEGORY = {
  rca: 'rca',
  trabalho: 'rca',
  comercial: 'rca',
  whatsapp: 'rca',
  farmacia: 'rca',
  facul: 'faculdade',
  estudo: 'faculdade',
  educacao: 'faculdade',
  treino: 'saude',
  saude: 'saude',
  nutricao: 'saude',
  fitness: 'saude',
  gofluxo: 'gofluxo',
  animalia: 'gofluxo',
  projeto: 'projetos',
  tecnologia: 'projetos',
  site: 'projetos',
  catalogo: 'projetos',
  pessoal: 'vida-pratica',
  rotina: 'vida-pratica',
  familia: 'vida-pratica',
};

function areaFor(category, slug = '') {
  const cat = (category || '').toLowerCase().trim();
  if (AREA_OF_CATEGORY[cat]) return AREA_OF_CATEGORY[cat];
  if (!slug) return 'projetos';
  if (['rca', 'fidelize', 'opella', 'nazaria'].some((k) => slug.includes(k))) return 'rca';
  // Animália é serviço de implementação da GoFluxo → agrupa na área GoFluxo.
  if (['gofluxo', 'animalia'].some((k) => slug.includes(k))) return 'gofluxo';
  if (['facul', 'unifacex', 'estudo'].some((k) => slug.includes(k))) return 'faculdade';
  return 'projetos';
}

const STOP_WORDS = new Set([
  'e', 'de', 'da', 'do', 'das', 'dos', 'para', 'com', 'ou', 'se', 'hoje',
  'quando', 'foi', 'o', 'a', 'os', 'as', 'um', 'uma', 'um', 'ter', 'quando',
]);

/** Normaliza o texto para um conjunto de tokens significativos (sem acentos/pontuação). */
function sigTokens(text) {
  let t = String(text || '')
    .toLowerCase()
    .normalize('NFD');
  t = t.replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/^P\d+\s*[-–—:]?\s*/i, '');
  t = t.replace(/conclu[ií]do[:.-]?/g, ' ');
  t = t.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return new Set(
    t.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );
}

/** Verdadeiro se dois conjuntos de tokens significativos representam a mesma coisa. */
function sameSig(A, B) {
  if (!A || !B || !A.size || !B.size) return false;
  const inter = [...A].filter((t) => B.has(t)).length;
  const aInB = inter / A.size;
  const bInA = inter / B.size;
  return aInB >= 0.8 || bInA >= 0.8;
}

function tableHas(table, db) {
  try {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(table);
    return !!row;
  } catch {
    return false;
  }
}

/**
 * Camada factual da semana: não é opinião nem cobrança. Junta avanços reais da
 * continuidade (project_updates) e tarefas concluídas, agrupando por área e em
 * uma timeline curta. Nunca muda a frente; apenas lê o que já aconteceu.
 */
function buildLifeHistory(db, weekStart, weekEnd) {
  const updates = [];
  const projectName = new Map();

  if (tableHas('projects', db)) {
    try {
      const projects = db
        .prepare('SELECT id, slug, name FROM projects')
        .all();
      for (const p of projects) projectName.set(p.id, { slug: p.slug, name: p.name });
    } catch {
      projectName.clear();
    }
  }

  if (tableHas('project_updates', db)) {
    try {
      const rows = db
        .prepare(
          `SELECT date, project_id, summary, source
           FROM project_updates
           WHERE date BETWEEN ? AND ?
           ORDER BY date ASC, created_at ASC`,
        )
        .all(weekStart, weekEnd);
      for (const r of rows) {
        const meta = projectName.get(r.project_id) || { slug: String(r.project_id), name: '' };
        updates.push({
          date: r.date,
          front: meta.slug,
          name: meta.name || meta.slug,
          summary: String(r.summary || '').trim(),
          source: r.source || 'manual',
          kind: 'continuidade',
        });
      }
    } catch {
      // tabela presente mas consulta falhou: não derruba o resumo
    }
  }

  // Tarefas concluídas na semana, excluídas ideias (fontes e amostras honestas).
  let completed = [];
  try {
    completed = db
      .prepare(
        `SELECT title, category
         FROM tasks
         WHERE status IN ('completed','done')
           AND category != 'ideias'
           AND (
             (date IS NOT NULL AND date BETWEEN ? AND ?)
             OR (completed_date IS NOT NULL AND completed_date BETWEEN ? AND ?)
           )
         ORDER BY COALESCE(completed_date, date) DESC
         LIMIT 80`,
      )
      .all(weekStart, weekEnd, weekStart, weekEnd);
  } catch {
    completed = [];
  }

  const byArea = {};
  const timeline = [];
  const seen = new Set();

  for (const u of updates) {
    const area = areaFor('', u.front);
    byArea[area] = byArea[area] || { area, count: 0, samples: [] };
    byArea[area].count += 1;
    if (byArea[area].samples.length < 4) {
      byArea[area].samples.push(u.summary || u.name);
    }
    if (timeline.length < 10) {
      timeline.push({
        date: u.date,
        front: u.front,
        name: u.name,
        text: u.summary,
        kind: u.kind,
        source: u.source,
      });
    }
  }

  const updateItems = updates.map((u) => ({
    area: areaFor('', u.front),
    sig: sigTokens(u.summary || u.name),
  }));

  for (const t of completed) {
    const area = areaFor(t.category);
    const sample = cleanTitleSafe(t.title);
    if (!sample) continue;
    const key = `${area}|${sample.toLowerCase()}`;
    if (seen.has(key)) continue;
    // Dedup: se um update da continuidade (mesma área) já "é" este entregável,
    // não conta em dobro no chip área.
    const tSig = sigTokens(sample);
    const covered = updateItems.some(
      (u) => u.area === area && u.sig.size && sameSig(u.sig, tSig),
    );
    if (covered) continue;
    seen.add(key);
    byArea[area] = byArea[area] || { area, count: 0, samples: [] };
    byArea[area].count += 1;
    if (byArea[area].samples.length < 4) byArea[area].samples.push(sample);
  }

  const summaryParts = [];
  const overallUpdates = updates.length;
  const overallTasks = completed.length;
  if (overallUpdates > 0) {
    summaryParts.push(`${overallUpdates} avanço(s) registrado(s) na continuidade`);
  }
  if (overallTasks > 0) {
    summaryParts.push(`${overallTasks} tarefa(s) concluída(s)`);
  }
  const summary =
    summaryParts.length > 0
      ? `Semana com ${summaryParts.join(' e ')}.`
      : 'Sem movimento registrado nesta semana.';
  return {
    summary,
    project_updates: updates,
    completed_by_area: Object.values(byArea).sort((a, b) => b.count - a.count),
    timeline,
  };
}