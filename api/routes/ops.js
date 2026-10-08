import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { isWebAuthEnabled } from '../praxisAuth.js';

/**
 * Health + ops — mount paths at app level:
 * registerOpsRoutes(app, { apiDir })
 */
export function registerOpsRoutes(app, { apiDir }) {
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      webAuth: isWebAuthEnabled(),
    });
  });

  app.get('/api/ops/backup-meta', (req, res) => {
    try {
      const backupDir = path.join(apiDir, 'backups');
      const metaPath = path.join(backupDir, 'last-backup.json');
      const dailyDir = path.join(backupDir, 'daily');
      let last = null;
      if (fs.existsSync(metaPath)) {
        last = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      }
      let dailyCount = 0;
      try {
        dailyCount = fs.readdirSync(dailyDir).filter((f) => f.endsWith('.db.gz')).length;
      } catch { /* ignore */ }
      res.json({
        ok: true,
        backup_dir: backupDir,
        daily_snapshots: dailyCount,
        last,
        cron_hint: '15 3 * * * scripts/praxis-backup.sh',
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

/** Optional: categories as tiny router */
export function createCategoriesRouter(CATEGORIES) {
  const router = Router();
  router.get('/', (req, res) => {
    const list = Object.entries(CATEGORIES).map(([key, val]) => ({ key, ...val }));
    res.json(list);
  });
  return router;
}
