/**
 * Praxis Treinos V4 — Year Heatmap helpers (Fase 11)
 *
 * Pure isomorphic helpers for computing contribution-style workout heatmaps
 * by calendar year with Praxis dark+gold visual styling.
 */

export const HEATMAP_MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const HEATMAP_WEEKDAYS_PT = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

export const HEATMAP_INTENSITY_BINS = [
  { bin: 0, label: "0 séries", min: 0, max: 0 },
  { bin: 1, label: "1–6 séries", min: 1, max: 6 },
  { bin: 2, label: "7–12 séries", min: 7, max: 12 },
  { bin: 3, label: "13–18 séries", min: 13, max: 18 },
  { bin: 4, label: "19+ séries", min: 19, max: Infinity },
];

/**
 * Maps work-set count to an intensity bin index (0..4).
 *
 * @param {number|string|null|undefined} workSets
 * @returns {number} 0 (none), 1 (1..6), 2 (7..12), 3 (13..18), 4 (19+)
 */
export function getHeatmapIntensityBin(workSets) {
  if (workSets === null || workSets === undefined || workSets === "") return 0;
  const n = Number(workSets);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n <= 6) return 1;
  if (n <= 12) return 2;
  if (n <= 18) return 3;
  return 4;
}

/**
 * Formats a tooltip title string in Portuguese for a heatmap day cell.
 *
 * @param {Object|string} dayOrDate
 * @param {number} [workSets]
 * @param {number} [sessions]
 * @param {number} [totalSets]
 * @returns {string}
 */
export function formatHeatmapTooltip(dayOrDate, workSets, sessions, totalSets) {
  let dateStr = "";
  let ws = 0;
  let sess = 0;
  let ts = 0;

  if (typeof dayOrDate === "object" && dayOrDate !== null) {
    dateStr = dayOrDate.dateStr || dayOrDate.date || "";
    ws = Number(dayOrDate.work_sets || dayOrDate.workSets || 0);
    sess = Number(dayOrDate.sessions || 0);
    ts = Number(dayOrDate.sets || dayOrDate.totalSets || 0);
  } else {
    dateStr = String(dayOrDate || "");
    ws = Number(workSets || 0);
    sess = Number(sessions || 0);
    ts = Number(totalSets || 0);
  }

  // Format date: YYYY-MM-DD -> D de mmm. de YYYY
  let formattedDate = dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const monthName = HEATMAP_MONTHS_PT[m - 1] || "";
    formattedDate = `${d} de ${monthName.toLowerCase()}. de ${y}`;
  }

  if (sess === 0 && ws === 0 && ts === 0) {
    return `${formattedDate} · Nenhum treino registrado`;
  }

  const sessLabel = sess === 1 ? "1 treino" : `${sess} treinos`;
  const workSetsLabel = ws === 1 ? "1 série de trabalho" : `${ws} séries de trabalho`;

  if (ts > ws && ts > 0) {
    return `${formattedDate} · ${sessLabel} · ${workSetsLabel} (${ts} total)`;
  }

  return `${formattedDate} · ${sessLabel} · ${workSetsLabel}`;
}

/**
 * Builds a full 52-54 week calendar grid for a given year.
 *
 * @param {number|string} year Year to render (e.g. 2026).
 * @param {Array<Object>} [daysData=[]] List of { date, sessions, sets, work_sets }
 * @param {Object} [options={}] Options ({ today, locale })
 * @returns {Object} { year, weeks, monthLabels, totalSessions, totalWorkSets, totalSets, activeDaysCount, maxWorkSetsInDay }
 */
