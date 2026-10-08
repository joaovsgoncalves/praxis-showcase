/** Schema init + migrations for Praxis praxis.db (idempotent, production-safe). */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Resolve o arquivo do banco preferindo praxis.db. Se ele não existir mas o
 * legado forja.db existir, faz uma cópia fria (arquivo principal + sidecars
 * WAL/SHM) para praxis.db na inicialização — antes de qualquer conexão ser
 * aberta — preservando forja.db como backup. Migração transparente, sem perda.
 */
export function resolveDbPath(dir, { legacyName = 'forja.db', targetName = 'praxis.db' } = {}) {
  const targetPath = path.join(dir, targetName);
  const legacyPath = path.join(dir, legacyName);

  if (fs.existsSync(targetPath)) return targetPath;

  if (fs.existsSync(legacyPath)) {
    for (const suffix of ['', '-wal', '-shm']) {
      const from = legacyPath + suffix;
      if (fs.existsSync(from)) fs.copyFileSync(from, targetPath + suffix);
    }
    return targetPath;
  }

  return targetPath;
}

function stripPriorityPrefix(title) {
  if (typeof title !== 'string') return title;
  const cleaned = title.replace(/^\s*P\d+\s*(?:[—–-]|:|\.)\s*/i, '').trim();
  return cleaned || title.trim();
}

