import { execFileSync } from 'child_process';
import { Router } from 'express';

/**
 * Google Calendar sync via `gog` CLI + /api/calendar/today.
 * Production defaults for HOME/PATH keep VPS behavior.
 */
export function createCalendarServices({ db, getLocalDateString }) {
  const FORJA_CALENDAR_SYNC_ENABLED = !['0', 'false', 'no'].includes(
    String(process.env.FORJA_CALENDAR_SYNC_ENABLED ?? '1').toLowerCase(),
  );
  const FORJA_CALENDAR_ID = process.env.FORJA_CALENDAR_ID || process.env.GOG_ACCOUNT || '';
  const FORJA_DEFAULT_TASK_DURATION_MINUTES = Math.max(
    5,
    Math.min(Number(process.env.FORJA_DEFAULT_TASK_DURATION_MINUTES) || 60, 480),
  );
  const CALENDAR_REMINDERS = (process.env.FORJA_CALENDAR_REMINDERS || 'popup:30,popup:10')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  let calendarCache = { data: null, date: null, timestamp: 0 };
  const CALENDAR_CACHE_TTL = 5 * 60 * 1000;

  function gogEnv() {
    return {
      ...process.env,
      HOME: process.env.HOME || '/root',
      PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    };
  }

  function runGogJson(args, timeout = 20000) {
    const output = execFileSync('gog', args, {
      encoding: 'utf-8',
      timeout,
      env: gogEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(output || '{}');
  }

  function fortalezaDateTime(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return null;
    const match = String(time || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-03:00`;
  }

  function formatFortalezaOffset(dateObj) {
    const shifted = new Date(dateObj.getTime() - 3 * 60 * 60 * 1000);
    const yyyy = shifted.getUTCFullYear();
    const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(shifted.getUTCDate()).padStart(2, '0');
    const hh = String(shifted.getUTCHours()).padStart(2, '0');
    const mi = String(shifted.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00-03:00`;
  }

  function taskCalendarWindow(task) {
    const start = fortalezaDateTime(task.date, task.time);
    if (!start) return null;
    const duration = Math.max(5, Math.min(Number(task.duration_minutes) || FORJA_DEFAULT_TASK_DURATION_MINUTES, 480));
    const end = formatFortalezaOffset(new Date(new Date(start).getTime() + duration * 60 * 1000));
    return { start, end };
  }

  function shouldSyncTaskToCalendar(task) {
    if (!FORJA_CALENDAR_SYNC_ENABLED) return false;
    if (!task?.date || !task?.time) return false;
    if (['completed', 'done', 'cancelled'].includes(String(task.status || '').toLowerCase())) return false;
    const today = getLocalDateString();
    // Só o dia de HOJE vira notificação no Google.
    // Atrasada, "Não hoje", amanhã e futuros ficam só no Praxis até o dia real.
    if (String(task.date) !== today) return false;
    return true;
  }

  function taskCalendarDescription(task) {
    const parts = [
      'Criado pela Praxis.',
      `Task ID: ${task.id}`,
    ];
    if (task.description) parts.push('', task.description);
    return parts.join('\n');
  }

  function buildCalendarArgs(command, task, eventId = null) {
    const window = taskCalendarWindow(task);
    if (!window) return null;
    const base = ['calendar', command, FORJA_CALENDAR_ID];
    if (eventId) base.push(eventId);
    base.push(
      '--summary', task.title,
      '--from', window.start,
      '--to', window.end,
      '--description', taskCalendarDescription(task),
      '--event-color', '6',
      '--json', '--no-input',
    );
    for (const reminder of CALENDAR_REMINDERS) base.push('--reminder', reminder);
    return base;
  }

  function invalidateCache() {
    calendarCache = { data: null, date: null, timestamp: 0 };
  }

  function syncTaskToCalendar(task) {
    if (!FORJA_CALENDAR_SYNC_ENABLED) return { skipped: true, reason: 'calendar sync disabled' };

    if (!shouldSyncTaskToCalendar(task)) {
      if (task.calendar_event_id) {
        try {
          runGogJson(['calendar', 'delete', FORJA_CALENDAR_ID, task.calendar_event_id, '--force', '--json', '--no-input']);
          db.prepare("UPDATE tasks SET calendar_event_id = NULL, updated_date = datetime('now') WHERE id = ?").run(task.id);
          invalidateCache();
          return { action: 'deleted', event_id: task.calendar_event_id };
        } catch (error) {
          return { action: 'delete_failed', event_id: task.calendar_event_id, error: error.message };
        }
      }
      return { skipped: true, reason: 'task has no date/time or is completed/cancelled' };
    }

    const existingEventId = task.calendar_event_id;
    const command = existingEventId ? 'update' : 'create';
    const args = buildCalendarArgs(command, task, existingEventId);
    if (!args) return { skipped: true, reason: 'invalid task date/time' };

    try {
      const parsed = runGogJson(args);
      const event = parsed.event || parsed;
      const eventId = event?.id || existingEventId;
      if (eventId && eventId !== existingEventId) {
        db.prepare("UPDATE tasks SET calendar_event_id = ?, updated_date = datetime('now') WHERE id = ?").run(eventId, task.id);
      }
      invalidateCache();
      return { action: command === 'create' ? 'created' : 'updated', event_id: eventId, htmlLink: event?.htmlLink || null };
    } catch (error) {
      if (existingEventId && /notFound|Not Found|404/i.test(error.message || '')) {
        try {
          const createArgs = buildCalendarArgs('create', { ...task, calendar_event_id: null });
          const parsed = runGogJson(createArgs);
          const event = parsed.event || parsed;
          if (event?.id) {
            db.prepare("UPDATE tasks SET calendar_event_id = ?, updated_date = datetime('now') WHERE id = ?").run(event.id, task.id);
          }
          invalidateCache();
          return { action: 'recreated', event_id: event?.id || null, htmlLink: event?.htmlLink || null };
        } catch (retryError) {
          return { action: 'recreate_failed', event_id: existingEventId, error: retryError.message };
        }
      }
      return { action: `${command}_failed`, event_id: existingEventId || null, error: error.message };
    }
  }

  function purgeNonTodayTasksFromGoogleCalendar() {
    if (!FORJA_CALENDAR_SYNC_ENABLED) return;
    const today = getLocalDateString();
    // Qualquer evento linkado que NÃO seja do dia operacional sai do Google
    // (atrasadas, adiadas com "Não hoje", e blocos futuros ainda não vigentes).
    const rows = db
      .prepare(
        `SELECT * FROM tasks
         WHERE calendar_event_id IS NOT NULL
         AND (
           date IS NULL OR date != ?
           OR status IN ('completed', 'done', 'cancelled')
         )`,
      )
      .all(today);
    for (const task of rows) {
      try {
        syncTaskToCalendar(task);
      } catch (err) {
        console.error('purgeNonTodayCalendar', task.id, err.message);
      }
    }
    if (rows.length) console.log(`Calendar: removed ${rows.length} non-today task event(s) from Google`);
  }

  /** Mantém nome antigo como alias — boot e scripts legados. */
  function purgeOverdueTasksFromGoogleCalendar() {
    return purgeNonTodayTasksFromGoogleCalendar();
  }

  /** Garante que pendentes COM horário de HOJE tenham evento (após meia-noite / restart). */
  function ensureTodayTasksOnCalendar() {
    if (!FORJA_CALENDAR_SYNC_ENABLED) return;
    const today = getLocalDateString();
    const rows = db
      .prepare(
        `SELECT * FROM tasks
         WHERE date = ?
         AND time IS NOT NULL AND trim(time) != ''
         AND status NOT IN ('completed', 'done', 'cancelled')
         AND category != 'ideias'`,
      )
      .all(today);
    let synced = 0;
    for (const task of rows) {
      try {
        const result = syncTaskToCalendar(task);
        if (result && (result.action === 'created' || result.action === 'updated' || result.action === 'recreated')) {
          synced += 1;
        }
      } catch (err) {
        console.error('ensureTodayCalendar', task.id, err.message);
      }
    }
    if (synced) console.log(`Calendar: synced ${synced} today task event(s) to Google`);
  }

  function runCalendarMaintenance() {
    purgeNonTodayTasksFromGoogleCalendar();
    ensureTodayTasksOnCalendar();
  }

  /** Router mounted at /api/calendar */
  function createCalendarRouter() {
    const router = Router();

    router.get('/today', (req, res) => {
      try {
        const now = new Date();
        const todayDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });

        if (
          calendarCache.data
          && calendarCache.date === todayDate
          && (now.getTime() - calendarCache.timestamp) < CALENDAR_CACHE_TTL
        ) {
          return res.json(calendarCache.data);
        }

        const fromTime = `${todayDate}T00:00:00-03:00`;
        const toTime = `${todayDate}T23:59:59-03:00`;

        const parsed = runGogJson([
          'calendar', 'list', FORJA_CALENDAR_ID,
          '--from', fromTime,
          '--to', toTime,
          '--json', '--no-input',
        ], 15000);
        const events = (parsed.events || []).map(ev => ({
          title: ev.summary || '(Sem título)',
          start: ev.start?.dateTime || ev.start?.date || null,
          end: ev.end?.dateTime || ev.end?.date || null,
          location: ev.location || null,
          htmlLink: ev.htmlLink || null,
        }));

        calendarCache = { data: events, date: todayDate, timestamp: now.getTime() };
        res.json(events);
      } catch (error) {
        console.error('Calendar fetch error:', error.message);
        if (
          calendarCache.data
          && calendarCache.date === new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' })
        ) {
          return res.json(calendarCache.data);
        }
        res.json([]);
      }
    });

    return router;
  }

  return {
    syncTaskToCalendar,
    purgeOverdueTasksFromGoogleCalendar,
    purgeNonTodayTasksFromGoogleCalendar,
    ensureTodayTasksOnCalendar,
    runCalendarMaintenance,
    shouldSyncTaskToCalendar,
    createCalendarRouter,
  };
}
