import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  MUSCLES as API_MUSCLES,
  MUSCLE_LABEL_PT as API_MUSCLE_LABEL_PT,
  BODY_PART_LABEL_PT as API_BODY_PART_LABEL_PT,
  EQUIPMENT_LABEL_PT as API_EQUIPMENT_LABEL_PT,
  aliasMuscle as apiAliasMuscle,
  formatBodyPart as apiFormatBodyPart,
  formatEquipment as apiFormatEquipment,
  formatMuscleName as apiFormatMuscleName,
  extractInstructionSteps as apiExtractInstructionSteps,
  preferSteps as apiPreferSteps,
  extractSecondaryMuscles as apiExtractSecondaryMuscles,
  CDN_IMG_BASE as API_CDN_IMG_BASE,
  CDN_GIF_BASE as API_CDN_GIF_BASE,
  MEDIA_ATTRIBUTION as API_MEDIA_ATTRIBUTION,
  thumbUrl as apiThumbUrl,
  gifUrl as apiGifUrl,
  isTreinosV4Enabled as apiIsTreinosV4Enabled,
  isWarmupSet as apiIsWarmupSet,
  isWakeLockSupported as apiIsWakeLockSupported,
  detectPersonalRecord as apiDetectPersonalRecord,
  formatPrToastDescription as apiFormatPrToastDescription,
  EMPTY_SET_FORM as API_EMPTY_SET_FORM,
  getWorkSets as apiGetWorkSets,
  getWarmupSets as apiGetWarmupSets,
  getLastWorkSet as apiGetLastWorkSet,
  getLastWarmupSet as apiGetLastWarmupSet,
  cascadeWeightToUnfilledSlots as apiCascadeWeightToUnfilledSlots,
  computeSetPrefill as apiComputeSetPrefill,
  estimate1rm as apiEstimate1rm,
  bestEstimated1rm as apiBestEstimated1rm,
  format1rm as apiFormat1rm,
  computeBalanceMap as apiComputeBalanceMap,
  computeMuscleMap as apiComputeMuscleMap,
  HEATMAP_MONTHS_PT as API_HEATMAP_MONTHS_PT,
  HEATMAP_WEEKDAYS_PT as API_HEATMAP_WEEKDAYS_PT,
  HEATMAP_INTENSITY_BINS as API_HEATMAP_INTENSITY_BINS,
  getHeatmapIntensityBin as apiGetHeatmapIntensityBin,
  formatHeatmapTooltip as apiFormatHeatmapTooltip,
  buildYearHeatmapGrid as apiBuildYearHeatmapGrid,
  shouldSkipAutoRest as apiShouldSkipAutoRest,
  isFreestyleSession as apiIsFreestyleSession,
  getSupersetPairIndices as apiGetSupersetPairIndices,
  translateExerciseNameToPt as apiTranslateExerciseNameToPt,
} from './lib/workoutV4Core.js';

import {
  MUSCLES as FRONT_MUSCLES,
  MUSCLE_LABEL_PT as FRONT_MUSCLE_LABEL_PT,
  BODY_PART_LABEL_PT as FRONT_BODY_PART_LABEL_PT,
  EQUIPMENT_LABEL_PT as FRONT_EQUIPMENT_LABEL_PT,
  aliasMuscle as frontAliasMuscle,
  formatBodyPart as frontFormatBodyPart,
  formatEquipment as frontFormatEquipment,
  formatMuscleName as frontFormatMuscleName,
  extractInstructionSteps as frontExtractInstructionSteps,
  preferSteps as frontPreferSteps,
  extractSecondaryMuscles as frontExtractSecondaryMuscles,
  CDN_IMG_BASE as FRONT_CDN_IMG_BASE,
  CDN_GIF_BASE as FRONT_CDN_GIF_BASE,
  MEDIA_ATTRIBUTION as FRONT_MEDIA_ATTRIBUTION,
  thumbUrl as frontThumbUrl,
  gifUrl as frontGifUrl,
  isTreinosV4Enabled as frontIsTreinosV4Enabled,
  isWarmupSet as frontIsWarmupSet,
  isWakeLockSupported as frontIsWakeLockSupported,
  detectPersonalRecord as frontDetectPersonalRecord,
  formatPrToastDescription as frontFormatPrToastDescription,
  EMPTY_SET_FORM as FRONT_EMPTY_SET_FORM,
  getWorkSets as frontGetWorkSets,
  getWarmupSets as frontGetWarmupSets,
  getLastWorkSet as frontGetLastWorkSet,
  getLastWarmupSet as frontGetLastWarmupSet,
  cascadeWeightToUnfilledSlots as frontCascadeWeightToUnfilledSlots,
  computeSetPrefill as frontComputeSetPrefill,
  estimate1rm as frontEstimate1rm,
  bestEstimated1rm as frontBestEstimated1rm,
  format1rm as frontFormat1rm,
  computeBalanceMap as frontComputeBalanceMap,
  computeMuscleMap as frontComputeMuscleMap,
  HEATMAP_MONTHS_PT as FRONT_HEATMAP_MONTHS_PT,
  HEATMAP_WEEKDAYS_PT as FRONT_HEATMAP_WEEKDAYS_PT,
  HEATMAP_INTENSITY_BINS as FRONT_HEATMAP_INTENSITY_BINS,
  getHeatmapIntensityBin as frontGetHeatmapIntensityBin,
  formatHeatmapTooltip as frontFormatHeatmapTooltip,
  buildYearHeatmapGrid as frontBuildYearHeatmapGrid,
  shouldSkipAutoRest as frontShouldSkipAutoRest,
  isFreestyleSession as frontIsFreestyleSession,
  getSupersetPairIndices as frontGetSupersetPairIndices,
} from '../src/lib/workoutV4/index.js';
import { formatRestDuration } from '../src/lib/workouts.js';

describe('workoutV4Core — muscles & vocabulary', () => {
  test('exports exact 18 canonical muscles in head-to-toe order', () => {
    const expected = [
      'trapezius',
      'deltoids',
      'chest',
      'upper-back',
      'serratus',
      'biceps',
      'triceps',
      'forearm',
      'abs',
      'obliques',
      'lower-back',
      'gluteal',
      'quadriceps',
      'hamstring',
      'adductors',
      'hip-flexors',
      'calves',
      'tibialis',
    ];

    assert.equal(API_MUSCLES.length, 18);
    assert.deepEqual(API_MUSCLES, expected);
    assert.deepEqual(FRONT_MUSCLES, expected);
  });

  test('every canonical muscle has a non-empty Portuguese label', () => {
    for (const muscle of API_MUSCLES) {
      const apiLabel = API_MUSCLE_LABEL_PT[muscle];
      const frontLabel = FRONT_MUSCLE_LABEL_PT[muscle];
      assert.equal(typeof apiLabel, 'string');
      assert.ok(apiLabel.trim().length > 0, `Missing API label for ${muscle}`);
      assert.equal(apiLabel, frontLabel);
    }
  });

  test('aliasMuscle handles exact canonical IDs and case/trim variations', () => {
    for (const aliasFn of [apiAliasMuscle, frontAliasMuscle]) {
      assert.equal(aliasFn('chest'), 'chest');
      assert.equal(aliasFn('CHEST'), 'chest');
      assert.equal(aliasFn('  upper-back  '), 'upper-back');
      assert.equal(aliasFn('upper_back'), 'upper-back');
      assert.equal(aliasFn('upper back'), 'upper-back');
    }
  });

  test('aliasMuscle maps all common dataset target/secondary muscle spellings', () => {
    for (const aliasFn of [apiAliasMuscle, frontAliasMuscle]) {
      // Chest & variations
      assert.equal(aliasFn('pecs'), 'chest');
      assert.equal(aliasFn('pectorals'), 'chest');
      assert.equal(aliasFn('upper chest'), 'chest');

      // Shoulders / Deltoids
      assert.equal(aliasFn('delts'), 'deltoids');
      assert.equal(aliasFn('shoulders'), 'deltoids');
      assert.equal(aliasFn('rear deltoids'), 'deltoids');
      assert.equal(aliasFn('rotator cuff'), 'deltoids');

      // Back & Lats
      assert.equal(aliasFn('lats'), 'upper-back');
      assert.equal(aliasFn('latissimus dorsi'), 'upper-back');
      assert.equal(aliasFn('rhomboids'), 'upper-back');
      assert.equal(aliasFn('back'), 'upper-back');

      // Traps & Neck
      assert.equal(aliasFn('traps'), 'trapezius');
      assert.equal(aliasFn('trapezius'), 'trapezius');
      assert.equal(aliasFn('neck'), 'trapezius');
      assert.equal(aliasFn('levator scapulae'), 'trapezius');
      assert.equal(aliasFn('sternocleidomastoid'), 'trapezius');

      // Serratus
      assert.equal(aliasFn('serratus'), 'serratus');
      assert.equal(aliasFn('serratus anterior'), 'serratus');

      // Arms
      assert.equal(aliasFn('biceps'), 'biceps');
      assert.equal(aliasFn('brachialis'), 'biceps');
      assert.equal(aliasFn('triceps'), 'triceps');
      assert.equal(aliasFn('forearms'), 'forearm');
      assert.equal(aliasFn('forearm'), 'forearm');
      assert.equal(aliasFn('lower arms'), 'forearm');
      assert.equal(aliasFn('wrists'), 'forearm');
      assert.equal(aliasFn('wrist flexors'), 'forearm');
      assert.equal(aliasFn('wrist extensors'), 'forearm');
      assert.equal(aliasFn('grip muscles'), 'forearm');
      assert.equal(aliasFn('hands'), 'forearm');

      // Core / Abs / Obliques / Lower Back
      assert.equal(aliasFn('abs'), 'abs');
      assert.equal(aliasFn('abdominals'), 'abs');
      assert.equal(aliasFn('core'), 'abs');
      assert.equal(aliasFn('lower abs'), 'abs');
      assert.equal(aliasFn('waist'), 'abs');
      assert.equal(aliasFn('obliques'), 'obliques');
      assert.equal(aliasFn('lower back'), 'lower-back');
      assert.equal(aliasFn('spine'), 'lower-back');

      // Lower body
      assert.equal(aliasFn('glutes'), 'gluteal');
      assert.equal(aliasFn('gluteal'), 'gluteal');
      assert.equal(aliasFn('abductors'), 'gluteal');
      assert.equal(aliasFn('quads'), 'quadriceps');
      assert.equal(aliasFn('quadriceps'), 'quadriceps');
      assert.equal(aliasFn('hamstrings'), 'hamstring');
      assert.equal(aliasFn('hamstring'), 'hamstring');
      assert.equal(aliasFn('adductors'), 'adductors');
      assert.equal(aliasFn('groin'), 'adductors');
      assert.equal(aliasFn('inner thighs'), 'adductors');
      assert.equal(aliasFn('hip flexors'), 'hip-flexors');
      assert.equal(aliasFn('hip-flexors'), 'hip-flexors');
      assert.equal(aliasFn('calves'), 'calves');
      assert.equal(aliasFn('soleus'), 'calves');
      assert.equal(aliasFn('lower legs'), 'calves');
      assert.equal(aliasFn('ankles'), 'calves');
      assert.equal(aliasFn('ankle stabilizers'), 'calves');
      assert.equal(aliasFn('feet'), 'calves');
      assert.equal(aliasFn('tibialis'), 'tibialis');
      assert.equal(aliasFn('shins'), 'tibialis');
    }
  });

  test('aliasMuscle returns null for unknown or non-muscle terms', () => {
    for (const aliasFn of [apiAliasMuscle, frontAliasMuscle]) {
      assert.equal(aliasFn(null), null);
      assert.equal(aliasFn(undefined), null);
      assert.equal(aliasFn(''), null);
      assert.equal(aliasFn('   '), null);
      assert.equal(aliasFn('cardiovascular system'), null);
      assert.equal(aliasFn('cardio'), null);
      assert.equal(aliasFn('unknown_muscle_xyz'), null);
    }
  });
});