function nextSortOrder(db, table) {
  if (!['tasks', 'habits'].includes(table)) throw new Error('Invalid sortable table');
  const row = db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM ${table}`).get();
  return Number(row?.next_order || 0);
}

function backfillSortOrder(db, table) {
  if (!['tasks', 'habits'].includes(table)) throw new Error('Invalid sortable table');
  const rows = db.prepare(`SELECT id FROM ${table} WHERE sort_order IS NULL ORDER BY created_date DESC, id DESC`).all();
  if (rows.length === 0) return;
  const start = nextSortOrder(db, table);
  const update = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  const run = db.transaction((items) => {
    items.forEach((row, index) => update.run(start + index, row.id));
  });
  run(rows);
}

function cleanPriorityTitlePrefixes(db, table) {
  if (!['tasks', 'habits'].includes(table)) throw new Error('Invalid title table');
  const rows = db.prepare(`SELECT id, title FROM ${table}`).all();
  const statement = table === 'tasks'
    ? db.prepare("UPDATE tasks SET title = ?, updated_date = datetime('now') WHERE id = ?")
    : db.prepare('UPDATE habits SET title = ? WHERE id = ?');
  const run = db.transaction((items) => {
    for (const row of items) {
      const cleaned = stripPriorityPrefix(row.title);
      if (cleaned !== row.title) statement.run(cleaned, row.id);
    }
  });
  run(rows);
}

/**
 * Convert active legacy sequences into compound habits. The transaction and
 * source marker make this safe to run on every boot.
 */
export function migrateActiveRitualsToCompoundHabits(db) {
  const activeRituals = db.prepare(`
    SELECT * FROM rituals
    WHERE status = 'active'
    ORDER BY created_date ASC, id ASC
  `).all();
  if (activeRituals.length === 0) return 0;

  const findCompound = db.prepare(
    "SELECT * FROM habits WHERE source = ? AND kind = 'compound' LIMIT 1",
  );
  const insertCompound = db.prepare(`
    INSERT INTO habits (
      id, title, description, emoji, frequency, category, streak_target, source,
      status, sort_order, kind, parent_id, position_in_parent
    )
    VALUES (?, ?, '', ?, 'daily', 'wellness', 30, ?, 'active', ?, 'compound', NULL, NULL)
  `);
  const findHabit = db.prepare('SELECT id, kind FROM habits WHERE id = ?');
  const attachChild = db.prepare(`
    UPDATE habits
    SET kind = 'simple', parent_id = ?, position_in_parent = ?
    WHERE id = ?
  `);
  const markMigrated = db.prepare("UPDATE rituals SET status = 'migrated' WHERE id = ?");

  const migrate = db.transaction((rows) => {
    let migrated = 0;
    let nextOrder = nextSortOrder(db, 'habits');

    for (const ritual of rows) {
      const source = `ritual_migration:${ritual.id}`;
      let compound = findCompound.get(source);
      if (!compound) {
        const id = randomUUID();
        insertCompound.run(
          id,
          ritual.name,
          ritual.emoji || '',
          source,
          nextOrder,
        );
        nextOrder += 1;
        compound = { id };
      }

      let habitIds = [];
      try {
        const parsed = JSON.parse(ritual.habits_order || '[]');
        if (Array.isArray(parsed)) habitIds = parsed;
      } catch {
        habitIds = [];
      }

      [...new Set(habitIds.map(String))].forEach((habitId, index) => {
        const child = findHabit.get(habitId);
        if (!child || child.kind === 'compound' || child.id === compound.id) return;
        attachChild.run(compound.id, index, child.id);
      });

      markMigrated.run(ritual.id);
      migrated += 1;
    }

    return migrated;
  });

  return migrate(activeRituals);
}

/**
 * Create core tables, seed defaults, run additive migrations.
 * Does not open the DB or change journal mode — caller owns that.
 */
export function initializeDatabase(db) {
  // Create tables
  db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    category TEXT DEFAULT 'pessoal',
    goal_id TEXT,
    source TEXT DEFAULT 'manual',
    duration_minutes INTEGER,
    calendar_event_id TEXT,
    sort_order INTEGER,
    completed_date TEXT,
    completed_at TEXT,
    created_date TEXT DEFAULT (datetime('now')),
    updated_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    frequency TEXT DEFAULT 'daily',
    category TEXT DEFAULT 'pessoal',
    streak_target INTEGER DEFAULT 30,
    goal_id TEXT,
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'active',
    sort_order INTEGER,
    kind TEXT DEFAULT 'simple',
    parent_id TEXT,
    position_in_parent INTEGER,
    emoji TEXT DEFAULT '',
    tracking_mode TEXT DEFAULT 'check',
    since_date TEXT DEFAULT '',
    quick_increment REAL,
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (habit_id) REFERENCES habits(id)
  );

  CREATE TABLE IF NOT EXISTS wellness_checks (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    sleep_hours REAL DEFAULT 7,
    sleep_quality INTEGER DEFAULT 3,
    mood INTEGER DEFAULT 3,
    productivity INTEGER DEFAULT 3,
    note TEXT DEFAULT '',
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    task_title TEXT,
    date TEXT,
    duration_seconds INTEGER,
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transcriptions (
    id TEXT PRIMARY KEY,
    audio_path TEXT,
    text TEXT,
    language TEXT DEFAULT 'pt',
    duration_ms INTEGER,
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    deadline TEXT,
    timeframe TEXT DEFAULT 'short',
    category TEXT DEFAULT 'personal',
    status TEXT DEFAULT 'active',
    manual_progress INTEGER DEFAULT 0,
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    full_name TEXT DEFAULT 'João Victor',
    avatar_url TEXT,
    pomodoro_focus INTEGER DEFAULT 25,
    pomodoro_break INTEGER DEFAULT 5,
    notif_habits INTEGER DEFAULT 1,
    notif_goals INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS rituals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '🔗',
    time_of_day TEXT DEFAULT 'morning',
    habits_order TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    created_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gamification (
    id TEXT PRIMARY KEY DEFAULT 'main',
    xp_total INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    updated_date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    xp_reward INTEGER DEFAULT 0,
    unlocked_date TEXT
  );

  CREATE TABLE IF NOT EXISTS weekly_reviews (
    id TEXT PRIMARY KEY,
    week_start TEXT NOT NULL UNIQUE,
    highlights TEXT DEFAULT '',
    blockers TEXT DEFAULT '',
    learnings TEXT DEFAULT '',
    next_week_focus TEXT DEFAULT '',
    overall_score INTEGER DEFAULT 3,
    created_date TEXT DEFAULT (datetime('now')),
    updated_date TEXT DEFAULT (datetime('now'))
  );
`);

  // Ensure default user settings row exists
  // Ensure default user settings row exists
