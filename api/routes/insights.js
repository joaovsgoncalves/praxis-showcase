import { Router } from 'express';
import { buildWeeklyInsights } from '../lib/weeklyInsights.js';
import { buildAvoidanceInsights, buildRuleBasedPraxiaMirror } from '../lib/avoidanceInsights.js';
import { mondayOf } from '../lib/week.js';

/**
 * Insights router — mounted at /api/insights
 * Also exports registerPraxiaRoutes for POST /api/praxia/confront
 */
export function createInsightsRouter({ db, getLocalDateString }) {
  const router = Router();

  router.get('/best-hours', (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString();

      const sessions = db.prepare(`
        SELECT * FROM focus_sessions
        WHERE created_date >= ?
        ORDER BY created_date DESC
      `).all(cutoffDate);

      if (sessions.length < 3) {
        return res.json({
          best_hours: [],
          summary: 'Preciso de mais sessões de foco para sugerir horários',
          total_sessions: sessions.length,
        });
      }

      const hourMap = {};
      for (const session of sessions) {
        if (!session.created_date) continue;
        const d = new Date(session.created_date);
        if (isNaN(d.getTime())) continue;
        const hour = d.getHours();
        if (!hourMap[hour]) {
          hourMap[hour] = { hour, total_minutes: 0, sessions: 0 };
        }
        hourMap[hour].total_minutes += Math.round((session.duration_seconds || 0) / 60);
        hourMap[hour].sessions += 1;
      }

      const hourEntries = Object.values(hourMap)
        .map(h => ({
          hour: h.hour,
          label: String(h.hour).padStart(2, '0') + ':00',
          total_minutes: h.total_minutes,
          sessions: h.sessions,
        }))
        .sort((a, b) => b.total_minutes - a.total_minutes);

      const bestHours = hourEntries.slice(0, 3);

      let summary = 'Preciso de mais sessões de foco para sugerir horários';
      if (bestHours.length >= 2) {
        const hours = bestHours.map(h => h.hour).sort((a, b) => a - b);
        const hourLabels = hours.map(h => h + 'h');
        summary = `Seus melhores horários de foco são ${hourLabels.join('-')}`;
      } else if (bestHours.length === 1) {
        summary = `Seu melhor horário de foco é ${bestHours[0].hour}h`;
      }

      res.json({
        best_hours: bestHours,
        summary,
        total_sessions: sessions.length,
      });
    } catch (error) {
      console.error('Best hours insights error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/correlation', (req, res) => {
    try {
      const days = Math.min(Number(req.query.days) || 60, 180);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const wellnessRows = db.prepare(
        'SELECT date, sleep_hours, sleep_quality, mood, productivity FROM wellness_checks WHERE date >= ? ORDER BY date ASC',
      ).all(cutoffStr);

      if (wellnessRows.length < 5) {
        return res.json({
          enough_data: false,
          message: 'Preciso de pelo menos 5 dias com check-in de bem-estar para comparar.',
          days_analyzed: wellnessRows.length,
        });
      }

      const activeHabitsCount = db.prepare("SELECT COUNT(*) as c FROM habits WHERE status = 'active'").get().c;
      if (activeHabitsCount === 0) {
        return res.json({
          enough_data: false,
          message: 'Nenhum hábito ativo para correlacionar.',
          days_analyzed: wellnessRows.length,
        });
      }

      const high = { mood: 0, sleep_hours: 0, productivity: 0, count: 0 };
      const low = { mood: 0, sleep_hours: 0, productivity: 0, count: 0 };

      for (const w of wellnessRows) {
        const completed = db.prepare(
          `SELECT COUNT(DISTINCT habit_id) as c FROM habit_logs
           WHERE date = ? AND completed = 1
           AND habit_id IN (SELECT id FROM habits WHERE status = 'active')`,
        ).get(w.date).c;
        const rate = completed / activeHabitsCount;
        const bucket = rate >= 0.8 ? high : low;
        bucket.mood += w.mood || 0;
        bucket.sleep_hours += w.sleep_hours || 0;
        bucket.productivity += w.productivity || 0;
        bucket.count += 1;
      }

      const avg = (b) => b.count === 0 ? null : {
        mood: +(b.mood / b.count).toFixed(2),
        sleep_hours: +(b.sleep_hours / b.count).toFixed(2),
        productivity: +(b.productivity / b.count).toFixed(2),
        days: b.count,
      };

      const highAvg = avg(high);
      const lowAvg = avg(low);

      let insight = null;
      if (highAvg && lowAvg) {
        insight = {
          mood_delta: +(highAvg.mood - lowAvg.mood).toFixed(2),
          sleep_delta: +(highAvg.sleep_hours - lowAvg.sleep_hours).toFixed(2),
          productivity_delta: +(highAvg.productivity - lowAvg.productivity).toFixed(2),
        };
      }

      res.json({
        enough_data: true,
        days_analyzed: wellnessRows.length,
        high_completion: highAvg,
        low_completion: lowAvg,
        insight,
      });
    } catch (error) {
      console.error('Correlation insights error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/weekly', (req, res) => {
    try {
      const weekStart = mondayOf(req.query.week_start || req.query.date);
      const payload = buildWeeklyInsights(db, weekStart, { today: getLocalDateString() });
      res.json(payload);
    } catch (error) {
      console.error('Weekly insights error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/avoidance', (req, res) => {
    try {
      const today = req.query.date || getLocalDateString();
      const payload = buildAvoidanceInsights(db, today);
      res.json(payload);
    } catch (error) {
      console.error('Avoidance insights error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export function registerPraxiaRoutes(app, { db, getLocalDateString, openaiApiKey }) {
  app.post('/api/praxia/confront', async (req, res) => {
    try {
      const today = req.body?.date || getLocalDateString();
      const note = String(req.body?.note || '').trim().slice(0, 500);
      const avoidance = buildAvoidanceInsights(db, today);
      const rulesMirror = buildRuleBasedPraxiaMirror(avoidance);

      if (!openaiApiKey) {
        return res.json({ ...rulesMirror, avoidance_headline: avoidance.headline });
      }

      try {
        const context = [
          `Data: ${today}`,
          avoidance.headline,
          ...avoidance.bullets.slice(0, 6),
          note ? `Nota do usuário: ${note}` : '',
        ].filter(Boolean).join('\n');

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: process.env.FORJA_PRAXIA_MODEL || process.env.FORJA_PARSE_MODEL || 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Você é a PraxIA, copiloto da Praxis. Tom: direto, parceiro, português BR, sem firula.
Não decide pelo usuário. Espelha padrões de evitação com gentileza e confronto honesto.
Responda APENAS JSON: {"lines": ["...", "..."]} com 3 a 5 frases curtas.
Sem listas numeradas dentro das strings. Sem emoji.`,
              },
              { role: 'user', content: context },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
          }),
        });

        if (openaiRes.ok) {
          const data = await openaiRes.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          const lines = Array.isArray(parsed.lines)
            ? parsed.lines.map((s) => String(s).trim()).filter(Boolean).slice(0, 5)
            : [];
          if (lines.length) {
            return res.json({
              source: 'llm',
              lines,
              avoidance_headline: avoidance.headline,
            });
          }
        } else {
          console.error('PraxIA LLM failed:', await openaiRes.text());
        }
      } catch (llmErr) {
        console.error('PraxIA confront error:', llmErr.message);
      }

      res.json({ ...rulesMirror, avoidance_headline: avoidance.headline });
    } catch (error) {
      console.error('PraxIA confront error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
