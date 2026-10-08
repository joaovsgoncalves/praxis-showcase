import { Router } from 'express';
import { randomUUID } from 'crypto';

/** Wellness router — mounted at /api/wellness */
export function createWellnessRouter(ctx) {
  const { db } = ctx;
  const router = Router();

  // ==================== WELLNESS ====================
  router.get('/', (req, res) => {
    const { date } = req.query;
    let query = 'SELECT * FROM wellness_checks';
    const params = [];

    if (date) { query += ' WHERE date = ?'; params.push(date); }
    query += ' ORDER BY date DESC LIMIT 30';

    const checks = db.prepare(query).all(...params);
    res.json(checks);
  });

  router.post('/', (req, res) => {
    const id = randomUUID();
    const { date, sleep_hours = 7, sleep_quality = 3, mood = 3, productivity = 3, note = '' } = req.body;

    if (!date) return res.status(400).json({ error: 'date required' });

    // Upsert: update if exists for this date
    const existing = db.prepare('SELECT id FROM wellness_checks WHERE date = ?').get(date);
    if (existing) {
      db.prepare(`
        UPDATE wellness_checks SET 
          sleep_hours = ?, sleep_quality = ?, mood = ?, productivity = ?, note = ?
        WHERE id = ?
      `).run(sleep_hours, sleep_quality, mood, productivity, note, existing.id);
      const updated = db.prepare('SELECT * FROM wellness_checks WHERE id = ?').get(existing.id);
      return res.json(updated);
    }

    db.prepare(`
      INSERT INTO wellness_checks (id, date, sleep_hours, sleep_quality, mood, productivity, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, sleep_hours, sleep_quality, mood, productivity, note);

    const check = db.prepare('SELECT * FROM wellness_checks WHERE id = ?').get(id);
    res.status(201).json(check);
  });

  return router;
}