describe('workoutV4Core — media URLs & attribution', () => {
  test('constants define jsDelivr CDN bases and Gym visual attribution', () => {
    assert.equal(
      API_CDN_IMG_BASE,
      'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/',
    );
    assert.equal(
      API_CDN_GIF_BASE,
      'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/',
    );
    assert.equal(
      API_MEDIA_ATTRIBUTION,
      '© Gym visual — https://gymvisual.com/',
    );

    assert.equal(FRONT_CDN_IMG_BASE, API_CDN_IMG_BASE);
    assert.equal(FRONT_CDN_GIF_BASE, API_CDN_GIF_BASE);
    assert.equal(FRONT_MEDIA_ATTRIBUTION, API_MEDIA_ATTRIBUTION);
  });

  test('thumbUrl builds full CDN URL from exercise object or string path', () => {
    for (const thumbFn of [apiThumbUrl, frontThumbUrl]) {
      assert.equal(
        thumbFn({ thumb_path: 'images/0001-2gPfomN.jpg' }),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/0001-2gPfomN.jpg',
      );
      assert.equal(
        thumbFn({ image: 'images/0001-2gPfomN.jpg' }),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/0001-2gPfomN.jpg',
      );
      assert.equal(
        thumbFn({ thumb_path: '0001-2gPfomN.jpg' }),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/0001-2gPfomN.jpg',
      );
      assert.equal(
        thumbFn('images/0001-2gPfomN.jpg'),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/0001-2gPfomN.jpg',
      );
      assert.equal(
        thumbFn('/images/0001-2gPfomN.jpg'),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/0001-2gPfomN.jpg',
      );
      assert.equal(
        thumbFn('https://example.com/custom-thumb.jpg'),
        'https://example.com/custom-thumb.jpg',
      );
      assert.equal(thumbFn(null), null);
      assert.equal(thumbFn({}), null);
      assert.equal(thumbFn(''), null);
    }
  });

  test('gifUrl builds full CDN URL from exercise object or string path', () => {
    for (const gifFn of [apiGifUrl, frontGifUrl]) {
      assert.equal(
        gifFn({ gif_path: 'videos/0001-2gPfomN.gif' }),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0001-2gPfomN.gif',
      );
      assert.equal(
        gifFn({ gif_url: 'videos/0001-2gPfomN.gif' }),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0001-2gPfomN.gif',
      );
      assert.equal(
        gifFn({ gif_path: '0001-2gPfomN.gif' }),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0001-2gPfomN.gif',
      );
      assert.equal(
        gifFn('videos/0001-2gPfomN.gif'),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0001-2gPfomN.gif',
      );
      assert.equal(
        gifFn('/videos/0001-2gPfomN.gif'),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0001-2gPfomN.gif',
      );
      assert.equal(
        gifFn('https://example.com/custom-video.gif'),
        'https://example.com/custom-video.gif',
      );
      assert.equal(gifFn(null), null);
      assert.equal(gifFn({}), null);
      assert.equal(gifFn(''), null);
    }
  });

  test('thumbUrl and gifUrl resolve session exercise snapshot objects correctly', () => {
    for (const [thumbFn, gifFn] of [
      [apiThumbUrl, apiGifUrl],
      [frontThumbUrl, frontGifUrl],
    ]) {
      const sessionExerciseCatalog = {
        id: 'session-ex-1',
        session_id: 'session-1',
        exercise_id: 'ex-catalog-1316',
        exercise_name_snapshot: 'barbell bent arm pullover',
        thumb_path: 'images/1316-j599l3T.jpg',
        gif_path: 'videos/1316-j599l3T.gif',
        attribution: '© Gym visual — https://gymvisual.com/',
        source: 'catalog',
      };

      assert.equal(
        thumbFn(sessionExerciseCatalog),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/1316-j599l3T.jpg',
      );
      assert.equal(
        gifFn(sessionExerciseCatalog),
        'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1316-j599l3T.gif',
      );

      const sessionExerciseCustom = {
        id: 'session-ex-2',
        session_id: 'session-1',
        exercise_id: 'ex-custom-1',
        exercise_name_snapshot: 'Flexão Customizada',
        thumb_path: null,
        gif_path: null,
        attribution: null,
        source: 'custom',
      };

      assert.equal(thumbFn(sessionExerciseCustom), null);
      assert.equal(gifFn(sessionExerciseCustom), null);
    }
  });
});

