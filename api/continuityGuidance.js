/**
 * Orientação diária de continuidade do Sêneca.
 * Armazenamento SQLite e leitura autenticada.
 */

import { getProject } from './projects.js';

export const ALLOWED_REASON_CODES = new Set([
  'deadline',
  'income',
  'academic',
  'client_commitment',
  'continuity',
  'basic_need',
  'manual',
]);

const ISO_TIMESTAMP_TZ_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function isValidCivilDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (m < 1 || m > 12 || d < 1 || d > 31) return false;

  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function isValidIsoTimestampWithTz(timestampStr) {
  if (typeof timestampStr !== 'string') return false;
  const trimmed = timestampStr.trim();
  const match = trimmed.match(ISO_TIMESTAMP_TZ_REGEX);
  if (!match) return false;

  const datePart = `${match[1]}-${match[2]}-${match[3]}`;
  if (!isValidCivilDate(datePart)) return false;

  const h = Number(match[4]);
  const min = Number(match[5]);
  const s = Number(match[6]);
  if (h < 0 || h > 23 || min < 0 || min > 59 || s < 0 || s > 59) return false;

  const tz = match[7];
  if (tz !== 'Z') {
    const tzH = Number(tz.slice(1, 3));
    const tzMin = Number(tz.slice(4, 6));
    if (tzH > 23 || tzMin > 59) return false;
  }

  const ts = Date.parse(trimmed);
  if (Number.isNaN(ts)) return false;

  return true;
}

export function initContinuityGuidanceSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS continuity_guidance (
      date TEXT PRIMARY KEY,
      summary TEXT NOT NULL DEFAULT '',
      priorities_json TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL DEFAULT 'seneca',
      generated_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function validateContinuityGuidance(db, payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload must be an object');
  }

  const date = typeof payload.date === 'string' ? payload.date.trim() : '';
  if (!isValidCivilDate(date)) {
    throw new Error('date must be a valid civil date in YYYY-MM-DD format');
  }

  const generatedAt = typeof payload.generated_at === 'string' ? payload.generated_at.trim() : '';
  if (!isValidIsoTimestampWithTz(generatedAt)) {
    throw new Error('generated_at must be a valid ISO 8601 timestamp with explicit timezone');
  }

  if (!Array.isArray(payload.priorities)) {
    throw new Error('priorities must be an array');
  }

  if (payload.priorities.length > 3) {
    throw new Error('priorities maximum length is 3');
  }

  const seenRanks = new Set();
  for (const item of payload.priorities) {
    if (!item || typeof item !== 'object') {
      throw new Error('priority item must be an object');
    }

    if (!Number.isInteger(item.rank) || item.rank < 1 || item.rank > 3) {
      throw new Error('rank must be an integer between 1 and 3');
    }

    if (seenRanks.has(item.rank)) {
      throw new Error('duplicate rank in priorities');
    }
    seenRanks.add(item.rank);

    if (typeof item.action !== 'string' || !item.action.trim()) {
      throw new Error('action required and cannot be empty');
    }

    if (!ALLOWED_REASON_CODES.has(item.reason_code)) {
      throw new Error(`invalid reason_code: ${item.reason_code}`);
    }

    if (typeof item.reason !== 'string' || !item.reason.trim()) {
      throw new Error('reason required and cannot be empty');
    }

    if (item.project_slug != null && String(item.project_slug).trim() !== '') {
      const slug = String(item.project_slug).trim().toLowerCase();
      const proj = getProject(db, slug);
      if (!proj) {
        throw new Error(`project_slug not found: ${slug}`);
      }
    }
  }

  return true;
}

export function upsertContinuityGuidance(db, payload) {
  validateContinuityGuidance(db, payload);

  const date = String(payload.date).trim();
  const summary = typeof payload.summary === 'string' ? payload.summary.trim() : '';
  const source = typeof payload.source === 'string' && payload.source.trim() ? payload.source.trim() : 'seneca';
  const generatedAt = String(payload.generated_at).trim();

  const sortedPriorities = [...payload.priorities]
    .sort((a, b) => a.rank - b.rank)
    .map((item) => ({
      rank: item.rank,
      action: String(item.action).trim(),
      reason_code: item.reason_code,
      reason: String(item.reason).trim(),
      project_slug: item.project_slug != null && String(item.project_slug).trim() !== ''
        ? String(item.project_slug).trim().toLowerCase()
        : null,
      task_id: item.task_id != null && String(item.task_id).trim() !== ''
        ? String(item.task_id).trim()
        : null,
    }));

  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO continuity_guidance (
        date, summary, priorities_json, source, generated_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET
        summary = excluded.summary,
        priorities_json = excluded.priorities_json,
        source = excluded.source,
        generated_at = excluded.generated_at,
        updated_at = datetime('now')
    `).run(date, summary, JSON.stringify(sortedPriorities), source, generatedAt);
  });

  run();

  return getContinuityGuidance(db, date);
}

export function getContinuityGuidance(db, date) {
  const fallback = {
    date,
    summary: '',
    generated_at: null,
    priorities: [],
    fresh: false,
  };

  const row = db.prepare('SELECT * FROM continuity_guidance WHERE date = ?').get(date);
  if (!row) {
    return fallback;
  }

  let items;
  try {
    const parsed = JSON.parse(row.priorities_json);
    if (!Array.isArray(parsed)) {
      return fallback;
    }
    items = parsed;
  } catch {
    return fallback;
  }

  const priorities = items.map((item) => {
    const p = {
      rank: item.rank,
      action: item.action,
      reason_code: item.reason_code,
      reason: item.reason,
      project_slug: item.project_slug || null,
      task_id: item.task_id || null,
    };
    if (item.project_slug) {
      const proj = getProject(db, item.project_slug);
      if (proj) {
        p.project = {
          id: proj.id,
          slug: proj.slug,
          name: proj.name,
          kind: proj.kind,
          column: proj.column,
          parent_slug: proj.parent_slug || '',
        };
      } else {
        p.project = null;
      }
    }
    return p;
  });

  return {
    date: row.date,
    summary: row.summary || '',
    generated_at: row.generated_at,
    fresh: true,
    priorities,
  };
}