const settingsRow = db.prepare('SELECT id FROM user_settings WHERE id = ?').get('default');
if (!settingsRow) {
  db.prepare('INSERT INTO user_settings (id) VALUES (?)').run('default');
}

// Ensure default gamification row exists
const gamRow = db.prepare('SELECT id FROM gamification WHERE id = ?').get('main');
if (!gamRow) {
  db.prepare('INSERT INTO gamification (id) VALUES (?)').run('main');
}

// Insert default achievements
const defaultAchievements = [
  { id: 'first_task', name: 'Primeira Tarefa', description: 'Complete 1 tarefa', emoji: '🎯', xp_reward: 10 },
  { id: 'on_fire', name: 'Em Chamas', description: '7 dias de streak', emoji: '🔥', xp_reward: 50 },
  { id: 'diamond', name: 'Diamante', description: '30 dias de streak', emoji: '💎', xp_reward: 200 },
  { id: 'centurion', name: 'Centurião', description: '100 tarefas completas', emoji: '🏆', xp_reward: 100 },
  { id: 'focus_master', name: 'Mestre do Foco', description: '10h de foco total', emoji: '⏱️', xp_reward: 50 },
  { id: 'early_bird', name: 'Madrugador', description: 'Rotina matinal 5x', emoji: '🌅', xp_reward: 30 },
  { id: 'balanced', name: 'Equilibrado', description: '7 dias de wellness streak', emoji: '🧘', xp_reward: 50 },
  { id: 'creator', name: 'Criador', description: '10 tarefas jotav_fit', emoji: '📸', xp_reward: 50 },
];
const insertAchievement = db.prepare(
  'INSERT OR IGNORE INTO achievements (id, name, description, emoji, xp_reward) VALUES (?, ?, ?, ?, ?)'
);
for (const a of defaultAchievements) {
  insertAchievement.run(a.id, a.name, a.description, a.emoji, a.xp_reward);
}

  // Migrate + backfill
  // Migrate: add category column to habits if missing
const habitsCols = db.prepare("PRAGMA table_info(habits)").all().map(c => c.name);
if (!habitsCols.includes('category')) {
  db.exec("ALTER TABLE habits ADD COLUMN category TEXT DEFAULT 'pessoal'");
}
if (!habitsCols.includes('streak_target')) {
  db.exec("ALTER TABLE habits ADD COLUMN streak_target INTEGER DEFAULT 30");
}
if (!habitsCols.includes('goal_id')) {
  db.exec("ALTER TABLE habits ADD COLUMN goal_id TEXT");
}
if (!habitsCols.includes('source')) {
  db.exec("ALTER TABLE habits ADD COLUMN source TEXT DEFAULT 'manual'");
}
if (!habitsCols.includes('sort_order')) {
  db.exec("ALTER TABLE habits ADD COLUMN sort_order INTEGER");
}
// Re-fetch after prior alters
const habitsCols2 = db.prepare("PRAGMA table_info(habits)").all().map(c => c.name);
if (!habitsCols2.includes('recurrence_days')) {
  db.exec("ALTER TABLE habits ADD COLUMN recurrence_days TEXT DEFAULT '[]'");
}
if (!habitsCols2.includes('target_value')) {
  db.exec('ALTER TABLE habits ADD COLUMN target_value REAL');
}
if (!habitsCols2.includes('unit')) {
  db.exec("ALTER TABLE habits ADD COLUMN unit TEXT DEFAULT ''");
}
if (!habitsCols2.includes('preferred_time')) {
  db.exec("ALTER TABLE habits ADD COLUMN preferred_time TEXT DEFAULT ''");
}
if (!habitsCols2.includes('kind')) {
  db.exec("ALTER TABLE habits ADD COLUMN kind TEXT DEFAULT 'simple'");
}
if (!habitsCols2.includes('parent_id')) {
  db.exec('ALTER TABLE habits ADD COLUMN parent_id TEXT');
}
if (!habitsCols2.includes('position_in_parent')) {
  db.exec('ALTER TABLE habits ADD COLUMN position_in_parent INTEGER');
}
if (!habitsCols2.includes('emoji')) {
  db.exec("ALTER TABLE habits ADD COLUMN emoji TEXT DEFAULT ''");
}
if (!habitsCols2.includes('tracking_mode')) {
  db.exec("ALTER TABLE habits ADD COLUMN tracking_mode TEXT DEFAULT 'check'");
}
if (!habitsCols2.includes('since_date')) {
  db.exec("ALTER TABLE habits ADD COLUMN since_date TEXT DEFAULT ''");
}
const addedQuickIncrement = !habitsCols2.includes('quick_increment');
if (addedQuickIncrement) {
  db.exec('ALTER TABLE habits ADD COLUMN quick_increment REAL');
}
db.prepare(`
  UPDATE habits SET tracking_mode = 'check'
  WHERE tracking_mode IS NULL OR tracking_mode = ''
`).run();
db.prepare(`
  UPDATE habits
  SET emoji = description, description = ''
  WHERE kind = 'compound'
    AND source LIKE 'ritual_migration:%'
    AND COALESCE(emoji, '') = ''
    AND COALESCE(description, '') != ''
`).run();
db.prepare(`
  UPDATE habits SET kind = 'simple'
  WHERE kind IS NULL OR kind NOT IN ('simple', 'compound')
`).run();
db.exec('CREATE INDEX IF NOT EXISTS idx_habits_parent_position ON habits(parent_id, position_in_parent)');
if (addedQuickIncrement) {
  db.prepare(`
    UPDATE habits
    SET target_value = 3, unit = 'L', quick_increment = 0.5
    WHERE id = '67c2b8d7-2bf1-466c-a37d-20545fac594c'
  `).run();
}