describe('Treinos V4 Fase 4 — Biblioteca UI helpers & formatting', () => {
  test('formatBodyPart translates canonical and raw body parts to PT', () => {
    for (const fn of [apiFormatBodyPart, frontFormatBodyPart]) {
      assert.equal(fn('chest'), 'Peitoral');
      assert.equal(fn('back'), 'Costas');
      assert.equal(fn('upper arms'), 'Braços');
      assert.equal(fn('shoulders'), 'Ombros');
      assert.equal(fn('upper legs'), 'Pernas');
      assert.equal(fn('waist'), 'Abdômen');
      assert.equal(fn('lower legs'), 'Panturrilhas');
      assert.equal(fn('lower arms'), 'Antebraço');
      assert.equal(fn('cardio'), 'Cardio');
      assert.equal(fn(null), null);
      assert.equal(fn(''), null);
      assert.equal(fn('custom_part'), 'custom_part');
    }
  });

  test('formatEquipment translates equipment keys to PT', () => {
    for (const fn of [apiFormatEquipment, frontFormatEquipment]) {
      assert.equal(fn('body weight'), 'Peso corporal');
      assert.equal(fn('dumbbell'), 'Halteres');
      assert.equal(fn('barbell'), 'Barra');
      assert.equal(fn('cable'), 'Polia / Cabo');
      assert.equal(fn('leverage machine'), 'Máquina');
      assert.equal(fn('band'), 'Elástico');
      assert.equal(fn('smith machine'), 'Smith');
      assert.equal(fn('kettlebell'), 'Kettlebell');
      assert.equal(fn(null), null);
    }
  });

  test('formatMuscleName returns translated canonical PT name or raw string', () => {
    for (const fn of [apiFormatMuscleName, frontFormatMuscleName]) {
      assert.equal(fn('pectorals'), 'Peitoral');
      assert.equal(fn('lats'), 'Dorsal');
      assert.equal(fn('biceps'), 'Bíceps');
      assert.equal(fn('quads'), 'Quadríceps');
      assert.equal(fn('abs'), 'Abdômen');
      assert.equal(fn('delts'), 'Deltoides');
      assert.equal(fn(null), null);
    }
  });

  test('extractInstructionSteps handles EN/PT step arrays and string JSON', () => {
    for (const fn of [apiExtractInstructionSteps, frontExtractInstructionSteps]) {
      const enSteps = ['Lie flat on bench', 'Lower bar to mid chest', 'Press up to lock out'];
      assert.deepEqual(fn({ instructions_json: JSON.stringify({ en: enSteps }) }), enSteps);
      assert.deepEqual(fn({ instructions_json: { en: enSteps } }), enSteps);

      const ptSteps = ['Deite no banco', 'Desça a barra'];
      assert.deepEqual(fn({ instructions_json: { en: enSteps, pt: ptSteps } }), ptSteps);

      const arrayJson = ['Passo 1', 'Passo 2'];
      assert.deepEqual(fn({ instructions_json: JSON.stringify(arrayJson) }), arrayJson);

      const plainText = 'Passo 1\nPasso 2';
      assert.deepEqual(fn({ instructions: plainText }), ['Passo 1', 'Passo 2']);

      assert.deepEqual(fn(null), []);
      assert.deepEqual(fn({}), []);
    }
  });

  test('preferSteps prefers PT when present, falls back to EN, and respects lang param', () => {
    for (const fn of [apiPreferSteps, frontPreferSteps]) {
      const enSteps = ['Step 1: Setup', 'Step 2: Press'];
      const ptSteps = ['Passo 1: Preparação', 'Passo 2: Empurrar'];

      // 1. Only EN present -> default (pt) returns EN
      const enOnly = { instructions_json: JSON.stringify({ en: enSteps, pt: [] }) };
      assert.deepEqual(fn(enOnly), enSteps);
      assert.deepEqual(fn(enOnly, 'pt'), enSteps);
      assert.deepEqual(fn(enOnly, 'en'), enSteps);

      // 2. Both PT and EN present -> default (pt) returns PT, en returns EN
      const both = { instructions_json: { en: enSteps, pt: ptSteps } };
      assert.deepEqual(fn(both), ptSteps);
      assert.deepEqual(fn(both, 'pt'), ptSteps);
      assert.deepEqual(fn(both, 'en'), enSteps);

      // 3. Only PT present -> lang=en falls back to PT
      const ptOnly = { instructions_json: { en: [], pt: ptSteps } };
      assert.deepEqual(fn(ptOnly, 'pt'), ptSteps);
      assert.deepEqual(fn(ptOnly, 'en'), ptSteps);

      // 4. Raw array JSON
      assert.deepEqual(fn({ instructions_json: JSON.stringify(['Passo A', 'Passo B']) }), ['Passo A', 'Passo B']);

      // 5. Plain text / custom instructions
      assert.deepEqual(fn({ instructions: 'Passo 1\nPasso 2' }), ['Passo 1', 'Passo 2']);

      // 6. Direct JSON string passed as exercise
      assert.deepEqual(fn(JSON.stringify({ en: enSteps, pt: ptSteps })), ptSteps);

      // 7. Edge cases
      assert.deepEqual(fn(null), []);
      assert.deepEqual(fn(undefined), []);
      assert.deepEqual(fn({}), []);
      assert.deepEqual(fn({ instructions_json: 'invalid json', instructions: 'Fallback line' }), ['Fallback line']);
    }
  });

  test('extractSecondaryMuscles parses JSON arrays, objects, and lists', () => {
    for (const fn of [apiExtractSecondaryMuscles, frontExtractSecondaryMuscles]) {
      assert.deepEqual(fn({ secondary_muscles_json: '["triceps", "deltoids"]' }), ['triceps', 'deltoids']);
      assert.deepEqual(fn({ secondary_muscles: ['triceps', 'deltoids'] }), ['triceps', 'deltoids']);
      assert.deepEqual(fn({ secondary_muscles_json: 'triceps, deltoids' }), ['triceps', 'deltoids']);
      assert.deepEqual(fn(null), []);
    }
  });
});

describe('workoutV4Core — feature flags & backward compatibility', () => {
  test('isTreinosV4Enabled evaluates boolean and string flags correctly', () => {
    assert.equal(apiIsTreinosV4Enabled({ VITE_TREINOS_V4: '1' }), true);
    assert.equal(apiIsTreinosV4Enabled({ VITE_TREINOS_V4: 'true' }), true);
    assert.equal(apiIsTreinosV4Enabled({ VITE_TREINOS_V4: true }), true);
    assert.equal(apiIsTreinosV4Enabled({ VITE_TREINOS_V4: '0' }), false);
    assert.equal(apiIsTreinosV4Enabled({ VITE_TREINOS_V4: 'false' }), false);
    assert.equal(apiIsTreinosV4Enabled({ VITE_TREINOS_V4: false }), false);
    assert.equal(apiIsTreinosV4Enabled({}), false);
    assert.equal(apiIsTreinosV4Enabled(undefined), false);

    // Front helper default unset is false
    assert.equal(frontIsTreinosV4Enabled(), false);
  });

  test('src/lib/workouts.js preserves legacy workout helpers alongside V4 path', () => {
    assert.equal(formatRestDuration(90), '1:30');
  });
});

describe('workoutV4Core — Fase 6 PR detection and wake lock', () => {
  test('detectPersonalRecord: warmup sets never count as PR', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', weight_kg: 50, reps: 10, set_role: 'work' },
      ];
      // Warmup heavier than previous work set
      const warmupSet = { weight_kg: 80, reps: 5, set_role: 'warmup' };
      const res = detectFn(warmupSet, history);
      assert.equal(res.is_pr, false);
      assert.equal(res.pr_type, null);
    }
  });

  test('detectPersonalRecord: first completed work set establishes baseline (not a PR)', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const firstSet = { weight_kg: 50, reps: 10, set_role: 'work' };
      const res = detectFn(firstSet, []);
      assert.equal(res.is_pr, false);
      assert.equal(res.pr_type, null);
    }
  });

  test('detectPersonalRecord: higher weight breaks personal record', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', weight_kg: 50, reps: 10, set_role: 'work' },
        { id: 's2', weight_kg: 55, reps: 8, set_role: 'work' },
      ];
      const heavierSet = { weight_kg: 60, reps: 6, set_role: 'work' };
      const res = detectFn(heavierSet, history);
      assert.equal(res.is_pr, true);
      assert.equal(res.pr_type, 'weight');
      assert.ok(res.reason?.includes('55'));
    }
  });

  test('detectPersonalRecord: same weight with higher reps breaks personal record', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', weight_kg: 60, reps: 6, set_role: 'work' },
        { id: 's2', weight_kg: 50, reps: 12, set_role: 'work' },
      ];
      const moreRepsSet = { weight_kg: 60, reps: 10, set_role: 'work' };
      const res = detectFn(moreRepsSet, history);
      assert.equal(res.is_pr, true);
      assert.equal(res.pr_type, 'reps');
      assert.ok(res.reason?.includes('6'));
    }
  });

  test('detectPersonalRecord: weaker weight or lower reps does not break PR', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', weight_kg: 60, reps: 10, set_role: 'work' },
      ];
      // Lighter weight
      assert.equal(detectFn({ weight_kg: 50, reps: 8, set_role: 'work' }, history).is_pr, false);
      // Same weight, fewer reps
      assert.equal(detectFn({ weight_kg: 60, reps: 8, set_role: 'work' }, history).is_pr, false);
      // Same weight, same reps
      assert.equal(detectFn({ weight_kg: 60, reps: 10, set_role: 'work' }, history).is_pr, false);
    }
  });

  test('detectPersonalRecord: bodyweight reps increase breaks PR', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', reps: 12, set_role: 'work' },
        { id: 's2', reps: 10, set_role: 'work' },
      ];
      const moreReps = { reps: 15, set_role: 'work' };
      const res = detectFn(moreReps, history);
      assert.equal(res.is_pr, true);
      assert.equal(res.pr_type, 'reps');

      const fewerReps = { reps: 11, set_role: 'work' };
      assert.equal(detectFn(fewerReps, history).is_pr, false);
    }
  });

  test('detectPersonalRecord: duration increase breaks PR', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', duration_seconds: 60, set_role: 'work' },
      ];
      const longer = { duration_seconds: 75, set_role: 'work' };
      const res = detectFn(longer, history);
      assert.equal(res.is_pr, true);
      assert.equal(res.pr_type, 'duration');

      const shorter = { duration_seconds: 50, set_role: 'work' };
      assert.equal(detectFn(shorter, history).is_pr, false);
    }
  });

  test('detectPersonalRecord: distance increase breaks PR', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', distance_m: 500, set_role: 'work' },
      ];
      const further = { distance_m: 600, set_role: 'work' };
      const res = detectFn(further, history);
      assert.equal(res.is_pr, true);
      assert.equal(res.pr_type, 'distance');

      const shorter = { distance_m: 400, set_role: 'work' };
      assert.equal(detectFn(shorter, history).is_pr, false);
    }
  });

  test('detectPersonalRecord: same distance faster time breaks duration PR', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', distance_m: 500, duration_seconds: 120, set_role: 'work' },
      ];
      const faster = { distance_m: 500, duration_seconds: 100, set_role: 'work' };
      const res = detectFn(faster, history);
      assert.equal(res.is_pr, true);
      assert.equal(res.pr_type, 'duration');

      const slower = { distance_m: 500, duration_seconds: 130, set_role: 'work' };
      assert.equal(detectFn(slower, history).is_pr, false);
    }
  });

  test('detectPersonalRecord: previous warmup sets in history are ignored when evaluating work PR', () => {
    for (const detectFn of [apiDetectPersonalRecord, frontDetectPersonalRecord]) {
      const history = [
        { id: 's1', weight_kg: 80, reps: 5, set_role: 'warmup' },
        { id: 's2', weight_kg: 60, reps: 8, set_role: 'work' },
      ];
      // Candidate work set of 70kg is higher than max work (60kg), even though warmup was 80kg
      const workSet = { weight_kg: 70, reps: 6, set_role: 'work' };
      const res = detectFn(workSet, history);
      assert.equal(res.is_pr, true);
      assert.equal(res.pr_type, 'weight');
    }
  });

  test('formatPrToastDescription formats user-friendly Portuguese toast descriptions', () => {
    for (const formatFn of [apiFormatPrToastDescription, frontFormatPrToastDescription]) {
      const ex = { exercise_name_snapshot: 'Supino Reto' };

      assert.equal(
        formatFn({ pr_type: 'weight', weight_kg: 80, reps: 8 }, ex),
        'Supino Reto: 80 kg (8 reps)'
      );

      assert.equal(
        formatFn({ pr_type: 'reps', reps: 12 }, { name: 'Barra Fixa' }),
        'Barra Fixa: 12 reps'
      );

      assert.equal(
        formatFn({ pr_type: 'reps', reps: 10, weight_kg: 60 }, { name: 'Agachamento' }),
        'Agachamento: 10 reps com 60 kg'
      );

      assert.equal(
        formatFn({ pr_type: 'duration', duration_seconds: 60 }, { name: 'Prancha' }),
        'Prancha: 60s'
      );

      assert.equal(
        formatFn({ pr_type: 'distance', distance_m: 1000 }, { name: 'Corrida' }),
        'Corrida: 1000 m'
      );
    }
  });

  test('isWakeLockSupported detects screen wake lock support accurately', () => {
    for (const checkFn of [apiIsWakeLockSupported, frontIsWakeLockSupported]) {
      const mockSupported = { wakeLock: { request: () => Promise.resolve({}) } };
      assert.equal(checkFn(mockSupported), true);

      const mockUnsupported = {};
      assert.equal(checkFn(mockUnsupported), false);

      assert.equal(checkFn(null), false);
      assert.equal(checkFn(undefined), false);
    }
  });
});

