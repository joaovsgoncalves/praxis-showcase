/**
 * Seed BR — alimentos comuns (valores típicos por porção).
 * Fonte: aproximações de tabelas TACO/USDA/rótulos comuns; não é laudo lab.
 * IDs estáveis seed_* para re-run idempotente.
 */

/** @typedef {{ id: string, name: string, brand?: string, serving_label: string, serving_grams?: number|null, kcal: number, protein_g: number, carbs_g: number, fat_g: number, fiber_g?: number }} SeedFood */

/** @type {SeedFood[]} */
export const BR_SEED_FOODS = [
  // proteínas
  { id: 'seed_ovo_inteiro', name: 'Ovo de galinha inteiro', serving_label: '1 unidade', serving_grams: 50, kcal: 74, protein_g: 6.3, carbs_g: 0.6, fat_g: 5, fiber_g: 0 },
  { id: 'seed_clara_ovo', name: 'Clara de ovo', serving_label: '1 unidade', serving_grams: 33, kcal: 17, protein_g: 3.6, carbs_g: 0.2, fat_g: 0.1, fiber_g: 0 },
  { id: 'seed_frango_peito', name: 'Frango peito grelhado', serving_label: '100 g', serving_grams: 100, kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0 },
  { id: 'seed_frango_coxa', name: 'Frango coxa sem pele assada', serving_label: '100 g', serving_grams: 100, kcal: 184, protein_g: 27, carbs_g: 0, fat_g: 8, fiber_g: 0 },
  { id: 'seed_patinho', name: 'Carne patinho grelhada', serving_label: '100 g', serving_grams: 100, kcal: 219, protein_g: 32, carbs_g: 0, fat_g: 9, fiber_g: 0 },
  { id: 'seed_alcatra', name: 'Alcatra grelhada', serving_label: '100 g', serving_grams: 100, kcal: 239, protein_g: 30, carbs_g: 0, fat_g: 13, fiber_g: 0 },
  { id: 'seed_carne_moida', name: 'Carne moída magra cozida', serving_label: '100 g', serving_grams: 100, kcal: 212, protein_g: 26, carbs_g: 0, fat_g: 12, fiber_g: 0 },
  { id: 'seed_tilapia', name: 'Tilápia grelhada', serving_label: '100 g', serving_grams: 100, kcal: 128, protein_g: 26, carbs_g: 0, fat_g: 2.7, fiber_g: 0 },
  { id: 'seed_salmao', name: 'Salmão grelhado', serving_label: '100 g', serving_grams: 100, kcal: 208, protein_g: 22, carbs_g: 0, fat_g: 13, fiber_g: 0 },
  { id: 'seed_atum_lata', name: 'Atum em água (drenado)', serving_label: '100 g', serving_grams: 100, kcal: 86, protein_g: 19, carbs_g: 0, fat_g: 1, fiber_g: 0 },
  { id: 'seed_sardinha_lata', name: 'Sardinha em óleo (drenada)', serving_label: '100 g', serving_grams: 100, kcal: 208, protein_g: 25, carbs_g: 0, fat_g: 11, fiber_g: 0 },
  { id: 'seed_whey', name: 'Whey protein concentrado', serving_label: '1 scoop (30 g)', serving_grams: 30, kcal: 120, protein_g: 24, carbs_g: 2, fat_g: 1.5, fiber_g: 0 },
  { id: 'seed_queijo_minas', name: 'Queijo minas frescal', serving_label: '30 g', serving_grams: 30, kcal: 73, protein_g: 5.2, carbs_g: 0.9, fat_g: 5.4, fiber_g: 0 },
  { id: 'seed_queijo_cottage', name: 'Queijo cottage', serving_label: '100 g', serving_grams: 100, kcal: 98, protein_g: 11, carbs_g: 3.4, fat_g: 4.3, fiber_g: 0 },
  { id: 'seed_iogurte_natural', name: 'Iogurte natural integral', serving_label: '170 g', serving_grams: 170, kcal: 104, protein_g: 6, carbs_g: 8, fat_g: 5, fiber_g: 0 },
  { id: 'seed_iogurte_grego', name: 'Iogurte grego natural', serving_label: '100 g', serving_grams: 100, kcal: 97, protein_g: 9, carbs_g: 3.6, fat_g: 5, fiber_g: 0 },
  { id: 'seed_leite_integral', name: 'Leite integral', serving_label: '200 ml', serving_grams: 200, kcal: 122, protein_g: 6.4, carbs_g: 9.4, fat_g: 6.4, fiber_g: 0 },
  { id: 'seed_leite_desnatado', name: 'Leite desnatado', serving_label: '200 ml', serving_grams: 200, kcal: 68, protein_g: 6.8, carbs_g: 10, fat_g: 0.2, fiber_g: 0 },

  // carboidratos
  { id: 'seed_arroz_branco', name: 'Arroz branco cozido', serving_label: '100 g', serving_grams: 100, kcal: 130, protein_g: 2.5, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4 },
  { id: 'seed_arroz_integral', name: 'Arroz integral cozido', serving_label: '100 g', serving_grams: 100, kcal: 124, protein_g: 2.7, carbs_g: 26, fat_g: 1, fiber_g: 1.8 },
  { id: 'seed_feijao_carioca', name: 'Feijão carioca cozido', serving_label: '100 g', serving_grams: 100, kcal: 76, protein_g: 4.8, carbs_g: 13.6, fat_g: 0.5, fiber_g: 8.5 },
  { id: 'seed_feijao_preto', name: 'Feijão preto cozido', serving_label: '100 g', serving_grams: 100, kcal: 77, protein_g: 4.5, carbs_g: 14, fat_g: 0.5, fiber_g: 8.4 },
  { id: 'seed_batata_inglesa', name: 'Batata inglesa cozida', serving_label: '100 g', serving_grams: 100, kcal: 87, protein_g: 1.9, carbs_g: 20, fat_g: 0.1, fiber_g: 1.3 },
  { id: 'seed_batata_doce', name: 'Batata-doce cozida', serving_label: '100 g', serving_grams: 100, kcal: 86, protein_g: 1.6, carbs_g: 20, fat_g: 0.1, fiber_g: 3 },
  { id: 'seed_mandioca', name: 'Mandioca cozida', serving_label: '100 g', serving_grams: 100, kcal: 125, protein_g: 0.6, carbs_g: 30, fat_g: 0.3, fiber_g: 1.6 },
  { id: 'seed_macarrao', name: 'Macarrão cozido', serving_label: '100 g', serving_grams: 100, kcal: 131, protein_g: 5, carbs_g: 25, fat_g: 1.1, fiber_g: 1.8 },
  { id: 'seed_pao_frances', name: 'Pão francês', serving_label: '1 unidade (50 g)', serving_grams: 50, kcal: 150, protein_g: 4.5, carbs_g: 29, fat_g: 1.5, fiber_g: 1.2 },
  { id: 'seed_pao_integral', name: 'Pão de forma integral', serving_label: '1 fatia (25 g)', serving_grams: 25, kcal: 62, protein_g: 2.5, carbs_g: 10.5, fat_g: 1, fiber_g: 1.5 },
  { id: 'seed_tapioca', name: 'Tapioca (goma hidratada)', serving_label: '100 g', serving_grams: 100, kcal: 100, protein_g: 0.2, carbs_g: 25, fat_g: 0, fiber_g: 0.1 },
  { id: 'seed_aveia', name: 'Aveia em flocos', serving_label: '40 g', serving_grams: 40, kcal: 150, protein_g: 5.4, carbs_g: 26, fat_g: 2.8, fiber_g: 4 },
  { id: 'seed_granola', name: 'Granola tradicional', serving_label: '30 g', serving_grams: 30, kcal: 140, protein_g: 3, carbs_g: 20, fat_g: 5, fiber_g: 2.5 },
  { id: 'seed_cuscuz', name: 'Cuscuz de milho cozido', serving_label: '100 g', serving_grams: 100, kcal: 113, protein_g: 2.2, carbs_g: 25, fat_g: 0.4, fiber_g: 1.5 },
  { id: 'seed_milho', name: 'Milho verde cozido', serving_label: '100 g', serving_grams: 100, kcal: 98, protein_g: 3.2, carbs_g: 21, fat_g: 1.2, fiber_g: 2.4 },

  // frutas
  { id: 'seed_banana', name: 'Banana prata', serving_label: '1 unidade (100 g)', serving_grams: 100, kcal: 98, protein_g: 1.3, carbs_g: 26, fat_g: 0.1, fiber_g: 2 },
  { id: 'seed_maca', name: 'Maçã com casca', serving_label: '1 unidade (130 g)', serving_grams: 130, kcal: 68, protein_g: 0.3, carbs_g: 18, fat_g: 0.2, fiber_g: 3 },
  { id: 'seed_mamao', name: 'Mamão papaia', serving_label: '100 g', serving_grams: 100, kcal: 40, protein_g: 0.5, carbs_g: 10, fat_g: 0.1, fiber_g: 1.8 },
  { id: 'seed_laranja', name: 'Laranja pera', serving_label: '1 unidade (150 g)', serving_grams: 150, kcal: 70, protein_g: 1.2, carbs_g: 17, fat_g: 0.2, fiber_g: 3 },
  { id: 'seed_morango', name: 'Morango', serving_label: '100 g', serving_grams: 100, kcal: 30, protein_g: 0.7, carbs_g: 7, fat_g: 0.3, fiber_g: 2 },
  { id: 'seed_abacate', name: 'Abacate', serving_label: '50 g', serving_grams: 50, kcal: 80, protein_g: 1, carbs_g: 4, fat_g: 7.5, fiber_g: 3.4 },
  { id: 'seed_uva', name: 'Uva', serving_label: '100 g', serving_grams: 100, kcal: 67, protein_g: 0.6, carbs_g: 17, fat_g: 0.2, fiber_g: 0.9 },
  { id: 'seed_manga', name: 'Manga', serving_label: '100 g', serving_grams: 100, kcal: 64, protein_g: 0.5, carbs_g: 16, fat_g: 0.3, fiber_g: 1.6 },

  // vegetais / leguminosas extras
  { id: 'seed_brocolis', name: 'Brócolis cozido', serving_label: '100 g', serving_grams: 100, kcal: 35, protein_g: 2.4, carbs_g: 7, fat_g: 0.4, fiber_g: 3.3 },
  { id: 'seed_alface', name: 'Alface americana', serving_label: '50 g', serving_grams: 50, kcal: 7, protein_g: 0.5, carbs_g: 1.5, fat_g: 0.1, fiber_g: 0.7 },
  { id: 'seed_tomate', name: 'Tomate', serving_label: '100 g', serving_grams: 100, kcal: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, fiber_g: 1.2 },
  { id: 'seed_cenoura', name: 'Cenoura crua', serving_label: '100 g', serving_grams: 100, kcal: 41, protein_g: 0.9, carbs_g: 10, fat_g: 0.2, fiber_g: 2.8 },
  { id: 'seed_abobrinha', name: 'Abobrinha refogada', serving_label: '100 g', serving_grams: 100, kcal: 24, protein_g: 1.2, carbs_g: 4, fat_g: 0.4, fiber_g: 1.2 },
  { id: 'seed_lentilha', name: 'Lentilha cozida', serving_label: '100 g', serving_grams: 100, kcal: 116, protein_g: 9, carbs_g: 20, fat_g: 0.4, fiber_g: 7.9 },
  { id: 'seed_grao_bico', name: 'Grão-de-bico cozido', serving_label: '100 g', serving_grams: 100, kcal: 164, protein_g: 8.9, carbs_g: 27, fat_g: 2.6, fiber_g: 7.6 },

  // gorduras / extras
  { id: 'seed_azeite', name: 'Azeite de oliva', serving_label: '1 colher sopa (13 g)', serving_grams: 13, kcal: 119, protein_g: 0, carbs_g: 0, fat_g: 13.5, fiber_g: 0 },
  { id: 'seed_manteiga', name: 'Manteiga', serving_label: '1 colher chá (5 g)', serving_grams: 5, kcal: 36, protein_g: 0, carbs_g: 0, fat_g: 4, fiber_g: 0 },
  { id: 'seed_castanha_caju', name: 'Castanha de caju', serving_label: '30 g', serving_grams: 30, kcal: 170, protein_g: 5, carbs_g: 9, fat_g: 13, fiber_g: 1 },
  { id: 'seed_amendoim', name: 'Amendoim torrado', serving_label: '30 g', serving_grams: 30, kcal: 170, protein_g: 7.5, carbs_g: 5, fat_g: 14, fiber_g: 2.5 },
  { id: 'seed_pasta_amendoim', name: 'Pasta de amendoim', serving_label: '1 colher sopa (15 g)', serving_grams: 15, kcal: 90, protein_g: 3.5, carbs_g: 3, fat_g: 7.5, fiber_g: 1 },
  { id: 'seed_chocolate_70', name: 'Chocolate 70% cacau', serving_label: '20 g', serving_grams: 20, kcal: 120, protein_g: 1.6, carbs_g: 9, fat_g: 8.5, fiber_g: 2 },
  { id: 'seed_cafe', name: 'Café sem açúcar', serving_label: '1 xícara (50 ml)', serving_grams: 50, kcal: 2, protein_g: 0.1, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  { id: 'seed_acucar', name: 'Açúcar refinado', serving_label: '1 colher chá (5 g)', serving_grams: 5, kcal: 20, protein_g: 0, carbs_g: 5, fat_g: 0, fiber_g: 0 },
  { id: 'seed_mel', name: 'Mel', serving_label: '1 colher sopa (21 g)', serving_grams: 21, kcal: 64, protein_g: 0.1, carbs_g: 17, fat_g: 0, fiber_g: 0 },
  { id: 'seed_tapioca_com_ovo', name: 'Tapioca com ovo (caseira)', serving_label: '1 unidade', serving_grams: 120, kcal: 220, protein_g: 8, carbs_g: 28, fat_g: 8, fiber_g: 0.2 },
  { id: 'seed_sushi_salmão', name: 'Sushi salmão (aproximado)', serving_label: '8 peças', serving_grams: 160, kcal: 280, protein_g: 14, carbs_g: 40, fat_g: 6, fiber_g: 1 },
  { id: 'seed_pizza_mussarela', name: 'Pizza mussarela', serving_label: '1 fatia (80 g)', serving_grams: 80, kcal: 220, protein_g: 9, carbs_g: 24, fat_g: 10, fiber_g: 1.2 },
  { id: 'seed_hamburguer_artesanal', name: 'Hambúrguer artesanal (pão+carne)', serving_label: '1 unidade', serving_grams: 220, kcal: 520, protein_g: 28, carbs_g: 40, fat_g: 28, fiber_g: 2 },
  { id: 'seed_refrigerante', name: 'Refrigerante comum', serving_label: '350 ml', serving_grams: 350, kcal: 140, protein_g: 0, carbs_g: 35, fat_g: 0, fiber_g: 0 },
  { id: 'seed_cerveja', name: 'Cerveja pilsen', serving_label: '350 ml', serving_grams: 350, kcal: 150, protein_g: 1.5, carbs_g: 12, fat_g: 0, fiber_g: 0 },
];

/**
 * Insere seeds que ainda não existem (por id). Não sobrescreve custom.
 * @returns {{ inserted: number, total: number, skipped: number }}
 */
export function seedBrazilianFoods(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO food_items (
      id, name, brand, serving_label, serving_grams,
      kcal, protein_g, carbs_g, fat_g, fiber_g,
      is_favorite, source, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'seed', 'active')
  `);

  let inserted = 0;
  const run = db.transaction((rows) => {
    for (const f of rows) {
      const r = insert.run(
        f.id,
        f.name,
        f.brand || '',
        f.serving_label || '100 g',
        f.serving_grams ?? null,
        f.kcal ?? 0,
        f.protein_g ?? 0,
        f.carbs_g ?? 0,
        f.fat_g ?? 0,
        f.fiber_g ?? 0,
      );
      if (r.changes > 0) inserted += 1;
    }
  });
  run(BR_SEED_FOODS);

  return {
    inserted,
    total: BR_SEED_FOODS.length,
    skipped: BR_SEED_FOODS.length - inserted,
  };
}
