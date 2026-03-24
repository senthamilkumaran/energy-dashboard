import { Router } from "express";

/** Period boundaries in local date (YYYY-MM-DD) */
function rangeForPeriod(period, anchor = new Date()) {
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);
  let start = new Date(anchor);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const dow = start.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    start.setDate(start.getDate() + mondayOffset);
  } else if (period === "month") {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  } else if (period === "year") {
    start = new Date(anchor.getFullYear(), 0, 1);
  } else {
    return null;
  }

  const toIso = (d) => d.toISOString().slice(0, 10);
  return { start: toIso(start), end: toIso(end) };
}

export function dashboardRoutes(db) {
  const r = Router();

  r.get("/users", (_req, res) => {
    const rows = db
      .prepare(
        `SELECT user_id AS userId, username, email_id AS emailId FROM users WHERE username != 'admin' ORDER BY username`
      )
      .all();
    res.json(rows);
  });

  /** All non-admin users whose average daily consumption in range exceeds threshold kWh */
  r.get("/alerts/high-consumption", (req, res) => {
    const threshold = Number(req.query.threshold) || 55;
    const period = ["week", "month", "year"].includes(req.query.period) ? req.query.period : "month";
    const range = rangeForPeriod(period);
    if (!range) return res.status(400).json({ message: "invalid period" });
    const { start, end } = range;
    const rows = db
      .prepare(
        `
        SELECT u.user_id AS userId, u.username, u.email_id AS emailId,
               AVG(c.total_kwh) AS avgDailyKwh,
               MAX(c.max_daily_kwh) AS peakDailyKwh
        FROM users u
        JOIN energy_consumption_daily c ON c.user_id = u.user_id
        WHERE u.username != 'admin'
          AND c.date >= ? AND c.date <= ?
        GROUP BY u.user_id
        HAVING avgDailyKwh >= ?
        ORDER BY avgDailyKwh DESC
      `
      )
      .all(start, end, threshold);
    res.json({
      period: { type: period, start, end },
      thresholdKwhPerDay: threshold,
      alerts: rows.map((row) => ({
        ...row,
        avgDailyKwh: Math.round(row.avgDailyKwh * 100) / 100,
        peakDailyKwh: Math.round(row.peakDailyKwh * 100) / 100,
        message: `Average consumption ~${Math.round(row.avgDailyKwh * 10) / 10} kWh/day exceeds ${threshold} kWh/day threshold.`,
      })),
    });
  });

  r.get("/summary", (req, res) => {
    const userId = Number(req.query.userId);
    const period = req.query.period;
    if (!userId || !["week", "month", "year"].includes(period)) {
      return res.status(400).json({ message: "userId and period (week|month|year) required" });
    }
    const range = rangeForPeriod(period);
    if (!range) return res.status(400).json({ message: "invalid period" });

    const consumption = db
      .prepare(
        `
        SELECT date, total_kwh AS totalKwh, min_daily_kwh AS minKwh, max_daily_kwh AS maxKwh
        FROM energy_consumption_daily
        WHERE user_id = ? AND date >= ? AND date <= ?
        ORDER BY date
      `
      )
      .all(userId, range.start, range.end);

    const generation = db
      .prepare(
        `
        SELECT date, total_kwh AS totalKwh, min_daily_kwh AS minKwh, max_daily_kwh AS maxKwh
        FROM energy_generation_daily
        WHERE date >= ? AND date <= ?
        ORDER BY date
      `
      )
      .all(range.start, range.end);

    const sumCons = consumption.reduce((a, r) => a + r.totalKwh, 0);
    const sumGen = generation.reduce((a, r) => a + r.totalKwh, 0);
    const consMin = consumption.length ? Math.min(...consumption.map((c) => c.minKwh)) : 0;
    const consMax = consumption.length ? Math.max(...consumption.map((c) => c.maxKwh)) : 0;
    const genMin = generation.length ? Math.min(...generation.map((c) => c.minKwh)) : 0;
    const genMax = generation.length ? Math.max(...generation.map((c) => c.maxKwh)) : 0;

    res.json({
      period: { type: period, start: range.start, end: range.end },
      overview: {
        totalConsumptionKwh: Math.round(sumCons * 100) / 100,
        totalGenerationKwh: Math.round(sumGen * 100) / 100,
        netExportKwh: Math.round((sumGen - sumCons) * 100) / 100,
        consumerMinDailyKwh: Math.round(consMin * 100) / 100,
        consumerMaxDailyKwh: Math.round(consMax * 100) / 100,
        generationMinDailyKwh: Math.round(genMin * 100) / 100,
        generationMaxDailyKwh: Math.round(genMax * 100) / 100,
      },
      dailyConsumption: consumption,
      dailyGeneration: generation,
    });
  });

  return r;
}
