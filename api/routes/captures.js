import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  listCaptures,
  getCapture,
  runCaptureTranscription,
  saveCaptureParsedItems,
  archiveCapture,
  CAPTURE_STATUSES,
  enqueueTextCapture,
} from '../captureQueue.js';

/**
 * Voice capture + STT routes.
 * Registers absolute paths: /api/transcribe, /api/captures/*, /api/webhooks/capture-text
 * Production paths for TRANSCRIBE_PYTHON default remain ./data
 */
export function registerCaptureRoutes(app, { db, apiDir }) {
  const UPLOAD_DIR = '/tmp/forja-uploads/';
  const CAPTURE_DIR = path.join(apiDir, 'uploads', 'captures');
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(CAPTURE_DIR, { recursive: true });
  } catch {}
  const ALLOWED_AUDIO_MIME_TYPES = new Set([
    'audio/webm',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/ogg',
    'video/webm',
  ]);
  const upload = multer({
    dest: UPLOAD_DIR,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for short voice captures
    fileFilter: (req, file, cb) => {
      if (!file?.mimetype || ALLOWED_AUDIO_MIME_TYPES.has(file.mimetype)) return cb(null, true);
      cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    },
  });
  let activeTranscriptions = 0;
  const MAX_ACTIVE_TRANSCRIPTIONS = Number(process.env.FORJA_MAX_ACTIVE_TRANSCRIPTIONS || 1);
  const TRANSCRIBE_TIMEOUT_MS = Number(process.env.FORJA_TRANSCRIBE_TIMEOUT_MS || 120000);
  const TRANSCRIBE_PYTHON = process.env.FORJA_TRANSCRIBE_PYTHON || './data';
  const CAPTURE_WEBHOOK_SECRET = String(process.env.PRAXIS_CAPTURE_WEBHOOK_SECRET || '').trim();


  function safeUnlink(filePath) {
    if (!filePath) return;
    try { fs.unlinkSync(filePath); } catch {}
  }

  function runLocalTranscription(audioPath) {
    const scriptPath = path.join(apiDir, 'transcribe_audio.py');
    return new Promise((resolve, reject) => {
      execFile(
        TRANSCRIBE_PYTHON,
        [scriptPath, audioPath],
        {
          encoding: 'utf-8',
          timeout: TRANSCRIBE_TIMEOUT_MS,
          env: {
            ...process.env,
            HOME: process.env.HOME || '/root',
          },
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout) => {
          if (error) {
            return reject(error);
          }
          try {
            const parsed = JSON.parse(stdout || '{}');
            resolve(parsed);
          } catch (parseError) {
            reject(parseError);
          }
        }
      );
    });
  }

  // ==================== TRANSCRIPTION ====================
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    const startedAt = Date.now();
    let audioPath = null;
    let transcriptionSlotAcquired = false;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      if (activeTranscriptions >= MAX_ACTIVE_TRANSCRIPTIONS) {
        return res.status(429).json({ error: 'Transcription busy. Tente de novo em instantes.' });
      }

      activeTranscriptions += 1;
      transcriptionSlotAcquired = true;
      audioPath = req.file.path;

      let result;
      try {
        result = await runLocalTranscription(audioPath);
      } catch (sttError) {
        console.error('Local STT error:', sttError.message);
        return res.status(503).json({
          error: 'STT backend not configured or failed',
          detail: 'A transcrição local da Praxis ainda não está disponível neste servidor.',
        });
      }

      const text = String(result.text || '').trim();
      const language = result.language || 'pt';
      if (!text) {
        return res.status(422).json({ error: 'Empty transcription' });
      }

      const id = randomUUID();
      db.prepare(`
        INSERT INTO transcriptions (id, audio_path, text, language, duration_ms)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, null, text, language, Date.now() - startedAt);

      res.json({
        id,
        text,
        language,
        success: true,
      });
    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ error: 'Transcription failed' });
    } finally {
      if (transcriptionSlotAcquired) activeTranscriptions = Math.max(0, activeTranscriptions - 1);
      safeUnlink(audioPath);
    }
  });

  function audioExtensionForMime(mime) {
    if (!mime) return 'webm';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
    return 'webm';
  }

  function persistCaptureAudio(tempPath, captureId, mime) {
    const ext = audioExtensionForMime(mime);
    const destPath = path.join(CAPTURE_DIR, `${captureId}.${ext}`);
    fs.copyFileSync(tempPath, destPath);
    return destPath;
  }

  // ==================== CAPTURE QUEUE (voz) ====================
  app.get('/api/captures', (req, res) => {
    const status = req.query.status || 'failed,transcribed,parsed';
    const limit = req.query.limit || 30;
    res.json(listCaptures(db, { status, limit }));
  });

  app.get('/api/captures/pending-count', (req, res) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS n FROM capture_queue WHERE status IN ('failed', 'transcribed', 'parsed')`,
      )
      .get();
    res.json({ count: row?.n || 0 });
  });

  app.get('/api/captures/:id', (req, res) => {
    const cap = getCapture(db, req.params.id);
    if (!cap) return res.status(404).json({ error: 'Capture not found' });
    res.json(cap);
  });

  app.post('/api/captures', upload.single('audio'), async (req, res) => {
    const startedAt = Date.now();
    let tempPath = null;
    let slot = false;
    try {
      if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
      if (activeTranscriptions >= MAX_ACTIVE_TRANSCRIPTIONS) {
        return res.status(429).json({ error: 'Transcription busy. Tente de novo em instantes.' });
      }
      activeTranscriptions += 1;
      slot = true;
      tempPath = req.file.path;

      const captureId = randomUUID();
      const destPath = persistCaptureAudio(tempPath, captureId, req.file.mimetype);
      safeUnlink(tempPath);
      tempPath = null;

      db.prepare(`
        INSERT INTO capture_queue (id, status, audio_path, audio_mime, audio_bytes, attempt_count, max_attempts)
        VALUES (?, ?, ?, ?, ?, 0, 2)
      `).run(
        captureId,
        CAPTURE_STATUSES.PENDING,
        destPath,
        req.file.mimetype || 'audio/webm',
        req.file.size || 0,
      );

      const result = await runCaptureTranscription(db, captureId, {
        runLocalTranscription,
        startedAt,
      });

      if (!result.ok) {
        const status = result.exhausted ? 503 : 422;
        return res.status(status).json(result);
      }
      return res.json(result);
    } catch (error) {
      console.error('Capture enqueue error:', error);
      return res.status(500).json({ error: 'Capture failed', detail: error.message });
    } finally {
      if (slot) activeTranscriptions = Math.max(0, activeTranscriptions - 1);
      safeUnlink(tempPath);
    }
  });

  function handleTextCapture(req, res, source) {
    const body = req.body || {};
    const text =
      body.text
      ?? body.message
      ?? (body.title && body.url ? `${body.title}\n${body.url}` : null)
      ?? body.title
      ?? '';
    const result = enqueueTextCapture(db, {
      text,
      source: body.source || source,
    });
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.status(201).json(result);
  }

  app.post('/api/captures/text', (req, res) => {
    return handleTextCapture(req, res, 'app');
  });

  app.post('/api/webhooks/capture-text', (req, res) => {
    if (!CAPTURE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Webhook not configured', code: 'webhook_disabled' });
    }
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : String(req.headers['x-praxis-capture-token'] || '');
    if (!token || token !== CAPTURE_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized', code: 'webhook_unauthorized' });
    }
    return handleTextCapture(req, res, 'telegram');
  });

  app.post('/api/captures/:id/retry', async (req, res) => {
    const startedAt = Date.now();
    let slot = false;
    try {
      const cap = getCapture(db, req.params.id);
      if (!cap) return res.status(404).json({ error: 'Capture not found' });
      if (activeTranscriptions >= MAX_ACTIVE_TRANSCRIPTIONS) {
        return res.status(429).json({ error: 'Transcription busy. Tente de novo em instantes.' });
      }
      activeTranscriptions += 1;
      slot = true;
      db.prepare(
        `UPDATE capture_queue SET attempt_count = 0, error_message = NULL, updated_date = datetime('now') WHERE id = ?`,
      ).run(req.params.id);

      const result = await runCaptureTranscription(db, req.params.id, {
        runLocalTranscription,
        startedAt,
      });
      if (!result.ok) {
        return res.status(result.exhausted ? 503 : 422).json(result);
      }
      return res.json(result);
    } catch (error) {
      console.error('Capture retry error:', error);
      return res.status(500).json({ error: 'Retry failed', detail: error.message });
    } finally {
      if (slot) activeTranscriptions = Math.max(0, activeTranscriptions - 1);
    }
  });

  app.patch('/api/captures/:id', (req, res) => {
    const cap = getCapture(db, req.params.id);
    if (!cap) return res.status(404).json({ error: 'Capture not found' });
    const { parsed_items: parsedItems, status } = req.body || {};
    if (parsedItems !== undefined) {
      return res.json(saveCaptureParsedItems(db, req.params.id, parsedItems));
    }
    if (status === CAPTURE_STATUSES.ARCHIVED) {
      return res.json(archiveCapture(db, req.params.id));
    }
    return res.status(400).json({ error: 'Nothing to update' });
  });


}
