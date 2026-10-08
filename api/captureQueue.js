import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export const CAPTURE_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  TRANSCRIBED: 'transcribed',
  PARSED: 'parsed',
  FAILED: 'failed',
  ARCHIVED: 'archived',
};

export function initCaptureQueueSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS capture_queue (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      audio_path TEXT,
      audio_mime TEXT,
      audio_bytes INTEGER,
      transcription_id TEXT,
      transcript TEXT,
      parsed_items_json TEXT,
      error_message TEXT,
      attempt_count INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 2,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_capture_queue_status ON capture_queue(status);
  `);
  const cols = db.prepare('PRAGMA table_info(capture_queue)').all().map((c) => c.name);
  if (!cols.includes('source')) {
    db.exec("ALTER TABLE capture_queue ADD COLUMN source TEXT DEFAULT 'voice'");
  }
}

export function rowToCapture(row) {
  if (!row) return null;
  let parsed_items = [];
  if (row.parsed_items_json) {
    try {
      parsed_items = JSON.parse(row.parsed_items_json);
    } catch {
      parsed_items = [];
    }
  }
  return { ...row, parsed_items };
}

export function listCaptures(db, { status, limit = 30 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 30, 1), 100);
  if (status) {
    const statuses = String(status)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) {
      return db
        .prepare(
          `SELECT * FROM capture_queue WHERE status = ? ORDER BY updated_date DESC LIMIT ?`,
        )
        .all(statuses[0], lim)
        .map(rowToCapture);
    }
    const placeholders = statuses.map(() => '?').join(',');
    return db
      .prepare(
        `SELECT * FROM capture_queue WHERE status IN (${placeholders}) ORDER BY updated_date DESC LIMIT ?`,
      )
      .all(...statuses, lim)
      .map(rowToCapture);
  }
  return db
    .prepare(`SELECT * FROM capture_queue ORDER BY updated_date DESC LIMIT ?`)
    .all(lim)
    .map(rowToCapture);
}

export function getCapture(db, id) {
  return rowToCapture(db.prepare('SELECT * FROM capture_queue WHERE id = ?').get(id));
}

function touchCapture(db, id, fields) {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  sets.push("updated_date = datetime('now')");
  vals.push(id);
  db.prepare(`UPDATE capture_queue SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

/**
 * Run STT up to max_attempts; persists audio_path before first attempt.
 */
export async function runCaptureTranscription(db, captureId, { runLocalTranscription, startedAt = Date.now() }) {
  const row = db.prepare('SELECT * FROM capture_queue WHERE id = ?').get(captureId);
  if (!row) return { ok: false, error: 'Capture not found' };
  if (!row.audio_path || !fs.existsSync(row.audio_path)) {
    touchCapture(db, captureId, {
      status: CAPTURE_STATUSES.FAILED,
      error_message: 'Arquivo de áudio ausente no servidor.',
    });
    return { ok: false, error: 'Audio file missing', exhausted: true, capture_id: captureId };
  }

  const maxAttempts = Math.max(1, Number(row.max_attempts) || 2);
  let lastError = '';
  let attemptsUsed = Number(row.attempt_count) || 0;

  touchCapture(db, captureId, { status: CAPTURE_STATUSES.PROCESSING, error_message: null });

  while (attemptsUsed < maxAttempts) {
    attemptsUsed += 1;
    touchCapture(db, captureId, { attempt_count: attemptsUsed });
    try {
      const result = await runLocalTranscription(row.audio_path);
      const text = String(result.text || '').trim();
      if (!text) {
        lastError = 'Transcrição vazia';
        continue;
      }
      const transcriptionId = randomUUID();
      const language = result.language || 'pt';
      const durationMs = Date.now() - startedAt;
      db.prepare(`
        INSERT INTO transcriptions (id, audio_path, text, language, duration_ms)
        VALUES (?, ?, ?, ?, ?)
      `).run(transcriptionId, row.audio_path, text, language, durationMs);

      touchCapture(db, captureId, {
        status: CAPTURE_STATUSES.TRANSCRIBED,
        transcription_id: transcriptionId,
        transcript: text,
        error_message: null,
      });

      return {
        ok: true,
        capture_id: captureId,
        id: transcriptionId,
        text,
        language,
        attempts: attemptsUsed,
        success: true,
      };
    } catch (err) {
      lastError = err?.message || String(err);
      console.error(`[capture] STT attempt ${attemptsUsed}/${maxAttempts} failed:`, lastError);
    }
  }

  touchCapture(db, captureId, {
    status: CAPTURE_STATUSES.FAILED,
    error_message: lastError || 'STT falhou após todas as tentativas',
  });

  return {
    ok: false,
    capture_id: captureId,
    error: lastError || 'Transcription failed',
    detail: 'Não consegui transcrever após várias tentativas. Use Revisar capturas para tentar de novo.',
    exhausted: true,
    attempts: attemptsUsed,
  };
}

export function saveCaptureParsedItems(db, captureId, items) {
  const json = JSON.stringify(Array.isArray(items) ? items : []);
  touchCapture(db, captureId, {
    parsed_items_json: json,
    status: CAPTURE_STATUSES.PARSED,
  });
  return getCapture(db, captureId);
}

export function archiveCapture(db, captureId) {
  touchCapture(db, captureId, { status: CAPTURE_STATUSES.ARCHIVED });
  return getCapture(db, captureId);
}

/** Texto rápido (Telegram webhook, share PWA, app) — pula STT. */
export function enqueueTextCapture(db, { text, source = 'text' }) {
  const trimmed = String(text || '').trim();
  if (trimmed.length < 2) {
    return { ok: false, error: 'Text too short', code: 'text_empty' };
  }
  if (trimmed.length > 8000) {
    return { ok: false, error: 'Text too long', code: 'text_too_long' };
  }
  const captureId = randomUUID();
  const transcriptionId = randomUUID();
  db.prepare(`
    INSERT INTO transcriptions (id, audio_path, text, language, duration_ms)
    VALUES (?, '', ?, 'pt', 0)
  `).run(transcriptionId, trimmed);
  db.prepare(`
    INSERT INTO capture_queue (
      id, status, audio_path, audio_mime, audio_bytes,
      transcription_id, transcript, source, attempt_count, max_attempts
    )
    VALUES (?, ?, NULL, NULL, 0, ?, ?, ?, 0, 0)
  `).run(
    captureId,
    CAPTURE_STATUSES.TRANSCRIBED,
    transcriptionId,
    trimmed,
    source,
  );
  return {
    ok: true,
    capture_id: captureId,
    id: transcriptionId,
    text: trimmed,
    status: CAPTURE_STATUSES.TRANSCRIBED,
    source,
  };
}