describe('workoutV4Core — Fase 7 set prefill & weight cascade', () => {
  test('EMPTY_SET_FORM has expected structure and matches between api and front', () => {
    const expected = {
      weight_kg: '',
      reps: '',
      duration_seconds: '',
      distance_m: '',
      band_level: '',
      set_role: 'work',
      rir: '',
      technical_quality: '',
      note: '',
    };
    assert.deepEqual(API_EMPTY_SET_FORM, expected);
    assert.deepEqual(FRONT_EMPTY_SET_FORM, expected);
  });

  test('getWorkSets and getWarmupSets separate roles accurately', () => {
    for (const [getWork, getWarmup] of [
      [apiGetWorkSets, apiGetWarmupSets],
      [frontGetWorkSets, frontGetWarmupSets],
    ]) {
      const sets = [
        { id: 's1', set_role: 'warmup', weight_kg: 40 },
        { id: 's2', set_role: 'work', weight_kg: 80 },
        { id: 's3', set_role: null, weight_kg: 85 }, // legacy null role behaves as work
        { id: 's4', set_role: 'warmup', weight_kg: 50 },
      ];

      const work = getWork(sets);
      assert.equal(work.length, 2);
      assert.deepEqual(work.map((s) => s.id), ['s2', 's3']);

      const warmups = getWarmup(sets);
      assert.equal(warmups.length, 2);
      assert.deepEqual(warmups.map((s) => s.id), ['s1', 's4']);

      assert.deepEqual(getWork(null), []);
      assert.deepEqual(getWarmup(null), []);
    }
  });

  test('getLastWorkSet and getLastWarmupSet retrieve latest completed sets', () => {
    for (const [lastWorkFn, lastWarmupFn] of [
      [apiGetLastWorkSet, apiGetLastWarmupSet],
      [frontGetLastWorkSet, frontGetLastWarmupSet],
    ]) {
      const sets = [
        { id: 'w1', set_role: 'warmup', weight_kg: 40 },
        { id: 'k1', set_role: 'work', weight_kg: 80 },
        { id: 'w2', set_role: 'warmup', weight_kg: 60 },
        { id: 'k2', set_role: 'work', weight_kg: 85 },
      ];

      assert.equal(lastWorkFn(sets)?.id, 'k2');
      assert.equal(lastWarmupFn(sets)?.id, 'w2');
      assert.equal(lastWorkFn([]), null);
      assert.equal(lastWarmupFn([]), null);
    }
  });

  test('computeSetPrefill: returns empty form with target defaults when no history exists', () => {
    for (const prefillFn of [apiComputeSetPrefill, frontComputeSetPrefill]) {
      const exercise = {
        id: 'ex-1',
        target_duration_seconds: 45,
        sets: [],
        previous_sets: [],
      };

      const res = prefillFn(exercise, 'work');
      assert.equal(res.weight_kg, '');
      assert.equal(res.reps, '');
      assert.equal(res.duration_seconds, 45);
      assert.equal(res.distance_m, '');
      assert.equal(res.band_level, '');
      assert.equal(res.set_role, 'work');
      assert.equal(res.rir, '');
      assert.equal(res.note, '');
    }
  });

  test('computeSetPrefill: prefills from previous session work sets when current session has no work sets', () => {
    for (const prefillFn of [apiComputeSetPrefill, frontComputeSetPrefill]) {
      const exercise = {
        id: 'ex-1',
        sets: [],
        previous_sets: [
          { weight_kg: 80, reps: 10, rir: 2, band_level: 'medium', set_role: 'work' },
          { weight_kg: 85, reps: 8, rir: 1, band_level: 'medium', set_role: 'work' },
        ],
      };

      const res = prefillFn(exercise, 'work');
      assert.equal(res.weight_kg, 80);
      assert.equal(res.reps, 10);
      assert.equal(res.rir, '2');
      assert.equal(res.band_level, 'medium');
      assert.equal(res.set_role, 'work');
    }
  });

  test('computeSetPrefill: CRITICAL — warmup sets in current session NEVER prefill work sets', () => {
    for (const prefillFn of [apiComputeSetPrefill, frontComputeSetPrefill]) {
      const exerciseWithWarmupOnly = {
        id: 'ex-1',
        sets: [
          { id: 's1', set_role: 'warmup', weight_kg: 40, reps: 15, rir: 4 },
          { id: 's2', set_role: 'warmup', weight_kg: 60, reps: 10, rir: 3 },
        ],
        previous_sets: [],
      };

      // Work set should be empty — must not take 60kg or 10 reps from warmup
      const workPrefill = prefillFn(exerciseWithWarmupOnly, 'work');
      assert.equal(workPrefill.weight_kg, '');
      assert.equal(workPrefill.reps, '');
      assert.equal(workPrefill.rir, '');
      assert.equal(workPrefill.set_role, 'work');

      // With previous session work sets, work prefill should pull from previous session work set
      const exerciseWithWarmupAndPrevWork = {
        id: 'ex-1',
        sets: [
          { id: 's1', set_role: 'warmup', weight_kg: 50, reps: 12 },
        ],
        previous_sets: [
          { weight_kg: 100, reps: 6, rir: 1, set_role: 'work' },
        ],
      };

      const workWithPrev = prefillFn(exerciseWithWarmupAndPrevWork, 'work');
      assert.equal(workWithPrev.weight_kg, 100);
      assert.equal(workWithPrev.reps, 6);
      assert.equal(workWithPrev.rir, '1');
    }
  });

  test('computeSetPrefill: CRITICAL — warmup sets in previous session history NEVER prefill work sets', () => {
    for (const prefillFn of [apiComputeSetPrefill, frontComputeSetPrefill]) {
      const exercise = {
        id: 'ex-1',
        sets: [],
        previous_sets: [
          { id: 'prev-w', set_role: 'warmup', weight_kg: 40, reps: 20 },
          { id: 'prev-k', set_role: 'work', weight_kg: 90, reps: 8, rir: 2 },
        ],
      };

      const res = prefillFn(exercise, 'work');
      assert.equal(res.weight_kg, 90);
      assert.equal(res.reps, 8);
      assert.equal(res.rir, '2');
      assert.equal(res.set_role, 'work');

      // Only warmups in previous session -> empty work prefill
      const exerciseWarmupsOnlyInPrev = {
        id: 'ex-1',
        sets: [],
        previous_sets: [
          { id: 'prev-w1', set_role: 'warmup', weight_kg: 40, reps: 20 },
          { id: 'prev-w2', set_role: 'warmup', weight_kg: 50, reps: 15 },
        ],
      };

      const emptyRes = prefillFn(exerciseWarmupsOnlyInPrev, 'work');
      assert.equal(emptyRes.weight_kg, '');
      assert.equal(emptyRes.reps, '');
    }
  });

  test('computeSetPrefill: weight cascade propagates current session work set load to next sets', () => {
    for (const prefillFn of [apiComputeSetPrefill, frontComputeSetPrefill]) {
      // Step 1: User completes work set 1 with 80kg, 10 reps, RIR 2
      const exerciseAfterSet1 = {
        id: 'ex-1',
        target_sets: 3,
        sets: [
          { id: 'set-1', set_role: 'work', weight_kg: 80, reps: 10, rir: 2 },
        ],
        previous_sets: [
          { weight_kg: 75, reps: 10, set_role: 'work' },
          { weight_kg: 75, reps: 10, set_role: 'work' },
        ],
      };

      const set2Prefill = prefillFn(exerciseAfterSet1, 'work');
      assert.equal(set2Prefill.weight_kg, 80);
      assert.equal(set2Prefill.reps, 10);
      assert.equal(set2Prefill.rir, '2');

      // Step 2: User increases weight to 85kg on work set 2
      const exerciseAfterSet2 = {
        id: 'ex-1',
        target_sets: 3,
        sets: [
          { id: 'set-1', set_role: 'work', weight_kg: 80, reps: 10, rir: 2 },
          { id: 'set-2', set_role: 'work', weight_kg: 85, reps: 8, rir: 1 },
        ],
        previous_sets: exerciseAfterSet1.previous_sets,
      };

      const set3Prefill = prefillFn(exerciseAfterSet2, 'work');
      assert.equal(set3Prefill.weight_kg, 85);
      assert.equal(set3Prefill.reps, 8);
      assert.equal(set3Prefill.rir, '1');
    }
  });

  test('computeSetPrefill: warmup role targets prefill from previous warmup or stay clean', () => {
    for (const prefillFn of [apiComputeSetPrefill, frontComputeSetPrefill]) {
      const exerciseWithWarmup = {
        id: 'ex-1',
        sets: [
          { id: 'w1', set_role: 'warmup', weight_kg: 40, reps: 15 },
          { id: 'k1', set_role: 'work', weight_kg: 90, reps: 8 },
        ],
        previous_sets: [],
      };

      const warmupPrefill = prefillFn(exerciseWithWarmup, 'warmup');
      assert.equal(warmupPrefill.weight_kg, 40);
      assert.equal(warmupPrefill.reps, 15);
      assert.equal(warmupPrefill.set_role, 'warmup');
      assert.equal(warmupPrefill.rir, ''); // RIR is empty on warmups
    }
  });

  test('cascadeWeightToUnfilledSlots computes remaining slot suggestions', () => {
    for (const cascadeFn of [apiCascadeWeightToUnfilledSlots, frontCascadeWeightToUnfilledSlots]) {
      const exercise = {
        target_sets: 4,
        sets: [
          { id: 's1', set_role: 'warmup', weight_kg: 40 },
          { id: 's2', set_role: 'work', weight_kg: 80 },
        ],
      };

      const slots = cascadeFn(exercise, 80);
      assert.equal(slots.length, 3); // target 4 - 1 work done = 3 remaining
      assert.deepEqual(slots, [
        { slot_index: 1, suggested_weight_kg: 80 },
        { slot_index: 2, suggested_weight_kg: 80 },
        { slot_index: 3, suggested_weight_kg: 80 },
      ]);

      assert.deepEqual(cascadeFn(null, 80), []);
    }
  });
});

