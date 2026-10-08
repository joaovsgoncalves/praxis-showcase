import fs from "node:fs";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createTestDb } from "./test-support/helpers.mjs";
import {
  mapCatalogExercise,
  mapExerciseCategory,
  mapTrackingType,
  extractMediaId,
  parseInstructions,
  seedExerciseCatalog,
  MEDIA_ATTRIBUTION,
} from "../scripts/seed-exercise-catalog.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.join(__dirname, "test-support", "fixtures", "catalog-sample.json");

describe("seed-exercise-catalog — mapping & normalization unit tests", () => {
  test("mapCatalogExercise maps full catalog item accurately to database schema", () => {
    const raw = {
      id: "0001",
      name: "3/4 sit-up",
      category: "waist",
      body_part: "waist",
      equipment: "body weight",
      instructions: {
        en: "Lie flat on your back with your knees bent. Lift your upper body.",
      },
      instruction_steps: {
        en: [
          "Lie flat on your back with your knees bent.",
          "Lift your upper body.",
        ],
      },
      muscle_group: "hip flexors",
      secondary_muscles: ["hip flexors", "lower back"],
      target: "abs",
      image: "images/0001-2gPfomN.jpg",
      gif_url: "videos/0001-2gPfomN.gif",
      media_id: "2gPfomN",
      attribution: "© Gym visual — https://gymvisual.com/",
    };

    const mapped = mapCatalogExercise(raw);

    assert.equal(mapped.catalog_external_id, "0001");
    assert.equal(mapped.name, "3/4 sit-up");
    assert.equal(mapped.category, "calisthenics");
    assert.equal(mapped.muscle_group, "hip flexors");
    assert.equal(mapped.equipment, "body weight");
    assert.equal(mapped.equipment_key, "body_weight");
    assert.equal(mapped.tracking_type, "reps");
    assert.equal(mapped.body_part, "waist");
    assert.equal(mapped.target_muscle, "abs");
    assert.equal(mapped.secondary_muscles_json, JSON.stringify(["hip flexors", "lower back"]));
    assert.equal(mapped.media_id, "2gPfomN");
    assert.equal(mapped.thumb_path, "images/0001-2gPfomN.jpg");
    assert.equal(mapped.gif_path, "videos/0001-2gPfomN.gif");
    assert.equal(mapped.attribution, MEDIA_ATTRIBUTION);
    assert.equal(
      mapped.instructions_json,
      JSON.stringify({
        en: [
          "Lie flat on your back with your knees bent.",
          "Lift your upper body.",
        ],
        pt: [],
      })
    );
    assert.equal(
      mapped.instructions,
      "Lie flat on your back with your knees bent. Lift your upper body."
    );
    assert.equal(mapped.is_bodyweight_default, 1);
    assert.equal(mapped.source, "catalog");
    assert.equal(mapped.is_custom, 0);
    assert.equal(mapped.status, "active");
  });

  test("mapExerciseCategory handles cardio, bodyweight calisthenics, and equipment strength", () => {
    assert.equal(mapExerciseCategory({ category: "cardio" }), "cardio");
    assert.equal(mapExerciseCategory({ body_part: "cardio" }), "cardio");
    assert.equal(mapExerciseCategory({ equipment: "stationary bike" }), "cardio");
    assert.equal(mapExerciseCategory({ equipment: "body weight", category: "waist" }), "calisthenics");
    assert.equal(mapExerciseCategory({ equipment: "barbell", category: "chest" }), "strength");
    assert.equal(mapExerciseCategory({ equipment: "dumbbell", category: "upper arms" }), "strength");
    assert.equal(mapExerciseCategory({ category: "mobility" }), "mobility");
    assert.equal(mapExerciseCategory({ category: "stretching" }), "mobility");
  });

  test("mapTrackingType differentiates cardio (duration), bodyweight (reps/duration), and weights (weight_reps)", () => {
    assert.equal(mapTrackingType({}, "cardio"), "duration");
    assert.equal(mapTrackingType({ equipment: "body weight", name: "push-up" }, "calisthenics"), "reps");
    assert.equal(mapTrackingType({ equipment: "body weight", name: "plank" }, "calisthenics"), "duration");
    assert.equal(mapTrackingType({ equipment: "body weight", name: "isometric wall sit" }, "calisthenics"), "duration");
    assert.equal(mapTrackingType({ equipment: "barbell", name: "bench press" }, "strength"), "weight_reps");
    assert.equal(mapTrackingType({ tracking_type: "distance" }, "other"), "distance");
  });

  test("extractMediaId parses media_id from explicit property or filenames", () => {
    assert.equal(extractMediaId({ media_id: "2gPfomN" }), "2gPfomN");
    assert.equal(extractMediaId({ image: "images/0001-2gPfomN.jpg" }), "2gPfomN");
    assert.equal(extractMediaId({ gif_url: "videos/1316-j599l3T.gif" }), "j599l3T");
    assert.equal(extractMediaId({}), null);
  });

  test("parseInstructions handles object, array, or text formats cleanly", () => {
    // 1. Dataset standard object format
    const r1 = parseInstructions({
      instruction_steps: { en: ["Step 1", "Step 2"] },
      instructions: { en: "Step 1 Step 2" },
    });
    assert.equal(r1.instructions_json, JSON.stringify({ en: ["Step 1", "Step 2"], pt: [] }));
    assert.equal(r1.instructions, "Step 1 Step 2");

    // 2. Simple array steps
    const r2 = parseInstructions({
      instruction_steps: ["Do this", "Do that"],
      instructions: "Do this. Do that.",
    });
    assert.equal(r2.instructions_json, JSON.stringify({ en: ["Do this", "Do that"], pt: [] }));
    assert.equal(r2.instructions, "Do this. Do that.");

    // 3. Fallback to string instructions
    const r3 = parseInstructions({
      instructions: "Perform reps with steady form.",
    });
    assert.equal(r3.instructions_json, JSON.stringify({ en: [], pt: [] }));
    assert.equal(r3.instructions, "Perform reps with steady form.");
  });

  test("mapCatalogExercise throws error when id or name is missing", () => {
    assert.throws(() => mapCatalogExercise({ name: "No ID" }), /missing required id/);
    assert.throws(() => mapCatalogExercise({ id: "0001" }), /missing required name/);
  });
});

