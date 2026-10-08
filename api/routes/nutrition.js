import { Router } from 'express';
import {
  getNutritionProfile,
  updateNutritionProfile,
  suggestNutritionTargets,
  buildDayPayload,
  isValidDateString,
  listFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  createLog,
  updateLog,
  deleteLog,
  listRecentFoods,
  copyDayLogs,
  ensureNutritionSeed,
  listMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  createLogsFromMeal,
  parseNutritionText,
  createLogsFromParsed,
  buildNutritionSummary,
  listWeightLogs,
  upsertWeightLog,
  deleteWeightLog,
  buildWeightTrend,
  lookupBarcode,
} from '../nutrition.js';
import {
  listRegimenItems,
  getRegimenItem,
  createRegimenItem,
  updateRegimenItem,
  deleteRegimenItem,
  buildRegimenDay,
  setRegimenTaken,
  toggleRegimenTaken,
} from '../nutritionRegimen.js';

/**
 * Nutrition router — mounted at /api/nutrition.
 * Paths and JSON contracts stay identical to the previous inline routes.
 */
export function createNutritionRouter({ db, getLocalDateString }) {
  const router = Router();

  router.get('/profile', (req, res) => {
    res.json(getNutritionProfile(db));
  });

  router.put('/profile', (req, res) => {
    try {
      const row = updateNutritionProfile(db, req.body || {});
      res.json(row);
    } catch (err) {
      console.error('nutrition profile put', err);
      res.status(400).json({ error: err?.message || 'não deu pra salvar o perfil' });
    }
  });

  router.post('/profile/suggest', (req, res) => {
    const body = { ...getNutritionProfile(db), ...(req.body || {}) };
    const suggestion = suggestNutritionTargets(body);
    if (suggestion.error) {
      return res.status(400).json({ error: suggestion.error });
    }
    res.json({
      target_kcal: suggestion.target_kcal,
      target_protein_g: suggestion.target_protein_g,
      target_carbs_g: suggestion.target_carbs_g,
      target_fat_g: suggestion.target_fat_g,
      target_fiber_g: suggestion.target_fiber_g,
      note: 'Sugestão com base no seu peso, altura e objetivo — pode mudar à vontade.',
    });
  });

  router.get('/day', (req, res) => {
    const raw = req.query.date != null && String(req.query.date).trim() !== ''
      ? String(req.query.date).trim().slice(0, 10)
      : getLocalDateString();
    if (!isValidDateString(raw)) {
      return res.status(400).json({ error: 'data inválida (use YYYY-MM-DD)' });
    }
    res.json(buildDayPayload(db, raw));
  });

  // summary / history (fase 9)
  router.get('/summary', (req, res) => {
    try {
      let from = req.query.from != null ? String(req.query.from).trim().slice(0, 10) : '';
      let to = req.query.to != null ? String(req.query.to).trim().slice(0, 10) : '';
      // default: últimos 14 dias incluindo hoje
      if (!from || !to) {
        to = getLocalDateString();
        const parts = to.split('-').map(Number);
        const dt = new Date(parts[0], parts[1] - 1, parts[2] - 13);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        from = `${y}-${m}-${d}`;
      }
      res.json(buildNutritionSummary(db, { from, to }));
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'summary falhou' });
    }
  });

  // body weight (fase 10)
  router.get('/weight', (req, res) => {
    const { from, to, limit } = req.query;
    res.json(listWeightLogs(db, { from, to, limit }));
  });

  router.get('/weight/trend', (req, res) => {
    const days = req.query.days;
    res.json(buildWeightTrend(db, { days }));
  });

  router.post('/weight', (req, res) => {
    try {
      const row = upsertWeightLog(db, req.body || {}, { today: getLocalDateString() });
      res.status(201).json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra salvar o peso' });
    }
  });

  router.delete('/weight/:id', (req, res) => {
    if (!deleteWeightLog(db, req.params.id)) {
      return res.status(404).json({ error: 'registro de peso não encontrado' });
    }
    res.status(204).end();
  });

  // rotina: suplementos + medicação (não entra em kcal)
  router.get('/regimen', (req, res) => {
    try {
      const raw =
        req.query.date != null && String(req.query.date).trim() !== ''
          ? String(req.query.date).trim().slice(0, 10)
          : getLocalDateString();
      res.json(buildRegimenDay(db, raw));
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra carregar a rotina' });
    }
  });

  router.get('/regimen/items', (req, res) => {
    const status = req.query.status || 'active';
    res.json(listRegimenItems(db, { status }));
  });

  router.get('/regimen/items/:id', (req, res) => {
    const row = getRegimenItem(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'item não encontrado' });
    res.json(row);
  });

  router.post('/regimen/items', (req, res) => {
    try {
      const row = createRegimenItem(db, req.body || {});
      res.status(201).json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra criar o item' });
    }
  });

  router.patch('/regimen/items/:id', (req, res) => {
    try {
      const row = updateRegimenItem(db, req.params.id, req.body || {});
      if (!row) return res.status(404).json({ error: 'item não encontrado' });
      res.json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra atualizar o item' });
    }
  });

  router.delete('/regimen/items/:id', (req, res) => {
    const hard = req.query.hard === '1' || req.query.hard === 'true';
    if (!deleteRegimenItem(db, req.params.id, { hard })) {
      return res.status(404).json({ error: 'item não encontrado' });
    }
    res.status(204).end();
  });

  router.post('/regimen/items/:id/toggle', (req, res) => {
    try {
      const date = req.body?.date || req.query.date || getLocalDateString();
      const day = toggleRegimenTaken(db, req.params.id, {
        date,
        today: getLocalDateString(),
      });
      res.json(day);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra marcar' });
    }
  });

  router.put('/regimen/items/:id/log', (req, res) => {
    try {
      const date = req.body?.date || getLocalDateString();
      const day = setRegimenTaken(db, req.params.id, {
        date,
        taken: req.body?.taken,
        note: req.body?.note,
        today: getLocalDateString(),
      });
      res.json(day);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra registrar' });
    }
  });

  // foods catalog (fase 2)
  router.get('/foods', (req, res) => {
    const { q, favorites, status, limit } = req.query;
    res.json(listFoods(db, { q, favorites, status, limit }));
  });

  // seed BR (fase 7) — re-run seguro
  router.post('/seed', (req, res) => {
    try {
      const result = ensureNutritionSeed(db);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err?.message || 'seed falhou' });
    }
  });

  // barcode / Open Food Facts (fase 12) — opt-in rede
  router.get('/barcode/:code', async (req, res) => {
    try {
      const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
      const cacheOnly = req.query.cache_only === '1' || req.query.cacheOnly === '1';
      const result = await lookupBarcode(db, req.params.code, { refresh, cacheOnly });
      if (result.source === 'not_found') {
        return res.status(404).json({
          error: 'produto não encontrado no catálogo local nem no Open Food Facts',
          barcode: result.barcode,
          source: 'not_found',
        });
      }
      res.json(result);
    } catch (err) {
      const code = err?.status || 500;
      console.error('barcode lookup', err?.message || err);
      res.status(code).json({ error: err?.message || 'falha no barcode' });
    }
  });

  router.post('/barcode/lookup', async (req, res) => {
    try {
      const code = req.body?.code ?? req.body?.barcode;
      const refresh = !!req.body?.refresh;
      const result = await lookupBarcode(db, code, { refresh, cacheOnly: !!req.body?.cache_only });
      if (result.source === 'not_found') {
        return res.status(404).json({
          error: 'produto não encontrado no catálogo local nem no Open Food Facts',
          barcode: result.barcode,
          source: 'not_found',
        });
      }
      res.json(result);
    } catch (err) {
      const code = err?.status || 500;
      res.status(code).json({ error: err?.message || 'falha no barcode' });
    }
  });

  router.get('/foods/recent', (req, res) => {
    const limit = req.query.limit;
    res.json(listRecentFoods(db, { limit }));
  });

  router.get('/foods/:id', (req, res) => {
    const row = getFood(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'alimento não encontrado' });
    res.json(row);
  });

  router.post('/foods', (req, res) => {
    try {
      const row = createFood(db, req.body || {});
      res.status(201).json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra criar o alimento' });
    }
  });

  router.patch('/foods/:id', (req, res) => {
    try {
      const row = updateFood(db, req.params.id, req.body || {});
      if (!row) return res.status(404).json({ error: 'alimento não encontrado' });
      res.json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra atualizar o alimento' });
    }
  });

  router.delete('/foods/:id', (req, res) => {
    const hard = req.query.hard === '1' || req.query.hard === 'true';
    if (!deleteFood(db, req.params.id, { hard })) {
      return res.status(404).json({ error: 'alimento não encontrado' });
    }
    res.status(204).end();
  });

  // meals (fase 6)
  router.get('/meals', (req, res) => {
    const { status, favorites, limit } = req.query;
    res.json(listMeals(db, { status, favorites, limit }));
  });

  router.get('/meals/:id', (req, res) => {
    const row = getMeal(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'refeição não encontrada' });
    res.json(row);
  });

  router.post('/meals', (req, res) => {
    try {
      const row = createMeal(db, req.body || {});
      res.status(201).json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra criar a refeição' });
    }
  });

  router.patch('/meals/:id', (req, res) => {
    try {
      const row = updateMeal(db, req.params.id, req.body || {});
      if (!row) return res.status(404).json({ error: 'refeição não encontrada' });
      res.json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra atualizar a refeição' });
    }
  });

  router.delete('/meals/:id', (req, res) => {
    const hard = req.query.hard === '1' || req.query.hard === 'true';
    if (!deleteMeal(db, req.params.id, { hard })) {
      return res.status(404).json({ error: 'refeição não encontrada' });
    }
    res.status(204).end();
  });

  router.post('/logs/from-meal', (req, res) => {
    try {
      const result = createLogsFromMeal(db, req.body || {}, { today: getLocalDateString() });
      res.status(201).json(result);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra adicionar a refeição' });
    }
  });

  // parse-text (fase 8) — base p/ transcript/A.N.A./UI texto
  router.post('/parse-text', (req, res) => {
    try {
      const result = parseNutritionText(db, req.body || {});
      res.json(result);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra interpretar o texto' });
    }
  });

  router.post('/logs/from-text', (req, res) => {
    try {
      const body = req.body || {};
      // optional: parse then confirm in one call if confirm:true + text
      if (body.text && body.confirm === true && !Array.isArray(body.items)) {
        const parsed = parseNutritionText(db, body);
        const items = parsed.candidates.map((c) => ({
          food_item_id: c.food_item_id,
          servings: c.servings,
          grams: c.grams,
          meal_slot: c.meal_slot,
        }));
        const result = createLogsFromParsed(
          db,
          { ...body, items, source: body.source || 'text' },
          { today: getLocalDateString() },
        );
        return res.status(201).json({ parsed, ...result });
      }
      const result = createLogsFromParsed(db, body, { today: getLocalDateString() });
      res.status(201).json(result);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra gravar do texto' });
    }
  });

  // food logs (fase 3)
  router.post('/logs', (req, res) => {
    try {
      const row = createLog(db, req.body || {}, { today: getLocalDateString() });
      res.status(201).json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra registrar' });
    }
  });

  router.patch('/logs/:id', (req, res) => {
    try {
      const row = updateLog(db, req.params.id, req.body || {});
      if (!row) return res.status(404).json({ error: 'registro não encontrado' });
      res.json(row);
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra atualizar' });
    }
  });

  router.delete('/logs/:id', (req, res) => {
    if (!deleteLog(db, req.params.id)) {
      return res.status(404).json({ error: 'registro não encontrado' });
    }
    res.status(204).end();
  });

  // copy day (fase 5 — copiar ontem)
  router.post('/day/copy', (req, res) => {
    try {
      const body = req.body || {};
      const toDate = body.to_date || getLocalDateString();
      let fromDate = body.from_date;
      if (!fromDate) {
        // ontem no fuso app: reusa getLocalDateString com Date -1d
        const parts = getLocalDateString().split('-').map(Number);
        const dt = new Date(parts[0], parts[1] - 1, parts[2] - 1);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        fromDate = `${y}-${m}-${d}`;
      }
      const skip = body.force === true || body.force === 1 || body.force === '1'
        ? false
        : true;
      const result = copyDayLogs(db, {
        fromDate: String(fromDate).slice(0, 10),
        toDate: String(toDate).slice(0, 10),
        skipIfTargetHasLogs: skip,
      });
      res.status(201).json({
        ...result,
        from_date: String(fromDate).slice(0, 10),
        to_date: String(toDate).slice(0, 10),
        day: buildDayPayload(db, String(toDate).slice(0, 10)),
      });
    } catch (err) {
      const code = err?.status || 400;
      res.status(code).json({ error: err?.message || 'não deu pra copiar o dia' });
    }
  });


  return router;
}
