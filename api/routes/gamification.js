import { Router } from 'express';
import { getLevel, checkAchievements } from '../lib/gamification.js';

/** Gamification — mounted at /api/gamification */
export function createGamificationRouter({ db, getLocalDateString }) {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const gam = db.prepare('SELECT * FROM gamification WHERE id = ?').get('main');
      const levelInfo = getLevel(gam.xp_total);
      let progress_pct = 100;
      if (levelInfo.next_level_xp !== null) {
        const xpInLevel = gam.xp_total - levelInfo.current_xp;
        const xpNeeded = levelInfo.next_level_xp - levelInfo.current_xp;
        progress_pct = xpNeeded > 0 ? Math.round((xpInLevel / xpNeeded) * 100) : 0;
      }
      const achievements = db.prepare('SELECT * FROM achievements ORDER BY unlocked_date DESC NULLS LAST, id').all();
      res.json({
        xp_total: gam.xp_total,
        level: levelInfo.level,
        level_name: levelInfo.name,
        next_level_xp: levelInfo.next_level_xp,
        progress_pct,
        achievements,
      });
    } catch (error) {
      console.error('Gamification GET error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/add-xp', (req, res) => {
    try {
      const { amount, reason } = req.body;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'amount must be a positive number' });
      }

      const gam = db.prepare('SELECT * FROM gamification WHERE id = ?').get('main');
      const oldLevel = getLevel(gam.xp_total).level;
      const newXp = gam.xp_total + amount;
      const newLevelInfo = getLevel(newXp);
      const leveledUp = newLevelInfo.level > oldLevel;

      db.prepare("UPDATE gamification SET xp_total = ?, level = ?, updated_date = datetime('now') WHERE id = ?")
        .run(newXp, newLevelInfo.level, 'main');

      const newAchievements = checkAchievements(db, { getLocalDateString });

      res.json({
        xp_total: newXp,
        level: newLevelInfo.level,
        level_name: newLevelInfo.name,
        leveled_up: leveledUp,
        new_achievements: newAchievements,
        reason: reason || null,
      });
    } catch (error) {
      console.error('Add XP error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/check-achievements', (req, res) => {
    try {
      const newAchievements = checkAchievements(db, { getLocalDateString });

      let totalBonusXp = 0;
      for (const a of newAchievements) {
        totalBonusXp += a.xp_reward || 0;
      }
      if (totalBonusXp > 0) {
        const gam = db.prepare('SELECT * FROM gamification WHERE id = ?').get('main');
        const newXp = gam.xp_total + totalBonusXp;
        const newLevelInfo = getLevel(newXp);
        db.prepare("UPDATE gamification SET xp_total = ?, level = ?, updated_date = datetime('now') WHERE id = ?")
          .run(newXp, newLevelInfo.level, 'main');
      }

      res.json({
        new_achievements: newAchievements,
        bonus_xp: totalBonusXp,
      });
    } catch (error) {
      console.error('Check achievements error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
