import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import {
  daysSinceDate,
  decorateSinceHabit,
  isSinceHabit,
  normalizeSinceDate,
  normalizeTrackingMode,
  sinceMilestone,
} from "./lib/habitSinceCounter.js";
import { isHabitDueOnDate } from "./lib/weeklyInsights.js";
import { createHabitsRouter, registerHabitLogRoutes } from "./routes/habits.js";
import {
  buildRouteCtx,
  createTestDb,
  requestJson,
  startTestServer,
} from "./test-support/helpers.mjs";

test("daysSinceDate counts civil days from the last-incident date", () => {
  assert.equal(daysSinceDate("2026-08-22", "2026-08-24"), 2);
  assert.equal(daysSinceDate("2026-08-22", "2026-08-22"), 0);
  assert.equal(daysSinceDate("2026-08-22", "2026-08-23"), 1);
  assert.equal(daysSinceDate("", "2026-08-24"), 0);
  assert.equal(normalizeSinceDate("2026-02-31"), null);
  assert.equal(normalizeSinceDate("2026-08-22"), "2026-08-22");
  assert.equal(normalizeTrackingMode("since"), "since");
  assert.equal(normalizeTrackingMode("check"), "check");
  assert.equal(normalizeTrackingMode(""), "check");
  assert.equal(normalizeTrackingMode(undefined), undefined);
  assert.equal(normalizeTrackingMode("nope"), null);
  assert.equal(sinceMilestone(0).phase, "decisão");
  assert.equal(sinceMilestone(2).phase, "decisão");
  assert.equal(sinceMilestone(5).phase, "semana dura");
  assert.equal(sinceMilestone(10).phase, "estabiliza");
  assert.equal(sinceMilestone(20).phase, "hábito novo");
  assert.equal(sinceMilestone(60).phase, "caminho novo");
  assert.equal(sinceMilestone(100).phase, "já sabe");
});

test("isHabitDueOnDate excludes since tracking_mode", () => {
  assert.equal(
    isHabitDueOnDate({ status: "active", frequency: "daily", tracking_mode: "since" }, "2026-08-24"),
    false,
  );
  assert.equal(
    isHabitDueOnDate({ status: "active", frequency: "daily", tracking_mode: "check" }, "2026-08-24"),
    true,
  );
});

test("since habit is a clock: POST/PUT date, GET days, reject daily check, no reset field", async (t) => {
  const db = createTestDb();
  const ctx = buildRouteCtx(db, { getLocalDateString: () => "2026-08-24" });
  const app = express();
  app.use(express.json());
  app.use("/api/habits", createHabitsRouter(ctx));
  registerHabitLogRoutes(app, ctx);
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  // 1. POST since habit
  const createRes = await fetch(`${server.base}/api/habits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Sem pornografia",
      category: "pessoal",
      tracking_mode: "since",
      since_date: "2026-08-22",
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.tracking_mode, "since");
  assert.equal(created.since_date, "2026-08-22");
  assert.equal(created.days_since, 2);
  assert.equal(created.current_streak, 2);
  assert.equal(created.since_phase, "decisão");
  assert.match(created.since_line, /decisão/i);
  assert.equal(created.reset_allowed, undefined);
  assert.equal(created.reset_date, undefined);

  // 2. Reject POST since habit without valid since_date
  const invalidCreate = await fetch(`${server.base}/api/habits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Inválido",
      tracking_mode: "since",
      since_date: "data-invalida",
    }),
  });
  assert.equal(invalidCreate.status, 400);

  // 3. GET /api/habits list
  const listed = await requestJson(server.base, "/api/habits");
  const found = listed.find((h) => h.id === created.id);
  assert.ok(found);
  assert.equal(found.days_since, 2);
  assert.equal(found.current_streak, 2);
  assert.equal(found.since_phase, "decisão");

  // 4. GET /api/habits/:id/streak
  const streakRes = await requestJson(server.base, `/api/habits/${created.id}/streak`);
  assert.equal(streakRes.current_streak, 2);

  // 5. PUT /api/habits/:id to update since_date to 2026-08-20 (4 days)
  const updateRes = await fetch(`${server.base}/api/habits/${created.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      since_date: "2026-08-20",
    }),
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.since_date, "2026-08-20");
  assert.equal(updated.days_since, 4);
  assert.equal(updated.since_phase, "semana dura");

  // 6. Reject POST /api/habit-logs for since habit (no daily check / not a check habit)
  const logRes = await fetch(`${server.base}/api/habit-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habit_id: created.id, date: "2026-08-24", completed: true }),
  });
  assert.equal(logRes.status, 400);
  const logErr = await logRes.json();
  assert.match(String(logErr.error || ""), /contador|since|check/i);

  // 7. decorateSinceHabit helper
  const decorated = decorateSinceHabit({
    tracking_mode: "since",
    since_date: "2026-08-22",
    best_streak: 0,
  }, "2026-08-24");
  assert.equal(decorated.days_since, 2);
  assert.equal(isSinceHabit(decorated), true);
});
