const MACROS = ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'];

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

export function positiveQuantity(value, label = 'quantidade') {
  if (typeof value !== 'number' && typeof value !== 'string') return invalid(`${label} deve ser maior que zero`);
  const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  const number = normalized === '' ? NaN : Number(normalized);
  if (!Number.isFinite(number) || number <= 0 || number > 1_000_000) {
    return invalid(`${label} deve ser maior que zero e menor ou igual a 1.000.000`);
  }
  return number;
}

export function quantityBasis(record) {
  const basis = { servings: Number(record.servings) || 1, grams: Number(record.grams) > 0 ? Number(record.grams) : null };
  for (const key of MACROS) basis[key] = Number(record[key]) || 0;
  return JSON.stringify(basis);
}

/** A new log has one authoritative quantity. Grams take precedence when supplied. */
export function resolveFoodQuantity(food, { servings, grams } = {}) {
  const unitGrams = Number(food.serving_grams);
  const hasGrams = grams !== undefined && grams !== null;
  if (servings !== undefined) positiveQuantity(servings, 'porções');
  if (hasGrams) {
    const amount = positiveQuantity(grams, 'gramas');
    if (!Number.isFinite(unitGrams) || unitGrams <= 0) return invalid('Este alimento não tem peso por porção. Informe porções.');
    return { servings: amount / unitGrams, grams: amount };
  }
  const amount = servings === undefined ? 1 : positiveQuantity(servings, 'porções');
  return { servings: amount, grams: unitGrams > 0 && Number.isFinite(unitGrams) ? amount * unitGrams : null };
}

/** Quantity edits use an immutable numeric basis, not rounded values or today's catalogue. */
export function rescaleRecordedQuantity(existing, { servings, grams } = {}) {
  const oldServings = Number(existing.servings);
  const oldGrams = Number(existing.grams);
  const validServings = Number.isFinite(oldServings) && oldServings > 0;
  const validGrams = Number.isFinite(oldGrams) && oldGrams > 0;
  const hasGrams = grams !== undefined && grams !== null;
  let nextServings = existing.servings;
  let nextGrams = existing.grams;
  if (servings !== undefined) positiveQuantity(servings, 'porções');
  if (hasGrams) {
    nextGrams = positiveQuantity(grams, 'gramas');
    if (!validGrams) return invalid('Este registro não tem peso de referência. Edite em porções.');
    nextServings = validServings ? oldServings * nextGrams / oldGrams : nextGrams / oldGrams;
  } else if (servings !== undefined) {
    nextServings = positiveQuantity(servings, 'porções');
    if (!validServings) return invalid('Este registro não tem porção de referência. Adicione um novo registro.');
    nextGrams = validGrams ? oldGrams * nextServings / oldServings : null;
  } else {
    return {};
  }
  let basis;
  try { basis = JSON.parse(existing.quantity_basis_json); } catch { /* legacy snapshot */ }
  if (!basis || !(Number(basis.servings) > 0) || !MACROS.every((key) => Number.isFinite(basis[key]))) {
    basis = JSON.parse(quantityBasis(existing));
  }
  const ratio = hasGrams && Number(basis.grams) > 0 ? nextGrams / basis.grams : nextServings / basis.servings;
  const scaled = { servings: nextServings, grams: nextGrams, quantity_basis_json: JSON.stringify(basis) };
  for (const key of MACROS) {
    const value = Number(basis[key] || 0) * ratio;
    if (!Number.isFinite(value)) return invalid('Quantidade fora do intervalo suportado');
    scaled[key] = key === 'kcal' ? Math.round(value) : Math.round(value * 10) / 10;
  }
  return scaled;
}