describe('workoutV4Core — Fase 8 1RM Epley calculation', () => {
  test('estimate1rm: reps === 1 returns exact weight', () => {
    for (const estFn of [apiEstimate1rm, frontEstimate1rm]) {
      assert.equal(estFn(100, 1), 100);
      assert.equal(estFn(82.5, 1), 82.5);
      assert.equal(estFn(60, 1), 60);
      assert.equal(estFn("75.5", "1"), 75.5);
    }
  });

  test('estimate1rm: calculates Epley formula weight * (1 + reps/30) rounded to 1 decimal', () => {
    for (const estFn of [apiEstimate1rm, frontEstimate1rm]) {
      // 100 * (1 + 10/30) = 133.333... -> 133.3
      assert.equal(estFn(100, 10), 133.3);

      // 80 * (1 + 8/30) = 101.333... -> 101.3
      assert.equal(estFn(80, 8), 101.3);

      // 60 * (1 + 12/30) = 60 * 1.4 = 84
      assert.equal(estFn(60, 12), 84);

      // 50 * (1 + 5/30) = 58.333... -> 58.3
      assert.equal(estFn(50, 5), 58.3);

      // 100 * (1 + 6/30) = 120
      assert.equal(estFn(100, 6), 120);

      // 100 * (1 + 30/30) = 200
      assert.equal(estFn(100, 30), 200);

      // String inputs
      assert.equal(estFn("80", "8"), 101.3);
      assert.equal(estFn("100", "10"), 133.3);
    }
  });

  test('estimate1rm: handles edge cases and invalid values safely', () => {
    for (const estFn of [apiEstimate1rm, frontEstimate1rm]) {
      assert.equal(estFn(null, 10), null);
      assert.equal(estFn(undefined, 10), null);
      assert.equal(estFn(100, null), null);
      assert.equal(estFn(100, undefined), null);
      assert.equal(estFn("", 10), null);
      assert.equal(estFn(100, ""), null);

      // Zero or negative weight
      assert.equal(estFn(0, 10), null);
      assert.equal(estFn(-50, 10), null);

      // Zero or negative reps
      assert.equal(estFn(100, 0), null);
      assert.equal(estFn(100, -5), null);

      // Non-numeric
      assert.equal(estFn("abc", 10), null);
      assert.equal(estFn(100, "xyz"), null);
      assert.equal(estFn(NaN, 10), null);
      assert.equal(estFn(100, NaN), null);
    }
  });

  test('bestEstimated1rm: finds maximum 1RM over work sets', () => {
    for (const bestFn of [apiBestEstimated1rm, frontBestEstimated1rm]) {
      const sets = [
        { id: "s1", weight_kg: 80, reps: 8, set_role: "work" }, // 101.3
        { id: "s2", weight_kg: 85, reps: 6, set_role: "work" }, // 85 * 1.2 = 102
        { id: "s3", weight_kg: 90, reps: 3, set_role: "work" }, // 90 * 1.1 = 99
      ];
      assert.equal(bestFn(sets), 102);
    }
  });

  test('bestEstimated1rm: CRITICAL — warmup sets are strictly excluded', () => {
    for (const bestFn of [apiBestEstimated1rm, frontBestEstimated1rm]) {
      // Warmup is heavier and has higher estimated 1RM than work set
      const sets = [
        { id: "w1", weight_kg: 100, reps: 10, set_role: "warmup" }, // 133.3 (warmup)
        { id: "k1", weight_kg: 80, reps: 5, set_role: "work" },     // 93.3 (work)
      ];
      assert.equal(bestFn(sets), 93.3);

      // Warmup only returns null
      const warmupOnly = [
        { id: "w1", weight_kg: 100, reps: 10, set_role: "warmup" },
        { id: "w2", weight_kg: 120, reps: 5, set_role: "warmup" },
      ];
      assert.equal(bestFn(warmupOnly), null);
    }
  });

  test('bestEstimated1rm: handles empty or invalid sets array', () => {
    for (const bestFn of [apiBestEstimated1rm, frontBestEstimated1rm]) {
      assert.equal(bestFn([]), null);
      assert.equal(bestFn(null), null);
      assert.equal(bestFn(undefined), null);
      assert.equal(bestFn([{ id: "s1", reps: 10 }]), null); // No weight
      assert.equal(bestFn([{ id: "s1", weight_kg: 0, reps: 10 }]), null); // 0 weight
    }
  });

  test('format1rm: formats number with 1 decimal in pt-BR locale', () => {
    for (const formatFn of [apiFormat1rm, frontFormat1rm]) {
      assert.equal(formatFn(101.3), "101,3 kg");
      assert.equal(formatFn(100), "100 kg");
      assert.equal(formatFn(82.5), "82,5 kg");
      assert.equal(formatFn(null), null);
      assert.equal(formatFn(undefined), null);
      assert.equal(formatFn(0), null);
      assert.equal(formatFn(-5), null);
      assert.equal(formatFn(""), null);
    }
  });
});


