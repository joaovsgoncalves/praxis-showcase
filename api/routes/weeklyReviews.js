import { Router } from 'express';
import { randomUUID } from 'crypto';
import { mondayOf } from '../lib/week.js';

/** Weekly reviews — mounted at /api/weekly-reviews */
export function createWeeklyReviewsRouter({ db }) {
  const router = Router();

  router.get('/', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 12, 52);
    const reviews = db.prepare(
      'SELECT * FROM weekly_reviews ORDER BY week_start DESC LIMIT ?',
    ).all(limit);
    res.json(reviews);
  });

  router.get('/current', (req, res) => {
    const weekStart = mondayOf(req.query.date);
    const review = db.prepare('SELECT * FROM weekly_reviews WHERE week_start = ?').get(weekStart);
    res.json({ week_start: weekStart, review: review || null });
  });

  router.post('/', (req, res) => {
    const {
      week_start, highlights = '', blockers = '', learnings = '',
      next_week_focus = '', overall_score = 3,
    } = req.body;
    const ws = mondayOf(week_start);

    const existing = db.prepare('SELECT id FROM weekly_reviews WHERE week_start = ?').get(ws);
    if (existing) {
      db.prepare(`
        UPDATE weekly_reviews SET
          highlights = ?, blockers = ?, learnings = ?,
          next_week_focus = ?, overall_score = ?,
          updated_date = datetime('now')
        WHERE id = ?
      `).run(highlights, blockers, learnings, next_week_focus, overall_score, existing.id);
      const updated = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(existing.id);
      return res.json(updated);
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO weekly_reviews (id, week_start, highlights, blockers, learnings, next_week_focus, overall_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, ws, highlights, blockers, learnings, next_week_focus, overall_score);
    const created = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(id);
    res.status(201).json(created);
  });

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM weekly_reviews WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  return router;
}
