/**
 * Open Food Facts — lookup por barcode (fase 12).
 * Opt-in / rede; User-Agent obrigatório pela política da OFF.
 */

const OFF_USER_AGENT =
  process.env.PRAXIS_OFF_USER_AGENT ||
  'PraxisNutrition/1.0 (https://praxis-jota.vercel.app; nutrition-barcode)';

const OFF_BASE =
  process.env.PRAXIS_OFF_API_BASE || 'https://world.openfoodfacts.org';

/** Normaliza dígitos do código (EAN-8/13/UPC). */
export function normalizeBarcode(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * OFF nutriments are often per 100g. Prefer product serving when available.
 * @returns {{ serving_label, serving_grams, kcal, protein_g, carbs_g, fat_g, fiber_g, per }}
 */
export function mapOffProductToFoodBody(product, barcode) {
  const p = product || {};
  const n = p.nutriments || {};
  const name =
    p.product_name_pt ||
    p.product_name ||
    p.generic_name_pt ||
    p.generic_name ||
    `Produto ${barcode}`;
  const brand = (p.brands || '').split(',')[0]?.trim() || '';

  const servingGrams =
    numOrNull(p.serving_quantity) ||
    (typeof p.serving_size === 'string'
      ? numOrNull(String(p.serving_size).match(/([\d.,]+)\s*g/i)?.[1]?.replace(',', '.'))
      : null);

  // Prefer values per serving if OFF provides them
  const kcalServing =
    numOrNull(n['energy-kcal_serving']) ??
    (numOrNull(n.energy_serving) != null ? numOrNull(n.energy_serving) / 4.184 : null);
  const kcal100 =
    numOrNull(n['energy-kcal_100g']) ??
    (numOrNull(n.energy_100g) != null ? numOrNull(n.energy_100g) / 4.184 : null);

  const proteinServing = numOrNull(n.proteins_serving);
  const carbsServing = numOrNull(n.carbohydrates_serving);
  const fatServing = numOrNull(n.fat_serving);
  const fiberServing = numOrNull(n.fiber_serving);

  const protein100 = numOrNull(n.proteins_100g) ?? 0;
  const carbs100 = numOrNull(n.carbohydrates_100g) ?? 0;
  const fat100 = numOrNull(n.fat_100g) ?? 0;
  const fiber100 = numOrNull(n.fiber_100g) ?? 0;

  let serving_label;
  let serving_grams;
  let kcal;
  let protein_g;
  let carbs_g;
  let fat_g;
  let fiber_g;
  let per;

  const hasServingMacros =
    kcalServing != null ||
    proteinServing != null ||
    carbsServing != null ||
    fatServing != null;

  if (hasServingMacros && (servingGrams || p.serving_size)) {
    serving_grams = servingGrams || 100;
    serving_label =
      (p.serving_size && String(p.serving_size).trim()) ||
      `${serving_grams} g`;
    kcal = Math.round(kcalServing ?? 0);
    protein_g = Math.round((proteinServing ?? 0) * 10) / 10;
    carbs_g = Math.round((carbsServing ?? 0) * 10) / 10;
    fat_g = Math.round((fatServing ?? 0) * 10) / 10;
    fiber_g = Math.round((fiberServing ?? 0) * 10) / 10;
    per = 'serving';
  } else {
    // default: 100 g basis from per-100g nutriments
    serving_grams = 100;
    serving_label = '100 g';
    kcal = Math.round(kcal100 ?? 0);
    protein_g = Math.round(protein100 * 10) / 10;
    carbs_g = Math.round(carbs100 * 10) / 10;
    fat_g = Math.round(fat100 * 10) / 10;
    fiber_g = Math.round(fiber100 * 10) / 10;
    per = '100g';
  }

  return {
    id: `off_${barcode}`,
    name: String(name).trim().slice(0, 200) || `Produto ${barcode}`,
    brand: String(brand).slice(0, 120),
    serving_label: String(serving_label).slice(0, 80),
    serving_grams,
    kcal: kcal || 0,
    protein_g: protein_g || 0,
    carbs_g: carbs_g || 0,
    fat_g: fat_g || 0,
    fiber_g: fiber_g || 0,
    source: 'openfoodfacts',
    barcode,
    status: 'active',
    off_meta: {
      per,
      code: barcode,
      image_url: p.image_front_small_url || p.image_front_url || null,
      quantity: p.quantity || null,
      countries: p.countries || null,
    },
  };
}

/**
 * GET product from Open Food Facts (v2).
 * @returns {{ status: number, product?: object, status_verbose?: string }}
 */
export async function fetchOpenFoodFactsProduct(barcode, { timeoutMs = 12000 } = {}) {
  const code = normalizeBarcode(barcode);
  if (!code) {
    const err = new Error('código de barras inválido (use 8–14 dígitos)');
    err.status = 400;
    throw err;
  }

  const url = `${OFF_BASE.replace(/\/$/, '')}/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_pt,generic_name,generic_name_pt,brands,serving_size,serving_quantity,quantity,countries,image_front_url,image_front_small_url,nutriments`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': OFF_USER_AGENT,
        Accept: 'application/json',
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = new Error(`Open Food Facts HTTP ${res.status}`);
      err.status = res.status >= 500 ? 502 : 400;
      throw err;
    }
    const data = await res.json();
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') {
      const err = new Error('Open Food Facts demorou demais — tenta de novo');
      err.status = 504;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