export function sessionsToHeatmapDays(sessions = []) {
  const map = new Map();
  for (const session of sessions) {
    if (!session || session.status && session.status !== "completed") continue;
    const date = String(session.started_at || session.completed_at || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cur = map.get(date) || { date, sessions: 0, sets: 0, work_sets: 0 };
    cur.sessions += 1;
    const sets = Number(session.completed_sets || 0);
    const work = Number(
      session.completed_work_sets != null ? session.completed_work_sets : sets,
    );
    cur.sets += Number.isFinite(sets) ? sets : 0;
    cur.work_sets += Number.isFinite(work) ? work : 0;
    map.set(date, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildYearHeatmapGrid(year, daysData = [], options = {}) {
  const yearNum = Number(year) || new Date().getUTCFullYear();
  const todayIso = options.today
    ? (typeof options.today === "string" ? options.today.slice(0, 10) : new Date(options.today).toISOString().slice(0, 10))
    : new Date().toISOString().slice(0, 10);

  const daysMap = new Map();
  if (Array.isArray(daysData)) {
    for (const d of daysData) {
      if (d && d.date) {
        daysMap.set(d.date, d);
      }
    }
  }

  // UTC calculations for exact calendar arithmetic without timezone drift
  const jan1 = new Date(Date.UTC(yearNum, 0, 1));
  const startDayOfWeek = jan1.getUTCDay(); // 0 = Sunday
  const firstGridDate = new Date(Date.UTC(yearNum, 0, 1 - startDayOfWeek));

  const dec31 = new Date(Date.UTC(yearNum, 11, 31));
  const endDayOfWeek = dec31.getUTCDay();
  const lastGridDate = new Date(Date.UTC(yearNum, 11, 31 + (6 - endDayOfWeek)));

  const totalGridDays = Math.round((lastGridDate.getTime() - firstGridDate.getTime()) / (86400 * 1000)) + 1;
  const numWeeks = Math.ceil(totalGridDays / 7);

  let totalSessions = 0;
  let totalWorkSets = 0;
  let totalSets = 0;
  let activeDaysCount = 0;
  let maxWorkSetsInDay = 0;

  const allCells = [];
  for (let i = 0; i < totalGridDays; i++) {
    const cur = new Date(firstGridDate.getTime() + i * 86400 * 1000);
    const dateStr = cur.toISOString().slice(0, 10);
    const inYear = cur.getUTCFullYear() === yearNum;
    const isFuture = inYear && dateStr > todayIso;

    const data = inYear ? (daysMap.get(dateStr) || null) : null;
    const sessions = data ? Number(data.sessions || 0) : 0;
    const sets = data ? Number(data.sets || 0) : 0;
    const work_sets = data ? Number(data.work_sets || 0) : 0;

    if (inYear && (sessions > 0 || work_sets > 0 || sets > 0)) {
      totalSessions += sessions;
      totalWorkSets += work_sets;
      totalSets += sets;
      activeDaysCount += 1;
      if (work_sets > maxWorkSetsInDay) {
        maxWorkSetsInDay = work_sets;
      }
    }

    const bin = inYear && !isFuture ? getHeatmapIntensityBin(work_sets) : 0;

    allCells.push({
      date: cur,
      dateStr,
      dayOfWeek: cur.getUTCDay(),
      month: cur.getUTCMonth(),
      dayOfMonth: cur.getUTCDate(),
      inYear,
      future: isFuture,
      sessions,
      sets,
      work_sets,
      bin,
    });
  }

  // Split into weeks (columns of 7)
  const weeks = [];
  for (let w = 0; w < numWeeks; w++) {
    weeks.push(allCells.slice(w * 7, w * 7 + 7));
  }

  // Month labels for column headers
  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, colIdx) => {
    const firstInYear = week.find((c) => c.inYear);
    if (firstInYear) {
      const m = firstInYear.month;
      if (m !== lastMonth) {
        monthLabels.push({
          colIndex: colIdx,
          month: m,
          label: HEATMAP_MONTHS_PT[m],
        });
        lastMonth = m;
      }
    }
  });

  return {
    year: yearNum,
    weeks,
    monthLabels,
    totalSessions,
    totalWorkSets,
    totalSets,
    activeDaysCount,
    maxWorkSetsInDay,
  };
}
