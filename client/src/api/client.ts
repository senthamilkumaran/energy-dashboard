const base = "";

function getToken() {
  return localStorage.getItem("energy_token");
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers || {}),
  };
  const t = getToken();
  if (t) (headers as Record<string, string>).Authorization = `Bearer ${t}`;
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type Period = "week" | "month" | "year";

export interface UserRow {
  userId: number;
  username: string;
  emailId: string;
}

export interface Overview {
  totalConsumptionKwh: number;
  totalGenerationKwh: number;
  netExportKwh: number;
  consumerMinDailyKwh: number;
  consumerMaxDailyKwh: number;
  generationMinDailyKwh: number;
  generationMaxDailyKwh: number;
}

export interface DailyPoint {
  date: string;
  totalKwh: number;
  minKwh: number;
  maxKwh: number;
}

export interface SummaryResponse {
  period: { type: Period; start: string; end: string };
  overview: Overview;
  dailyConsumption: DailyPoint[];
  dailyGeneration: DailyPoint[];
}

export interface AlertRow {
  userId: number;
  username: string;
  emailId: string;
  avgDailyKwh: number;
  peakDailyKwh: number;
  message: string;
}

export interface AlertsResponse {
  period: { type: Period; start: string; end: string };
  thresholdKwhPerDay: number;
  alerts: AlertRow[];
}

export function login(username: string, password: string) {
  return api<{ token: string; user: UserRow & { userId: number } }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function fetchUsers() {
  return api<UserRow[]>("/api/users");
}

export function fetchSummary(userId: number, period: Period) {
  const q = new URLSearchParams({ userId: String(userId), period });
  return api<SummaryResponse>(`/api/summary?${q}`);
}

export function fetchAlerts(period: Period, threshold?: number) {
  const q = new URLSearchParams({ period });
  if (threshold != null) q.set("threshold", String(threshold));
  return api<AlertsResponse>(`/api/alerts/high-consumption?${q}`);
}