migrateActiveRitualsToCompoundHabits(db);

const habitLogsCols = db.prepare("PRAGMA table_info(habit_logs)").all().map(c => c.name);
if (!habitLogsCols.includes('value')) {
  db.exec('ALTER TABLE habit_logs ADD COLUMN value REAL');
}
if (!habitLogsCols.includes('outcome')) {
  db.exec("ALTER TABLE habit_logs ADD COLUMN outcome TEXT DEFAULT 'done'");
}
if (!habitLogsCols.includes('skip_reason')) {
  db.exec('ALTER TABLE habit_logs ADD COLUMN skip_reason TEXT');
}
if (!habitLogsCols.includes('note')) {
  db.exec("ALTER TABLE habit_logs ADD COLUMN note TEXT DEFAULT ''");
}
// Backfill: only completed=1 logs are "done". DEFAULT 'done' on ADD COLUMN can
// stamp incomplete rows — clear those so they don't become fake done.
db.prepare(`
  UPDATE habit_logs
  SET outcome = 'done'
  WHERE completed = 1 AND (outcome IS NULL OR outcome = '' OR outcome = 'done')
`).run();
db.prepare(`
  UPDATE habit_logs
  SET outcome = NULL
  WHERE completed = 0 AND (outcome IS NULL OR outcome = '' OR outcome = 'done')
`).run();
db.prepare(`
  UPDATE habit_logs
  SET completed = 0
  WHERE outcome = 'skipped' AND completed != 0
`).run();
db.prepare(`
  UPDATE habit_logs
  SET completed = 1
  WHERE outcome = 'done' AND completed != 1
`).run();
// Dedupe (habit_id, date) keeping most recent created_date / highest completed priority
try {
  db.exec(`
    DELETE FROM habit_logs
    WHERE id NOT IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY habit_id, date
            ORDER BY
              CASE WHEN completed = 1 THEN 0 ELSE 1 END,
              created_date DESC,
              id DESC
          ) AS rn
        FROM habit_logs
      ) ranked
      WHERE rn = 1
    )
  `);
} catch {
  // Fallback without window functions: keep first id per pair
  const dupes = db.prepare(`
    SELECT habit_id, date, MIN(id) as keep_id, COUNT(*) as c
    FROM habit_logs GROUP BY habit_id, date HAVING c > 1
  `).all();
  for (const d of dupes) {
    db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND date = ? AND id != ?')
      .run(d.habit_id, d.date, d.keep_id);
  }
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, date)');
const settingsCols = db.prepare("PRAGMA table_info(user_settings)").all().map((c) => c.name);
if (!settingsCols.includes('list_density')) {
  db.exec("ALTER TABLE user_settings ADD COLUMN list_density TEXT DEFAULT 'comfortable'");
}
if (!settingsCols.includes('nutrition_enabled')) {
  db.exec('ALTER TABLE user_settings ADD COLUMN nutrition_enabled INTEGER DEFAULT 1');
}
if (!settingsCols.includes('nutrition_show_on_today')) {
  db.exec('ALTER TABLE user_settings ADD COLUMN nutrition_show_on_today INTEGER DEFAULT 1');
}
const tasksCols = db.prepare("PRAGMA table_info(tasks)").all().map(c => c.name);
if (!tasksCols.includes('goal_id')) {
  db.exec("ALTER TABLE tasks ADD COLUMN goal_id TEXT");
}
if (!tasksCols.includes('source')) {
  db.exec("ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'manual'");
}
if (!tasksCols.includes('duration_minutes')) {
  db.exec("ALTER TABLE tasks ADD COLUMN duration_minutes INTEGER");
}
if (!tasksCols.includes('recurrence')) {
  db.exec("ALTER TABLE tasks ADD COLUMN recurrence TEXT DEFAULT 'none'");
}
if (!tasksCols.includes('recurrence_days')) {
  db.exec("ALTER TABLE tasks ADD COLUMN recurrence_days TEXT DEFAULT '[]'");
}
if (!tasksCols.includes('recurrence_parent_id')) {
  db.exec("ALTER TABLE tasks ADD COLUMN recurrence_parent_id TEXT");
}
if (!tasksCols.includes('completed_date')) {
  db.exec("ALTER TABLE tasks ADD COLUMN completed_date TEXT");
}
if (!tasksCols.includes('completed_at')) {
  db.exec("ALTER TABLE tasks ADD COLUMN completed_at TEXT");
}
if (!tasksCols.includes('sort_order')) {
  db.exec("ALTER TABLE tasks ADD COLUMN sort_order INTEGER");
}
const tasksCols2 = db.prepare("PRAGMA table_info(tasks)").all().map((c) => c.name);
if (!tasksCols2.includes('idea_status')) {
  db.exec("ALTER TABLE tasks ADD COLUMN idea_status TEXT");
}
if (!tasksCols2.includes('source_idea_id')) {
  db.exec("ALTER TABLE tasks ADD COLUMN source_idea_id TEXT");
}
if (!tasksCols2.includes('day_outcome')) {
  db.exec('ALTER TABLE tasks ADD COLUMN day_outcome TEXT');
}
if (!tasksCols2.includes('day_outcome_date')) {
  db.exec('ALTER TABLE tasks ADD COLUMN day_outcome_date TEXT');
}
if (!tasksCols2.includes('day_outcome_reason')) {
  db.exec('ALTER TABLE tasks ADD COLUMN day_outcome_reason TEXT');
}
db.prepare(`
  UPDATE tasks SET idea_status = 'capturada'
  WHERE category = 'ideias' AND (idea_status IS NULL OR idea_status = '')
`).run();
db.prepare(`
  UPDATE achievements SET description = 'Rotina matinal 5x'
  WHERE id = 'early_bird' AND COALESCE(description, '') != 'Rotina matinal 5x'
`).run();

backfillSortOrder(db, 'tasks');
backfillSortOrder(db, 'habits');
cleanPriorityTitlePrefixes(db, 'tasks');
cleanPriorityTitlePrefixes(db, 'habits');

// Legacy safety: some tasks were already marked completed before the completion
// metadata existed/was reliably filled. Backfill from updated_date so overdue
// tasks cleared today count as today's effort without mutating their scheduled date.
db.prepare(`
  UPDATE tasks
  SET
    completed_date = COALESCE(substr(updated_date, 1, 10), date('now')),
    completed_at = COALESCE(completed_at, updated_date, datetime('now'))
  WHERE status IN ('completed', 'done')
    AND completed_date IS NULL
`).run();
}
