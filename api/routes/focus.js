import { Router } from 'express';
import { randomUUID } from 'crypto';

/** Focus sessions — mounted at /api/focus (includes /stats). */
export function createFocusRouter({ db }) {
  const router = Router();

  router.get('/', (req, res) => {
    const { date } = req.query;
    let query = 'SELECT * FROM focus_sessions';
    const params = [];

    if (date) { query += ' WHERE date = ?'; params.push(date); }
    query += ' ORDER BY created_date DESC LIMIT 50';

    const sessions = db.prepare(query).all(...params);
    res.json(sessions);
  });

  router.post('/', (req, res) => {
    const id = randomUUID();
    const { task_id, task_title, date, duration_seconds } = req.body;

    db.prepare(`
      INSERT INTO focus_sessions (id, task_id, task_title, date, duration_seconds)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, task_id || null, task_title || null, date || new Date().toISOString().split('T')[0], duration_seconds || 0);

    const session = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id);
    res.status(201).json(session);
  });

  // GET /api/focus/stats?days=30
  router.get('/stats', (req, res) => {
    try {
      const days = Number(req.query.days) || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffISO = cutoff.toISOString();

      const rows = db.prepare(`
        SELECT
          task_id,
          COALESCE(MAX(task_title), '(sem tarefa)') AS task_title,
          SUM(duration_seconds) AS total_seconds,
          COUNT(*) AS sessions
        FROM focus_sessions
        WHERE created_date >= ?
        GROUP BY task_id, task_title
        ORDER BY total_seconds DESC
        LIMIT 20
      `).all(cutoffISO);

      res.json(rows.map(r => ({
        task_id: r.task_id,
        task_title: r.task_title,
        total_seconds: r.total_seconds || 0,
        total_minutes: Math.round((r.total_seconds || 0) / 60),
        sessions: r.sessions,
      })));
    } catch (error) {
      console.error('Focus stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
