/** Return null for incomplete/invalid input; never silently replace it with one serving. */
export function parseNutritionQuantity(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().replace(',', '.');
  const amount = text === '' ? NaN : Number(text);
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000 ? amount : null;
}

export function convertNutritionQuantity(value, from, to, gramsPerServing) {
  const amount = parseNutritionQuantity(value);
  const unitGrams = parseNutritionQuantity(gramsPerServing);
  if (from === to || amount == null || unitGrams == null) return String(value);
  const converted = to === 'grams' ? amount * unitGrams : amount / unitGrams;
  return String(Number(converted.toPrecision(12)));
}

export function nutritionQuantityPayload(value, unit) {
  const amount = parseNutritionQuantity(value);
  if (amount == null || !['grams', 'servings'].includes(unit)) return null;
  return { [unit]: amount };
}

export function recordedFoodReference(log) {
  let basis = log;
  try {
    const saved = JSON.parse(log?.quantity_basis_json);
    if (saved && parseNutritionQuantity(saved.servings) && ['kcal', 'protein_g', 'carbs_g', 'fat_g'].every((key) => Number.isFinite(saved[key]))) basis = saved;
  } catch { /* Old records use their recorded totals as the reference. */ }
  const servings = parseNutritionQuantity(basis?.servings) || 1;
  const grams = parseNutritionQuantity(basis?.grams);
  const reference = { serving_grams: grams == null ? null : grams / servings };
  for (const key of ['kcal', 'protein_g', 'carbs_g', 'fat_g']) {
    reference[key] = Number(basis?.[key] || 0) / servings;
  }
  return reference;
}