describe("seed-exercise-catalog — database integration & idempotency tests", () => {
  test("dry-run reports would-insert count without writing to database", () => {
    const db = createTestDb({ withWorkouts: true });
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

    const result = seedExerciseCatalog({
      db,
      dataset: fixtureData,
      apply: false,
      dryRun: true,
    });

    assert.equal(result.dryRun, true);
    assert.equal(result.totalInSource, 3);
    assert.equal(result.wouldInsert, 3);
    assert.equal(result.wouldUpdate, 0);
    assert.equal(result.inserted, 0);
    assert.equal(result.updated, 0);

    const countInDb = db.prepare("SELECT COUNT(*) AS count FROM workout_exercises").get()?.count;
    assert.equal(countInDb, 0, "Dry-run must not write any rows to DB");

    db.close();
  });

  test("apply inserts catalog rows with source=catalog, is_custom=0, and correct field values", () => {
    const db = createTestDb({ withWorkouts: true });
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

    const result = seedExerciseCatalog({
      db,
      dataset: fixtureData,
      apply: true,
      dryRun: false,
    });

    assert.equal(result.dryRun, false);
    assert.equal(result.inserted, 3);
    assert.equal(result.updated, 0);
    assert.equal(result.catalogCountInDb, 3);

    const rows = db.prepare("SELECT * FROM workout_exercises ORDER BY catalog_external_id ASC").all();
    assert.equal(rows.length, 3);

    const sitUp = rows.find((r) => r.catalog_external_id === "0001");
    assert.ok(sitUp);
    assert.equal(sitUp.name, "3/4 sit-up");
    assert.equal(sitUp.source, "catalog");
    assert.equal(sitUp.is_custom, 0);
    assert.equal(sitUp.body_part, "waist");
    assert.equal(sitUp.target_muscle, "abs");
    assert.equal(sitUp.media_id, "2gPfomN");
    assert.equal(sitUp.is_bodyweight_default, 1);
    assert.equal(sitUp.attribution, MEDIA_ATTRIBUTION);

    const pullover = rows.find((r) => r.catalog_external_id === "1316");
    assert.ok(pullover);
    assert.equal(pullover.name, "barbell bent arm pullover");
    assert.equal(pullover.source, "catalog");
    assert.equal(pullover.is_custom, 0);
    assert.equal(pullover.equipment, "barbell");
    assert.equal(pullover.equipment_key, "barbell");
    assert.equal(pullover.tracking_type, "weight_reps");
    assert.equal(pullover.is_bodyweight_default, 0);

    const cardio = rows.find((r) => r.catalog_external_id === "3220");
    assert.ok(cardio);
    assert.equal(cardio.name, "star jump (male)");
    assert.equal(cardio.category, "cardio");
    assert.equal(cardio.tracking_type, "duration");

    db.close();
  });

  test("idempotent re-run updates existing catalog records and preserves row count", () => {
    const db = createTestDb({ withWorkouts: true });
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

    // Run 1: insert 3
    const first = seedExerciseCatalog({
      db,
      dataset: fixtureData,
      apply: true,
      dryRun: false,
    });
    assert.equal(first.inserted, 3);
    assert.equal(first.updated, 0);

    // Run 2: re-run with same fixture (should update 3, insert 0)
    const second = seedExerciseCatalog({
      db,
      dataset: fixtureData,
      apply: true,
      dryRun: false,
    });
    assert.equal(second.inserted, 0);
    assert.equal(second.updated, 3);
    assert.equal(second.catalogCountInDb, 3);

    const totalRows = db.prepare("SELECT COUNT(*) AS count FROM workout_exercises").get()?.count;
    assert.equal(totalRows, 3);

    db.close();
  });

  test("never deletes or mutates custom user exercises (source=custom / is_custom=1)", () => {
    const db = createTestDb({ withWorkouts: true });

    // Seed 2 custom exercises beforehand
    db.prepare("INSERT INTO workout_exercises (id, name, category, muscle_group, is_custom, source) VALUES (?, ?, ?, ?, ?, ?)").run(
      "custom-1", "Meu supino especial", "strength", "peito", 1, "custom"
    );
    db.prepare("INSERT INTO workout_exercises (id, name, category, muscle_group, is_custom, source) VALUES (?, ?, ?, ?, ?, ?)").run(
      "custom-2", "Alongamento matinal", "mobility", "costas", 1, "custom"
    );

    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

    const result = seedExerciseCatalog({
      db,
      dataset: fixtureData,
      apply: true,
      dryRun: false,
    });

    assert.equal(result.inserted, 3);
    assert.equal(result.customPreserved, 2);
    assert.equal(result.totalInDb, 5);

    const custom1 = db.prepare("SELECT * FROM workout_exercises WHERE id = ?").get("custom-1");
    assert.ok(custom1);
    assert.equal(custom1.name, "Meu supino especial");
    assert.equal(custom1.source, "custom");
    assert.equal(custom1.is_custom, 1);
    assert.equal(custom1.catalog_external_id, null);

    const custom2 = db.prepare("SELECT * FROM workout_exercises WHERE id = ?").get("custom-2");
    assert.ok(custom2);
    assert.equal(custom2.name, "Alongamento matinal");
    assert.equal(custom2.source, "custom");
    assert.equal(custom2.is_custom, 1);

    db.close();
  });

  test("seed CLI execution works with --dry-run and --apply flags via subprocess", () => {
    const tempDbPath = path.join(__dirname, "test-seed-cli-temp.db");
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);

    // 1. Dry run via CLI
    const repoRoot = path.join(__dirname, "..");
    const dryRunRes = spawnSync("node", [
      "scripts/seed-exercise-catalog.mjs",
      "--dry-run",
      "--source=" + fixturePath,
      "--db=" + tempDbPath,
    ], { encoding: "utf8", cwd: repoRoot });

    assert.equal(dryRunRes.status, 0);
    assert.match(dryRunRes.stdout, /Praxis Treinos V4/);
    assert.match(dryRunRes.stdout, /Would Insert:\s+3 catalog exercises/);

    // 2. Apply via CLI
    const applyRes = spawnSync("node", [
      "scripts/seed-exercise-catalog.mjs",
      "--apply",
      "--source=" + fixturePath,
      "--db=" + tempDbPath,
    ], { encoding: "utf8", cwd: repoRoot });

    assert.equal(applyRes.status, 0);
    assert.match(applyRes.stdout, /Inserted:\s+3 catalog exercises/);

    // Clean up
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
  });
});
