/**
 * Praxis session auth — browser cookie + Bearer FORJA_API_KEY for automation.
 */
import { randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

export const SESSION_COOKIE = 'praxis_sid';
const SESSION_DAYS = 30;

export function isWebAuthEnabled() {
  const raw = String(process.env.PRAXIS_WEB_AUTH ?? '1').toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(raw);
}

function loadAppPassword() {
  return (
    process.env.PRAXIS_APP_PASSWORD ||
    process.env.FORJA_APP_PASSWORD ||
    ''
  ).trim();
}

export function initAuthSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS praxis_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      created_date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS praxis_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES praxis_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_praxis_sessions_token ON praxis_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_praxis_sessions_expires ON praxis_sessions(expires_at);
  `);
}

export function ensureDefaultUser(db) {
  const password = loadAppPassword();
  if (!password) {
    console.warn('[praxis-auth] PRAXIS_APP_PASSWORD not set — browser login disabled until configured');
    return;
  }
  const existing = db.prepare('SELECT id, password_hash FROM praxis_users WHERE username = ?').get('jota');
  const hash = bcrypt.hashSync(password, 12);
  if (!existing) {
    db.prepare(
      'INSERT INTO praxis_users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)'
    ).run(randomBytes(16).toString('hex'), 'jota', hash, 'João Victor');
    console.log('[praxis-auth] Default user "jota" created from env password');
    return;
  }
  if (!bcrypt.compareSync(password, existing.password_hash)) {
    db.prepare('UPDATE praxis_users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
    console.log('[praxis-auth] Password hash updated from env');
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function getSessionFromRequest(db, req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const row = db.prepare(`
    SELECT s.id AS session_id, s.user_id, s.expires_at, u.username, u.display_name
    FROM praxis_sessions s
    JOIN praxis_users u ON u.id = s.user_id
    WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
  `).get(token);
  return row || null;
}

function purgeExpiredSessions(db) {
  db.prepare("DELETE FROM praxis_sessions WHERE datetime(expires_at) <= datetime('now')").run();
}

export function createSession(db, userId, res, { secureCookie }) {
  purgeExpiredSessions(db);
  const token = randomBytes(32).toString('hex');
  const sessionId = randomBytes(16).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO praxis_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, userId, token, expires);

  const cookieParts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];
  if (secureCookie) cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return token;
}

export function clearSessionCookie(res, { secureCookie }) {
  const cookieParts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secureCookie) cookieParts.push('Secure');
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

export function revokeSession(db, req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    db.prepare('DELETE FROM praxis_sessions WHERE token = ?').run(token);
  }
}

export const PUBLIC_API_PATHS = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/config',
  '/api/webhooks/capture-text',
]);

export function createApiAuthMiddleware({ db, apiKey }) {
  return (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    if (PUBLIC_API_PATHS.has(req.path)) return next();

    if (!isWebAuthEnabled()) {
      if (apiKey && ['1', 'true', 'yes'].includes(String(process.env.FORJA_AUTH_REQUIRED || '').toLowerCase())) {
        const header = req.headers.authorization || '';
        const provided = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-forja-key'];
        if (!provided || !safeEqual(provided, apiKey)) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      }
      return next();
    }

    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-forja-key'];
    if (apiKey && bearer && safeEqual(bearer, apiKey)) {
      req.praxisAuth = { type: 'api_key', user: { username: 'automation' } };
      return next();
    }

    const session = getSessionFromRequest(db, req);
    if (session) {
      req.praxisAuth = {
        type: 'session',
        user: { id: session.user_id, username: session.username, display_name: session.display_name },
      };
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
  };
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

export function registerAuthRoutes(app, db, { secureCookie = true } = {}) {
  app.get('/api/auth/config', (_req, res) => {
    res.json({
      webAuthEnabled: isWebAuthEnabled(),
      loginAvailable: Boolean(db.prepare('SELECT id FROM praxis_users LIMIT 1').get()),
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!isWebAuthEnabled()) {
      return res.json({ user: { username: 'local', display_name: 'Local dev' }, auth: 'open' });
    }
    const session = getSessionFromRequest(db, req);
    if (!session) return res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
    res.json({
      user: { username: session.username, display_name: session.display_name },
      auth: 'session',
    });
  });

  app.post('/api/auth/login', loginRateLimiter, (req, res) => {
    if (!isWebAuthEnabled()) {
      return res.status(400).json({ error: 'Web auth is disabled on this server' });
    }
    const { password } = req.body || {};
    const normalized = typeof password === 'string' ? password.trim() : '';
    if (!normalized) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const user = db.prepare('SELECT * FROM praxis_users WHERE username = ?').get('jota');
    if (!user) {
      return res.status(503).json({ error: 'Login not configured. Set PRAXIS_APP_PASSWORD on the server.' });
    }
    if (!bcrypt.compareSync(normalized, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    createSession(db, user.id, res, { secureCookie });
    res.json({
      user: { username: user.username, display_name: user.display_name },
      auth: 'session',
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    revokeSession(db, req);
    clearSessionCookie(res, { secureCookie });
    res.json({ success: true });
  });
}