describe("workoutV4Core — Fase 9 Muscle Map Balance", () => {
  test("computeBalanceMap: returns all 18 canonical muscles with zero volume when empty", () => {
    for (const computeFn of [apiComputeBalanceMap, frontComputeBalanceMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const res = computeFn([], { days: 14, now });

      assert.equal(res.mode, "balance");
      assert.equal(res.days, 14);
      assert.equal(res.muscles.length, 18);
      assert.equal(res.window.from, "2026-08-08T20:00:00.000Z");
      assert.equal(res.window.to, "2026-08-22T20:00:00.000Z");
      assert.deepEqual(res.ranked.most, []);
      assert.equal(res.ranked.least.length, 18);

      for (const m of res.muscles) {
        assert.equal(typeof m.id, "string");
        assert.equal(typeof m.label, "string");
        assert.equal(m.score, 0);
        assert.equal(m.raw, 0);
        assert.equal(m.unit, "sets");
      }
    }
  });

  test("computeBalanceMap: bench press gives 1.0 to chest and 0.4 to secondaries (triceps, deltoids)", () => {
    for (const computeFn of [apiComputeBalanceMap, frontComputeBalanceMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-20T10:00:00.000Z",
          target_muscle: "chest",
          secondary_muscles_json: JSON.stringify(["triceps", "deltoids"]),
        },
      ];

      const res = computeFn(sets, { days: 14, now });
      const chest = res.muscles.find((m) => m.id === "chest");
      const triceps = res.muscles.find((m) => m.id === "triceps");
      const delts = res.muscles.find((m) => m.id === "deltoids");
      const legs = res.muscles.find((m) => m.id === "quadriceps");

      assert.equal(chest.raw, 1.0);
      assert.equal(chest.score, 1.0); // max raw = 1.0 -> 1.0 / 1.0 = 1.0
      assert.equal(triceps.raw, 0.4);
      assert.equal(triceps.score, 0.4);
      assert.equal(delts.raw, 0.4);
      assert.equal(delts.score, 0.4);
      assert.equal(legs.raw, 0.0);
      assert.equal(legs.score, 0.0);

      assert.deepEqual(res.ranked.most, ["chest", "deltoids", "triceps"]);
    }
  });

  test("computeBalanceMap: row gives 1.0 to upper-back and 0.4 to biceps", () => {
    for (const computeFn of [apiComputeBalanceMap, frontComputeBalanceMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-21T10:00:00.000Z",
          target_muscle: "upper-back",
          secondary_muscles_json: JSON.stringify(["biceps"]),
        },
      ];

      const res = computeFn(sets, { days: 14, now });
      const back = res.muscles.find((m) => m.id === "upper-back");
      const biceps = res.muscles.find((m) => m.id === "biceps");

      assert.equal(back.raw, 1.0);
      assert.equal(back.score, 1.0);
      assert.equal(biceps.raw, 0.4);
      assert.equal(biceps.score, 0.4);
    }
  });

  test("computeBalanceMap: accumulates volume across multiple exercises with weighted balance", () => {
    for (const computeFn of [apiComputeBalanceMap, frontComputeBalanceMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        // 3 sets of Bench Press
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-20T10:00:00.000Z",
          target_muscle: "chest",
          secondary_muscles_json: JSON.stringify(["triceps", "deltoids"]),
        },
        {
          id: "s2",
          set_role: "work",
          completed_at: "2026-08-20T10:05:00.000Z",
          target_muscle: "chest",
          secondary_muscles_json: JSON.stringify(["triceps", "deltoids"]),
        },
        {
          id: "s3",
          set_role: "work",
          completed_at: "2026-08-20T10:10:00.000Z",
          target_muscle: "chest",
          secondary_muscles_json: JSON.stringify(["triceps", "deltoids"]),
        },
        // 2 sets of Barbell Row
        {
          id: "s4",
          set_role: "work",
          completed_at: "2026-08-21T10:00:00.000Z",
          target_muscle: "upper-back",
          secondary_muscles_json: JSON.stringify(["biceps"]),
        },
        {
          id: "s5",
          set_role: "work",
          completed_at: "2026-08-21T10:05:00.000Z",
          target_muscle: "upper-back",
          secondary_muscles_json: JSON.stringify(["biceps"]),
        },
      ];

      const res = computeFn(sets, { days: 14, now });
      const chest = res.muscles.find((m) => m.id === "chest");
      const back = res.muscles.find((m) => m.id === "upper-back");
      const triceps = res.muscles.find((m) => m.id === "triceps");
      const delts = res.muscles.find((m) => m.id === "deltoids");
      const biceps = res.muscles.find((m) => m.id === "biceps");

      // Chest: 3 * 1.0 = 3.0 (maxRaw)
      assert.equal(chest.raw, 3.0);
      assert.equal(chest.score, 1.0);

      // Upper back: 2 * 1.0 = 2.0 -> 2.0 / 3.0 = 0.67
      assert.equal(back.raw, 2.0);
      assert.equal(back.score, 0.67);

      // Triceps: 3 * 0.4 = 1.2 -> 1.2 / 3.0 = 0.4
      assert.equal(triceps.raw, 1.2);
      assert.equal(triceps.score, 0.4);

      // Deltoids: 3 * 0.4 = 1.2 -> 1.2 / 3.0 = 0.4
      assert.equal(delts.raw, 1.2);
      assert.equal(delts.score, 0.4);

      // Biceps: 2 * 0.4 = 0.8 -> 0.8 / 3.0 = 0.27
      assert.equal(biceps.raw, 0.8);
      assert.equal(biceps.score, 0.27);
    }
  });

  test("computeBalanceMap: strictly excludes warmup sets", () => {
    for (const computeFn of [apiComputeBalanceMap, frontComputeBalanceMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        {
          id: "w1",
          set_role: "warmup",
          completed_at: "2026-08-20T10:00:00.000Z",
          target_muscle: "chest",
        },
        {
          id: "w2",
          set_role: "warmup",
          completed_at: "2026-08-20T10:02:00.000Z",
          target_muscle: "chest",
        },
        {
          id: "k1",
          set_role: "work",
          completed_at: "2026-08-20T10:05:00.000Z",
          target_muscle: "chest",
        },
      ];

      const res = computeFn(sets, { days: 14, now });
      const chest = res.muscles.find((m) => m.id === "chest");
      assert.equal(chest.raw, 1.0); // Only 1 work set
    }
  });

  test("computeBalanceMap: excludes abandoned or incomplete sessions", () => {
    for (const computeFn of [apiComputeBalanceMap, frontComputeBalanceMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        {
          id: "s1",
          session_status: "abandoned",
          set_role: "work",
          completed_at: "2026-08-20T10:00:00.000Z",
          target_muscle: "chest",
        },
        {
          id: "s2",
          session_status: "completed",
          set_role: "work",
          completed_at: "2026-08-20T10:05:00.000Z",
          target_muscle: "upper-back",
        },
      ];

      const res = computeFn(sets, { days: 14, now });
      const chest = res.muscles.find((m) => m.id === "chest");
      const back = res.muscles.find((m) => m.id === "upper-back");

      assert.equal(chest.raw, 0);
      assert.equal(back.raw, 1.0);
    }
  });

  test("computeBalanceMap: filters strictly within the day window", () => {
    for (const computeFn of [apiComputeBalanceMap, frontComputeBalanceMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        // 20 days ago (outside 14-day window)
        {
          id: "old",
          set_role: "work",
          completed_at: "2026-08-01T10:00:00.000Z",
          target_muscle: "quadriceps",
        },
        // 5 days ago (inside 14-day window)
        {
          id: "recent",
          set_role: "work",
          completed_at: "2026-08-17T10:00:00.000Z",
          target_muscle: "chest",
        },
      ];

      const res14 = computeFn(sets, { days: 14, now });
      assert.equal(res14.muscles.find((m) => m.id === "quadriceps").raw, 0);
      assert.equal(res14.muscles.find((m) => m.id === "chest").raw, 1.0);

      // With 28-day window, both are included
      const res28 = computeFn(sets, { days: 28, now });
      assert.equal(res28.muscles.find((m) => m.id === "quadriceps").raw, 1.0);
      assert.equal(res28.muscles.find((m) => m.id === "chest").raw, 1.0);
    }
  });

  test("computeBalanceMap: supports custom exercises with muscle_group / body_part fallback", () => {
    for (const computeFn of [apiComputeBalanceMap, frontComputeBalanceMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        {
          id: "custom1",
          set_role: "work",
          completed_at: "2026-08-20T10:00:00.000Z",
          muscle_group: "Costas",
        },
        {
          id: "custom2",
          set_role: "work",
          completed_at: "2026-08-20T10:05:00.000Z",
          body_part: "waist",
        },
      ];

      const res = computeFn(sets, { days: 14, now });
      const back = res.muscles.find((m) => m.id === "upper-back");
      const abs = res.muscles.find((m) => m.id === "abs");

      assert.equal(back.raw, 1.0);
      assert.equal(abs.raw, 1.0);
    }
  });
});

