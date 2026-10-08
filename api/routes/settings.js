import { Router } from 'express';

function settingsPayload(settings) {
  return {
    id: 'default',
    full_name: settings.full_name,
    email: 'joao@praxis.local',
    avatar_url: settings.avatar_url,
    pomodoro_focus: settings.pomodoro_focus,
    pomodoro_break: settings.pomodoro_break,
    notif_habits: settings.notif_habits,
    notif_goals: settings.notif_goals,
    list_density: settings.list_density || 'comfortable',
    nutrition_enabled: settings.nutrition_enabled == null ? 1 : settings.nutrition_enabled,
    nutrition_show_on_today:
      settings.nutrition_show_on_today == null ? 1 : settings.nutrition_show_on_today,
  };
}

/** User settings — mounted at /api/user (paths: /settings) */
export function createSettingsRouter({ db }) {
  const router = Router();

  router.get('/settings', (req, res) => {
    let settings = db.prepare('SELECT * FROM user_settings WHERE id = ?').get('default');
    if (!settings) {
      db.prepare('INSERT INTO user_settings (id) VALUES (?)').run('default');
      settings = db.prepare('SELECT * FROM user_settings WHERE id = ?').get('default');
    }
    res.json(settingsPayload(settings));
  });

  router.put('/settings', (req, res) => {
    const {
      full_name,
      avatar_url,
      pomodoro_focus,
      pomodoro_break,
      notif_habits,
      notif_goals,
      list_density,
      nutrition_enabled,
      nutrition_show_on_today,
    } = req.body;

    const existing = db.prepare('SELECT id FROM user_settings WHERE id = ?').get('default');
    if (!existing) {
      db.prepare('INSERT INTO user_settings (id) VALUES (?)').run('default');
    }

    let density = list_density;
    if (density !== undefined && density !== null) {
      const d = String(density);
      if (!['compact', 'comfortable'].includes(d)) {
        return res.status(400).json({ error: 'list_density must be compact or comfortable' });
      }
      density = d;
    }

    const toFlag = (v) => {
      if (v === undefined || v === null) return null;
      if (v === true || v === 1 || v === '1') return 1;
      if (v === false || v === 0 || v === '0') return 0;
      return null;
    };
    const nutrEnabled = toFlag(nutrition_enabled);
    const nutrToday = toFlag(nutrition_show_on_today);

    db.prepare(`
      UPDATE user_settings SET
        full_name = COALESCE(?, full_name),
        avatar_url = COALESCE(?, avatar_url),
        pomodoro_focus = COALESCE(?, pomodoro_focus),
        pomodoro_break = COALESCE(?, pomodoro_break),
        notif_habits = COALESCE(?, notif_habits),
        notif_goals = COALESCE(?, notif_goals),
        list_density = COALESCE(?, list_density),
        nutrition_enabled = COALESCE(?, nutrition_enabled),
        nutrition_show_on_today = COALESCE(?, nutrition_show_on_today)
      WHERE id = 'default'
    `).run(
      full_name,
      avatar_url,
      pomodoro_focus,
      pomodoro_break,
      notif_habits,
      notif_goals,
      density ?? null,
      nutrEnabled,
      nutrToday,
    );

    const settings = db.prepare('SELECT * FROM user_settings WHERE id = ?').get('default');
    res.json(settingsPayload(settings));
  });

  return router;
}
