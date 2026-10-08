import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createTestDb } from "./test-support/helpers.mjs";
import {
  translateStepsToPt,
  getTargetExerciseIds,
  translateExerciseInstructions,
} from "../scripts/translate-exercise-instructions.mjs";
import { preferSteps } from "./lib/workoutV4Core.js";

describe("Treinos V4 Fase 14 — Portuguese Exercise Instructions (preferSteps & translation)", () => {
  test("translateStepsToPt translates English gym instruction steps into Portuguese", () => {
    const enSteps = [
      "Lie flat on a bench with your feet flat on the ground.",
      "Grip the barbell with hands slightly wider than shoulder-width apart.",
      "Slowly lower the barbell to your chest, keeping your elbows close to your sides.",
      "Push the barbell back up to the starting position, extending your arms fully but without locking your elbows.",
      "Repeat for the desired number of repetitions.",
    ];

    const ptSteps = translateStepsToPt(enSteps);
    assert.equal(ptSteps.length, 5);
    assert.equal(ptSteps[0], "Deite-se no banco reto com os pés apoiados no chão.");
    assert.equal(ptSteps[1], "Segure a barra com as mãos ligeiramente mais afastadas que a largura dos ombros.");
    assert.equal(ptSteps[2], "Abaixe a barra devagar até o peito, mantendo os cotovelos próximos ao tronco.");
    assert.equal(ptSteps[3], "Empurre a barra de volta à posição inicial, estendendo os braços sem travar os cotovelos.");
    assert.equal(ptSteps[4], "Repita pelo número desejado de repetições.");

    // Handles single strings, empty arrays, and null
    assert.deepEqual(translateStepsToPt([]), []);
    assert.deepEqual(translateStepsToPt(null), []);
    assert.deepEqual(translateStepsToPt(""), []);
  });

  test("preferSteps returns EN when PT is empty, returns PT when present, and custom stays intact", () => {
    const exOnlyEn = {
      id: "ex-1",
      name: "Bench Press",
      instructions_json: JSON.stringify({
        en: ["Lie on bench", "Lower bar", "Press up"],
        pt: [],
      }),
    };

    // Before translation: preferSteps returns EN
    assert.deepEqual(preferSteps(exOnlyEn, "pt"), ["Lie on bench", "Lower bar", "Press up"]);
    assert.deepEqual(preferSteps(exOnlyEn, "en"), ["Lie on bench", "Lower bar", "Press up"]);

    // After adding PT: preferSteps returns PT
    const exWithPt = {
      id: "ex-1",
      name: "Bench Press",
      instructions_json: JSON.stringify({
        en: ["Lie on bench", "Lower bar", "Press up"],
        pt: ["Deite no banco", "Abaixe a barra", "Empurre para cima"],
      }),
    };
    assert.deepEqual(preferSteps(exWithPt, "pt"), ["Deite no banco", "Abaixe a barra", "Empurre para cima"]);
    assert.deepEqual(preferSteps(exWithPt, "en"), ["Lie on bench", "Lower bar", "Press up"]);

    // Custom exercise with plain text instructions
    const customEx = {
      id: "custom-1",
      name: "Handstand push-up",
      instructions: "Manter o core firme e descer até tocar a cabeça.",
    };
    assert.deepEqual(preferSteps(customEx, "pt"), ["Manter o core firme e descer até tocar a cabeça."]);
  });

  test("translateExerciseInstructions: selects active program + top 20, dry-run does not write, apply writes PT, never overwrites existing PT, leaves custom untouched", async () => {
    const testDb = createTestDb({ withWorkouts: true });

    try {
      // 1. Seed base catalog exercise with EN-only instructions (pt is empty)
      const catalogExActive = {
        id: "cat-active-1",
        catalog_external_id: "0001",
        name: "3/4 sit-up",
        source: "catalog",
        instructions_json: JSON.stringify({
          en: [
            "Lie flat on your back with your knees bent and feet flat on the ground.",
            "Place your hands behind your head with your elbows pointing outwards.",
            "Repeat for the desired number of repetitions.",
          ],
          pt: [],
        }),
      };

      const catalogExTopSet = {
        id: "cat-top-1",
        catalog_external_id: "0025",
        name: "Barbell Bench Press",
        source: "catalog",
        instructions_json: JSON.stringify({
          en: [
            "Lie flat on a bench with your feet flat on the ground.",
            "Push the barbell back up to the starting position, extending your arms fully but without locking your elbows.",
          ],
          pt: [],
        }),
      };

      const catalogExInactive = {
        id: "cat-inactive-1",
        catalog_external_id: "0999",
        name: "Inactive Exercise",
        source: "catalog",
        instructions_json: JSON.stringify({
          en: ["Stand tall with your feet hip-width apart."],
          pt: [],
        }),
      };

      const catalogExExistingPt = {
        id: "cat-existing-pt",
        catalog_external_id: "0050",
        name: "Pre-translated Exercise",
        source: "catalog",
        instructions_json: JSON.stringify({
          en: ["Hold a dumbbell in each hand."],
          pt: ["Instrução manual customizada que não deve ser sobrescrita."],
        }),
      };

      const customEx = {
        id: "custom-preserve",
        name: "Meu Exercício Custom",
        source: "custom",
        instructions: "Anotações do treinador pessoal.",
        instructions_json: null,
      };

      for (const ex of [catalogExActive, catalogExTopSet, catalogExInactive, catalogExExistingPt, customEx]) {
        testDb
          .prepare(
            "INSERT INTO workout_exercises (id, catalog_external_id, name, source, instructions, instructions_json) " +
            "VALUES (?, ?, ?, ?, ?, ?)"
          )
          .run(ex.id, ex.catalog_external_id || null, ex.name, ex.source, ex.instructions || "", ex.instructions_json || null);
      }

      // 2. Setup Active Program linked to catalogExActive and customEx
      testDb.prepare("INSERT INTO workout_programs (id, name, is_active) VALUES (?, ?, ?)").run("prog-active", "Active Program", 1);
      testDb.prepare("INSERT INTO workout_days (id, program_id, name) VALUES (?, ?, ?)").run("day-active", "prog-active", "Day 1");
      testDb.prepare("INSERT INTO workout_day_exercises (id, workout_day_id, exercise_id) VALUES (?, ?, ?)").run("de-1", "day-active", "cat-active-1");
      testDb.prepare("INSERT INTO workout_day_exercises (id, workout_day_id, exercise_id) VALUES (?, ?, ?)").run("de-2", "day-active", "custom-preserve");

      // 3. Setup Inactive Program linked to catalogExInactive
      testDb.prepare("INSERT INTO workout_programs (id, name, is_active) VALUES (?, ?, ?)").run("prog-inactive", "Inactive Program", 0);
      testDb.prepare("INSERT INTO workout_days (id, program_id, name) VALUES (?, ?, ?)").run("day-inactive", "prog-inactive", "Day Inactive");
      testDb.prepare("INSERT INTO workout_day_exercises (id, workout_day_id, exercise_id) VALUES (?, ?, ?)").run("de-3", "day-inactive", "cat-inactive-1");

      // 4. Setup Completed Sessions with work sets for catalogExTopSet and catalogExExistingPt
      testDb.prepare("INSERT INTO workout_sessions (id, workout_day_name_snapshot, status, started_at) VALUES (?, ?, ?, ?)").run("sess-1", "Day 1", "completed", "2026-08-20T10:00:00Z");
      testDb.prepare("INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_name_snapshot) VALUES (?, ?, ?, ?)").run("se-top", "sess-1", "cat-top-1", "Barbell Bench Press");
      testDb.prepare("INSERT INTO workout_session_exercises (id, session_id, exercise_id, exercise_name_snapshot) VALUES (?, ?, ?, ?)").run("se-pt", "sess-1", "cat-existing-pt", "Pre-translated Exercise");

      // Log work sets
      testDb.prepare("INSERT INTO workout_session_sets (id, session_id, session_exercise_id, set_number, weight_kg, reps, set_role, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("set-1", "sess-1", "se-top", 1, 80, 8, "work", "2026-08-20T10:05:00Z");
      testDb.prepare("INSERT INTO workout_session_sets (id, session_id, session_exercise_id, set_number, weight_kg, reps, set_role, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("set-2", "sess-1", "se-top", 2, 80, 8, "work", "2026-08-20T10:08:00Z");
      testDb.prepare("INSERT INTO workout_session_sets (id, session_id, session_exercise_id, set_number, weight_kg, reps, set_role, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("set-3", "sess-1", "se-pt", 1, 20, 12, "work", "2026-08-20T10:12:00Z");

      // Verify getTargetExerciseIds selects the union:
      // cat-active-1 (active program), custom-preserve (active program), cat-top-1 (top work sets), cat-existing-pt (top work sets)
      // and NOT cat-inactive-1
      const targetIds = getTargetExerciseIds(testDb);
      assert.ok(targetIds.includes("cat-active-1"), "Must include active program exercise");
      assert.ok(targetIds.includes("custom-preserve"), "Must include active custom exercise");
      assert.ok(targetIds.includes("cat-top-1"), "Must include top work-set exercise");
      assert.ok(targetIds.includes("cat-existing-pt"), "Must include top work-set exercise with PT");
      assert.ok(!targetIds.includes("cat-inactive-1"), "Must NOT include inactive non-top exercise");

      // 5. Run in DRY-RUN mode
      const dryRunResult = await translateExerciseInstructions({
        db: testDb,
        dryRun: true,
        silent: true,
      });

      assert.equal(dryRunResult.dryRun, true);
      assert.equal(dryRunResult.translatedCount, 2); // cat-active-1 and cat-top-1
      assert.equal(dryRunResult.alreadyHadPtCount, 1); // cat-existing-pt
      assert.equal(dryRunResult.noEnCount, 1); // custom-preserve

      // Verify DB was NOT modified during dry-run
      const activeAfterDryRun = testDb.prepare("SELECT instructions_json FROM workout_exercises WHERE id = ?").get("cat-active-1");
      const parsedActiveDry = JSON.parse(activeAfterDryRun.instructions_json);
      assert.deepEqual(parsedActiveDry.pt, [], "Dry-run must not write PT steps to DB");

      // 6. Run in APPLY mode
      const applyResult = await translateExerciseInstructions({
        db: testDb,
        apply: true,
        silent: true,
      });

      assert.equal(applyResult.dryRun, false);
      assert.equal(applyResult.translatedCount, 2);

      // Verify DB was modified for target catalog exercises
      const activeAfterApply = testDb.prepare("SELECT * FROM workout_exercises WHERE id = ?").get("cat-active-1");
      const parsedActiveApply = JSON.parse(activeAfterApply.instructions_json);
      assert.ok(Array.isArray(parsedActiveApply.pt) && parsedActiveApply.pt.length === 3, "PT steps written to DB");
      assert.equal(parsedActiveApply.pt[0], "Deite-se de costas com os joelhos flexionados e os pés apoiados no chão.");

      // preferSteps now returns Portuguese steps
      assert.deepEqual(preferSteps(activeAfterApply, "pt"), parsedActiveApply.pt);
      assert.equal(preferSteps(activeAfterApply, "pt")[0], "Deite-se de costas com os joelhos flexionados e os pés apoiados no chão.");

      const topAfterApply = testDb.prepare("SELECT * FROM workout_exercises WHERE id = ?").get("cat-top-1");
      const parsedTopApply = JSON.parse(topAfterApply.instructions_json);
      assert.ok(Array.isArray(parsedTopApply.pt) && parsedTopApply.pt.length === 2);
      assert.equal(parsedTopApply.pt[0], "Deite-se no banco reto com os pés apoiados no chão.");

      // Verify custom exercise is completely untouched
      const customAfterApply = testDb.prepare("SELECT * FROM workout_exercises WHERE id = ?").get("custom-preserve");
      assert.equal(customAfterApply.instructions_json, null);
      assert.equal(customAfterApply.instructions, "Anotações do treinador pessoal.");

      // Verify pre-existing PT instructions were NEVER overwritten
      const existingPtAfterApply = testDb.prepare("SELECT * FROM workout_exercises WHERE id = ?").get("cat-existing-pt");
      const parsedExistingPt = JSON.parse(existingPtAfterApply.instructions_json);
      assert.deepEqual(parsedExistingPt.pt, ["Instrução manual customizada que não deve ser sobrescrita."]);

      // Verify inactive exercise remains untouched
      const inactiveAfterApply = testDb.prepare("SELECT * FROM workout_exercises WHERE id = ?").get("cat-inactive-1");
      const parsedInactive = JSON.parse(inactiveAfterApply.instructions_json);
      assert.deepEqual(parsedInactive.pt, []);

      // 7. Re-running in apply mode is idempotent (0 new translations)
      const secondApplyResult = await translateExerciseInstructions({
        db: testDb,
        apply: true,
        silent: true,
      });
      assert.equal(secondApplyResult.translatedCount, 0);
      assert.equal(secondApplyResult.alreadyHadPtCount, 3); // cat-active-1, cat-top-1, cat-existing-pt
    } finally {
      testDb.close();
    }
  });
});