describe("workoutV4Core — Fase 10 Muscle Map Fatigue & Strength", () => {
  test("computeMuscleMap: fatigue mode applies exponential decay (halfLife = 7 days)", () => {
    for (const computeFn of [apiComputeMuscleMap, frontComputeMuscleMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        // Set 1: Today (0 days ago) -> decay = 1.0
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-22T20:00:00.000Z",
          target_muscle: "chest",
        },
        // Set 2: Exactly 7 days ago (1 halfLife) -> decay = 0.5
        {
          id: "s2",
          set_role: "work",
          completed_at: "2026-08-15T20:00:00.000Z",
          target_muscle: "upper-back",
        },
        // Set 3: Exactly 14 days ago (2 halfLifes) -> decay = 0.25
        {
          id: "s3",
          set_role: "work",
          completed_at: "2026-08-08T20:00:00.000Z",
          target_muscle: "quadriceps",
        },
      ];

      const res = computeFn(sets, { days: 14, now, mode: "fatigue" });
      assert.equal(res.mode, "fatigue");
      assert.equal(res.days, 14);

      const chest = res.muscles.find((m) => m.id === "chest");
      const back = res.muscles.find((m) => m.id === "upper-back");
      const quads = res.muscles.find((m) => m.id === "quadriceps");
      const biceps = res.muscles.find((m) => m.id === "biceps");

      // Chest (0 days ago): 1.0 * (0.5 ** 0) = 1.0
      assert.equal(chest.raw, 1.0);
      assert.equal(chest.score, 1.0); // maxRaw = 1.0

      // Upper back (7 days ago): 1.0 * (0.5 ** 1) = 0.5
      assert.equal(back.raw, 0.5);
      assert.equal(back.score, 0.5); // 0.5 / 1.0 = 0.5

      // Quadriceps (14 days ago): 1.0 * (0.5 ** 2) = 0.25 -> rounded to 0.3 or 0.25
      // Math.round(0.25 * 10) / 10 = 0.3
      assert.equal(quads.raw, 0.3);
      assert.equal(quads.score, 0.3);

      assert.equal(biceps.raw, 0.0);
      assert.equal(biceps.score, 0.0);

      // Ranked most fadigado: chest > upper-back > quadriceps
      assert.deepEqual(res.ranked.most, ["chest", "upper-back", "quadriceps"]);
    }
  });

  test("computeMuscleMap: fatigue mode decays secondary muscles proportionately", () => {
    for (const computeFn of [apiComputeMuscleMap, frontComputeMuscleMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        // Bench Press 7 days ago -> primary chest 1.0 * 0.5 = 0.5, secondaries triceps/deltoids 0.4 * 0.5 = 0.2
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-15T20:00:00.000Z",
          target_muscle: "chest",
          secondary_muscles_json: JSON.stringify(["triceps", "deltoids"]),
        },
      ];

      const res = computeFn(sets, { days: 14, now, mode: "fatigue" });
      const chest = res.muscles.find((m) => m.id === "chest");
      const triceps = res.muscles.find((m) => m.id === "triceps");
      const delts = res.muscles.find((m) => m.id === "deltoids");

      assert.equal(chest.raw, 0.5);
      assert.equal(chest.score, 1.0); // maxRaw = 0.5 -> 0.5 / 0.5 = 1.0
      assert.equal(triceps.raw, 0.2);
      assert.equal(triceps.score, 0.4); // 0.2 / 0.5 = 0.4
      assert.equal(delts.raw, 0.2);
      assert.equal(delts.score, 0.4);
    }
  });

  test("computeMuscleMap: fatigue mode respects custom halfLife parameter", () => {
    for (const computeFn of [apiComputeMuscleMap, frontComputeMuscleMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        // 4 days ago with halfLife = 4 days -> decay = 0.5
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-18T20:00:00.000Z",
          target_muscle: "chest",
        },
      ];

      const res = computeFn(sets, { days: 14, now, mode: "fatigue", halfLife: 4 });
      const chest = res.muscles.find((m) => m.id === "chest");
      assert.equal(chest.raw, 0.5);
    }
  });

  test("computeMuscleMap: strength mode computes best estimated 1RM per muscle and ranks primary target", () => {
    for (const computeFn of [apiComputeMuscleMap, frontComputeMuscleMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        // Bench press set 1: 80kg x 8 reps -> 1RM = 80 * (1 + 8/30) = 101.3
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-20T10:00:00.000Z",
          target_muscle: "chest",
          weight_kg: 80,
          reps: 8,
          secondary_muscles_json: JSON.stringify(["triceps", "deltoids"]),
        },
        // Bench press set 2: 100kg x 10 reps -> 1RM = 100 * (1 + 10/30) = 133.3
        {
          id: "s2",
          set_role: "work",
          completed_at: "2026-08-20T10:05:00.000Z",
          target_muscle: "chest",
          weight_kg: 100,
          reps: 10,
          secondary_muscles_json: JSON.stringify(["triceps", "deltoids"]),
        },
        // Bench press set 3: 90kg x 5 reps -> 1RM = 90 * (1 + 5/30) = 105.0
        {
          id: "s3",
          set_role: "work",
          completed_at: "2026-08-20T10:10:00.000Z",
          target_muscle: "chest",
          weight_kg: 90,
          reps: 5,
          secondary_muscles_json: JSON.stringify(["triceps", "deltoids"]),
        },
      ];

      const res = computeFn(sets, { days: 14, now, mode: "strength" });
      assert.equal(res.mode, "strength");
      assert.equal(res.days, 14);

      const chest = res.muscles.find((m) => m.id === "chest");
      const triceps = res.muscles.find((m) => m.id === "triceps");
      const delts = res.muscles.find((m) => m.id === "deltoids");
      const legs = res.muscles.find((m) => m.id === "quadriceps");

      // Chest best 1RM: 133.3 kg
      assert.equal(chest.raw, 133.3);
      assert.equal(chest.score, 1.0);
      assert.equal(chest.unit, "kg");

      // Primary only for strength clarity (as specified in TASK.md)
      assert.equal(triceps.raw, 0);
      assert.equal(triceps.score, 0);
      assert.equal(delts.raw, 0);
      assert.equal(delts.score, 0);
      assert.equal(legs.raw, 0);
      assert.equal(legs.score, 0);

      // Ranked most: chest is #1
      assert.deepEqual(res.ranked.most, ["chest"]);
    }
  });

  test("computeMuscleMap: strength mode normalizes scores across multiple muscles", () => {
    for (const computeFn of [apiComputeMuscleMap, frontComputeMuscleMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        // Chest (Bench Press): 100kg x 10 reps -> 1RM = 133.3 kg
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-20T10:00:00.000Z",
          target_muscle: "chest",
          weight_kg: 100,
          reps: 10,
        },
        // Quadriceps (Squat / Leg Press): 200kg x 10 reps -> 1RM = 200 * (1 + 10/30) = 266.7 kg
        {
          id: "s2",
          set_role: "work",
          completed_at: "2026-08-21T10:00:00.000Z",
          target_muscle: "quadriceps",
          weight_kg: 200,
          reps: 10,
        },
      ];

      const res = computeFn(sets, { days: 14, now, mode: "strength" });
      const chest = res.muscles.find((m) => m.id === "chest");
      const quads = res.muscles.find((m) => m.id === "quadriceps");

      // Max 1RM is quadriceps (266.7 kg) -> score = 1.0
      assert.equal(quads.raw, 266.7);
      assert.equal(quads.score, 1.0);
      assert.equal(quads.unit, "kg");

      // Chest: 133.3 / 266.7 = 0.50
      assert.equal(chest.raw, 133.3);
      assert.equal(chest.score, 0.5);
      assert.equal(chest.unit, "kg");

      assert.deepEqual(res.ranked.most, ["quadriceps", "chest"]);
    }
  });

  test("computeMuscleMap: strength mode skips bodyweight sets without kg and warmup sets", () => {
    for (const computeFn of [apiComputeMuscleMap, frontComputeMuscleMap]) {
      const now = new Date("2026-08-22T20:00:00.000Z");
      const sets = [
        // Bodyweight pullups (no kg)
        {
          id: "s1",
          set_role: "work",
          completed_at: "2026-08-20T10:00:00.000Z",
          target_muscle: "upper-back",
          weight_kg: null,
          reps: 12,
        },
        // Bodyweight pushups with 0 kg
        {
          id: "s2",
          set_role: "work",
          completed_at: "2026-08-20T10:05:00.000Z",
          target_muscle: "chest",
          weight_kg: 0,
          reps: 20,
        },
        // Warmup heavy squat: 150kg x 5 reps -> MUST be skipped
        {
          id: "s3",
          set_role: "warmup",
          completed_at: "2026-08-20T10:10:00.000Z",
          target_muscle: "quadriceps",
          weight_kg: 150,
          reps: 5,
        },
      ];

      const res = computeFn(sets, { days: 14, now, mode: "strength" });
      for (const m of res.muscles) {
        assert.equal(m.raw, 0);
        assert.equal(m.score, 0);
      }
      assert.deepEqual(res.ranked.most, []);
    }
  });
});

