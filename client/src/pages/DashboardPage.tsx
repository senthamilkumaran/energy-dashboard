import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Period, UserRow } from "../api/client";
import { fetchAlerts, fetchSummary, fetchUsers } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import styles from "./DashboardPage.module.css";

const periodLabels: Record<Period, string> = {
  week: "Current week",
  month: "Current month",
  year: "Current year",
};

export function DashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userId, setUserId] = useState<number | "">("");
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchUsers();
        if (cancelled) return;
        setUsers(list);
        if (list.length && userId === "") setUserId(list[0].userId);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchSummary>> | null>(null);

  useEffect(() => {
    if (userId === "") return;
    let cancelled = false;
    (async () => {
      setErr("");
      try {
        const [s, a] = await Promise.all([
          fetchSummary(userId as number, period),
          fetchAlerts(period, 55),
        ]);
        if (cancelled) return;
        setSummary(s);
        setAlerts(a.alerts.map((x) => `${x.username}: ${x.message}`));
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load data");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, period]);

  const chartData = useMemo(() => {
    if (!summary) return [];
    const byDate = new Map<
      string,
      { date: string; consumption: number; generation: number }
    >();
    for (const d of summary.dailyConsumption) {
      byDate.set(d.date, { date: d.date, consumption: d.totalKwh, generation: 0 });
    }
    for (const d of summary.dailyGeneration) {
      const cur = byDate.get(d.date) || { date: d.date, consumption: 0, generation: 0 };
      cur.generation = d.totalKwh;
      byDate.set(d.date, cur);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [summary]);

  const o = summary?.overview;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.welcome}>
            Welcome, <span className={styles.name}>{user?.username}</span>
          </h1>
          <p className={styles.caption}>Monitor site energy — consumption, generation, and grid export.</p>
        </div>
        <div className={styles.controls}>
          <label className={styles.field}>
            <span>Consumer</span>
            <select
              value={userId === "" ? "" : String(userId)}
              onChange={(e) => setUserId(Number(e.target.value))}
              disabled={loading || !users.length}
            >
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.username}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Period</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <option key={p} value={p}>
                  {periodLabels[p]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {alerts.length > 0 ? (
        <section className={styles.alerts} aria-label="High consumption alerts">
          <h2 className={styles.alertsTitle}>High consumption alerts</h2>
          <ul>
            {alerts.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.overview} aria-label="Period overview">
        <h2 className={styles.sectionTitle}>Overview ({periodLabels[period]})</h2>
        <p className={styles.unitNote}>Values are energy totals for the period (kWh).</p>
        <div className={styles.cards}>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Consumption</span>
            <strong className={styles.cardValue}>{o ? o.totalConsumptionKwh : "—"}</strong>
            <span className={styles.cardUnit}>kWh</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Generation</span>
            <strong className={styles.cardValue}>{o ? o.totalGenerationKwh : "—"}</strong>
            <span className={styles.cardUnit}>kWh</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Net export to grid</span>
            <strong className={styles.cardValue}>{o ? o.netExportKwh : "—"}</strong>
            <span className={styles.cardUnit}>kWh</span>
          </div>
        </div>
        <div className={styles.minmax}>
          <div>
            <h3>Consumer daily min / max</h3>
            <p>
              Min: <strong>{o?.consumerMinDailyKwh ?? "—"}</strong> kWh · Max:{" "}
              <strong>{o?.consumerMaxDailyKwh ?? "—"}</strong> kWh
            </p>
          </div>
          <div>
            <h3>Generation daily min / max</h3>
            <p>
              Min: <strong>{o?.generationMinDailyKwh ?? "—"}</strong> kWh · Max:{" "}
              <strong>{o?.generationMaxDailyKwh ?? "—"}</strong> kWh
            </p>
          </div>
        </div>
      </section>

      {err ? <p className={styles.error}>{err}</p> : null}

      <section className={styles.chartSection} aria-label="Energy chart">
        <h2 className={styles.sectionTitle}>Daily usage — {periodLabels[period]}</h2>
        <div className={styles.chartWrap}>
          {chartData.length === 0 && !err ? (
            <p className={styles.empty}>No data for this selection.</p>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3d4d" />
                <XAxis dataKey="date" tick={{ fill: "#8fa3b0", fontSize: 11 }} stroke="#2a3d4d" />
                <YAxis tick={{ fill: "#8fa3b0", fontSize: 11 }} stroke="#2a3d4d" unit=" kWh" />
                <Tooltip
                  contentStyle={{
                    background: "#18242f",
                    border: "1px solid #2a3d4d",
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: "#e8f0f6" }}
                />
                <Legend />
                <Bar dataKey="consumption" name="Consumption (kWh)" fill="#e85d4c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="generation" name="Generation (kWh)" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