describe("workoutV4Core — Fase 11 Year Heatmap", () => {
  test("heatmap constants: months, weekdays, and intensity bins", () => {
    for (const months of [API_HEATMAP_MONTHS_PT, FRONT_HEATMAP_MONTHS_PT]) {
      assert.equal(months.length, 12);
      assert.equal(months[0], "Jan");
      assert.equal(months[11], "Dez");
    }

    for (const weekdays of [API_HEATMAP_WEEKDAYS_PT, FRONT_HEATMAP_WEEKDAYS_PT]) {
      assert.equal(weekdays.length, 7);
      assert.equal(weekdays[0], "Dom");
      assert.equal(weekdays[1], "Seg");
      assert.equal(weekdays[6], "Sáb");
    }

    for (const bins of [API_HEATMAP_INTENSITY_BINS, FRONT_HEATMAP_INTENSITY_BINS]) {
      assert.equal(bins.length, 5);
      assert.equal(bins[0].bin, 0);
      assert.equal(bins[1].bin, 1);
      assert.equal(bins[2].bin, 2);
      assert.equal(bins[3].bin, 3);
      assert.equal(bins[4].bin, 4);
    }
  });

  test("getHeatmapIntensityBin: maps work-set counts into 4 intensity bins (plus 0)", () => {
    for (const binFn of [apiGetHeatmapIntensityBin, frontGetHeatmapIntensityBin]) {
      assert.equal(binFn(null), 0);
      assert.equal(binFn(undefined), 0);
      assert.equal(binFn(""), 0);
      assert.equal(binFn(0), 0);
      assert.equal(binFn(-5), 0);

      // Bin 1: 1..6
      assert.equal(binFn(1), 1);
      assert.equal(binFn(3), 1);
      assert.equal(binFn(6), 1);

      // Bin 2: 7..12
      assert.equal(binFn(7), 2);
      assert.equal(binFn(10), 2);
      assert.equal(binFn(12), 2);

      // Bin 3: 13..18
      assert.equal(binFn(13), 3);
      assert.equal(binFn(15), 3);
      assert.equal(binFn(18), 3);

      // Bin 4: 19+
      assert.equal(binFn(19), 4);
      assert.equal(binFn(25), 4);
      assert.equal(binFn(100), 4);
    }
  });

  test("formatHeatmapTooltip: formats Portuguese tooltip strings accurately", () => {
    for (const formatFn of [apiFormatHeatmapTooltip, frontFormatHeatmapTooltip]) {
      // Empty day
      assert.equal(
        formatFn({ dateStr: "2026-08-22", sessions: 0, work_sets: 0, sets: 0 }),
        "22 de ago. de 2026 · Nenhum treino registrado"
      );

      // Single session & work sets
      assert.equal(
        formatFn({ dateStr: "2026-08-22", sessions: 1, work_sets: 1, sets: 1 }),
        "22 de ago. de 2026 · 1 treino · 1 série de trabalho"
      );

      // Multiple sessions & work sets with warmup sets
      assert.equal(
        formatFn({ dateStr: "2026-08-22", sessions: 2, work_sets: 12, sets: 14 }),
        "22 de ago. de 2026 · 2 treinos · 12 séries de trabalho (14 total)"
      );

      // Using direct positional arguments
      assert.equal(
        formatFn("2026-01-05", 8, 1, 8),
        "5 de jan. de 2026 · 1 treino · 8 séries de trabalho"
      );
    }
  });

  test("buildYearHeatmapGrid: constructs valid 52-54 week calendar with stats", () => {
    for (const buildFn of [apiBuildYearHeatmapGrid, frontBuildYearHeatmapGrid]) {
      const daysData = [
        { date: "2026-03-15", sessions: 1, sets: 10, work_sets: 8 },
        { date: "2026-07-20", sessions: 2, sets: 24, work_sets: 20 },
      ];

      const grid = buildFn(2026, daysData, { today: "2026-08-22" });

      assert.equal(grid.year, 2026);
      assert.ok(grid.weeks.length >= 52 && grid.weeks.length <= 54, "Must have 52-54 weeks");
      assert.equal(grid.totalSessions, 3);
      assert.equal(grid.totalWorkSets, 28);
      assert.equal(grid.totalSets, 34);
      assert.equal(grid.activeDaysCount, 2);
      assert.equal(grid.maxWorkSetsInDay, 20);

      // Every week must have exactly 7 days, starting on Sunday (dayOfWeek 0)
      for (const week of grid.weeks) {
        assert.equal(week.length, 7);
        assert.equal(week[0].dayOfWeek, 0); // Sunday
        assert.equal(week[6].dayOfWeek, 6); // Saturday
      }

      // Check specific day cells
      const flatCells = grid.weeks.flat();
      const march15 = flatCells.find((c) => c.dateStr === "2026-03-15");
      assert.ok(march15);
      assert.equal(march15.inYear, true);
      assert.equal(march15.sessions, 1);
      assert.equal(march15.work_sets, 8);
      assert.equal(march15.bin, 2); // 8 is in bin 2 (7..12)
      assert.equal(march15.future, false);

      const july20 = flatCells.find((c) => c.dateStr === "2026-07-20");
      assert.ok(july20);
      assert.equal(july20.sessions, 2);
      assert.equal(july20.work_sets, 20);
      assert.equal(july20.bin, 4); // 20 is in bin 4 (19+)

      // Future day check
      const dec1 = flatCells.find((c) => c.dateStr === "2026-12-01");
      assert.ok(dec1);
      assert.equal(dec1.future, true);
      assert.equal(dec1.bin, 0);

      // Month labels
      assert.ok(grid.monthLabels.length >= 12);
      assert.equal(grid.monthLabels[0].month, 0); // Jan
    }
  });

  test("buildYearHeatmapGrid: handles leap year and empty days data gracefully", () => {
    for (const buildFn of [apiBuildYearHeatmapGrid, frontBuildYearHeatmapGrid]) {
      const grid = buildFn(2024, []);
      assert.equal(grid.year, 2024);
      assert.equal(grid.totalSessions, 0);
      assert.equal(grid.totalWorkSets, 0);
      assert.equal(grid.activeDaysCount, 0);

      const flat = grid.weeks.flat();
      const feb29 = flat.find((c) => c.dateStr === "2024-02-29");
      assert.ok(feb29, "Leap year must contain Feb 29");
      assert.equal(feb29.inYear, true);
      assert.equal(feb29.bin, 0);
    }
  });
});

describe("workoutV4Core — Fase 12 Superset & Freestyle helpers", () => {
  test("shouldSkipAutoRest: skips auto rest when next exercise shares identical superset_group", () => {
    for (const skipFn of [apiShouldSkipAutoRest, frontShouldSkipAutoRest]) {
      const exercises = [
        { id: "e1", exercise_name_snapshot: "Supino Reto", superset_group: "SS_A" },
        { id: "e2", exercise_name_snapshot: "Remada Curvada", superset_group: "SS_A" },
        { id: "e3", exercise_name_snapshot: "Desenvolvimento", superset_group: null },
      ];

      // e1 -> e2 has same group: skip rest
      assert.equal(skipFn(exercises, 0), true);

      // e2 -> e3 has different group (SS_A -> null): do NOT skip rest
      assert.equal(skipFn(exercises, 1), false);

      // e3 is last with no group: do NOT skip rest
      assert.equal(skipFn(exercises, 2), false);
    }
  });

  test("shouldSkipAutoRest: does NOT skip rest when next exercise has different superset_group", () => {
    for (const skipFn of [apiShouldSkipAutoRest, frontShouldSkipAutoRest]) {
      const exercises = [
        { id: "e1", exercise_name_snapshot: "Rosca Direta", superset_group: "SS_1" },
        { id: "e2", exercise_name_snapshot: "Tríceps Testa", superset_group: "SS_2" },
      ];
      assert.equal(skipFn(exercises, 0), false);
      assert.equal(skipFn(exercises, 1), false);
    }
  });

  test("shouldSkipAutoRest: does NOT skip rest when current exercise has null or empty superset_group", () => {
    for (const skipFn of [apiShouldSkipAutoRest, frontShouldSkipAutoRest]) {
      const exercises = [
        { id: "e1", exercise_name_snapshot: "Agachamento", superset_group: null },
        { id: "e2", exercise_name_snapshot: "Leg Press", superset_group: "" },
        { id: "e3", exercise_name_snapshot: "Extensora", superset_group: "   " },
      ];
      assert.equal(skipFn(exercises, 0), false);
      assert.equal(skipFn(exercises, 1), false);
      assert.equal(skipFn(exercises, 2), false);
    }
  });

  test("shouldSkipAutoRest: handles edge cases and invalid inputs gracefully", () => {
    for (const skipFn of [apiShouldSkipAutoRest, frontShouldSkipAutoRest]) {
      assert.equal(skipFn(null, 0), false);
      assert.equal(skipFn([], 0), false);
      assert.equal(skipFn([{ superset_group: "A" }], 0), false); // only 1 exercise, no next
      assert.equal(skipFn([{ superset_group: "A" }, { superset_group: "A" }], -1), false);
      assert.equal(skipFn([{ superset_group: "A" }, { superset_group: "A" }], 5), false);
    }
  });

  test("isFreestyleSession: accurately detects freestyle sessions", () => {
    for (const isFreeFn of [apiIsFreestyleSession, frontIsFreestyleSession]) {
      assert.equal(isFreeFn({ kind: "freestyle", workout_program_id: null }), true);
      assert.equal(isFreeFn({ kind: "freestyle", workout_program_id: "p1" }), true);
      assert.equal(isFreeFn({ kind: null, workout_program_id: null, workout_day_id: null }), true);
      assert.equal(isFreeFn({ kind: "program", workout_program_id: "p1", workout_day_id: "d1" }), false);
      assert.equal(isFreeFn(null), false);
    }
  });

  test("getSupersetPairIndices: returns matching indices for grouped exercises", () => {
    for (const getIndicesFn of [apiGetSupersetPairIndices, frontGetSupersetPairIndices]) {
      const exercises = [
        { id: "e1", superset_group: "A" },
        { id: "e2", superset_group: "A" },
        { id: "e3", superset_group: "B" },
        { id: "e4", superset_group: null },
      ];

      assert.deepEqual(getIndicesFn(exercises, 0), [0, 1]);
      assert.deepEqual(getIndicesFn(exercises, 1), [0, 1]);
      assert.deepEqual(getIndicesFn(exercises, 2), [2]);
      assert.deepEqual(getIndicesFn(exercises, 3), [3]);
      assert.deepEqual(getIndicesFn(exercises, -1), []);
      assert.deepEqual(getIndicesFn(null, 0), []);
    }
  });
});

describe('Treinos V4 — nomes PT do catálogo e alias composto', () => {
  test('barbell bench press vira supino em PT', () => {
    const pt = apiTranslateExerciseNameToPt('barbell bench press');
    assert.match(pt.toLowerCase(), /supino/);
    assert.doesNotMatch(pt.toLowerCase(), /barbell/);
  });

  test('aliasMuscle resolve muscle_group PT composto', () => {
    assert.equal(apiAliasMuscle('Latíssimo, core, ombros'), 'upper-back');
    assert.equal(apiAliasMuscle('Bíceps'), 'biceps');
    assert.equal(apiAliasMuscle('Quadríceps, glúteo'), 'quadriceps');
  });
});
