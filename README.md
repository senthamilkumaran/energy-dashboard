# Energy Dashboard (Solar Dashboard)

Admin-facing energy monitoring: per-consumer **consumption**, company **generation**, **net export**, daily **min/max** (kWh), period views (**current week / month / year**), charts, and **high-consumption alerts**.

Branding in the UI: **Solar Dashboard — powered by Shell Global**.

## Stack

- **Backend:** Node.js, Express, SQLite (`better-sqlite3`), JWT auth.
- **Frontend:** React 18, Vite, TypeScript, React Router, Recharts.

## Data model (SQLite)

| Table | Purpose |
| --- | --- |
| `users` | `user_id`, `username`, `email_id`, `password_hash` (admin + sample consumers). |
| `energy_consumption_daily` | Per user, per day: `total_kwh`, `min_daily_kwh`, `max_daily_kwh`. |
| `energy_generation_daily` | Company totals per day: `total_kwh`, `min_daily_kwh`, `max_daily_kwh`. |

The database file is created at `server/data/energy.db` on first run and seeded with demo data if empty.

## Run locally

If your environment uses a private npm registry, each app includes `.npmrc` pointing at the public registry for open-source packages. Remove or override if your policy differs.

**1. API**

```bash
cd energy-dashboard/server
npm install
npm run dev
```

API: `http://localhost:3001` (health: `GET /api/health`).

**2. Web app**

```bash
cd energy-dashboard/client
npm install
npm run dev
```

App: `http://localhost:5173` (proxies `/api` to the server).

## Demo login

- **Username:** `admin`  
- **Password:** `admin123`

On the dashboard, pick a **consumer** (non-admin user) and a **period**. Alerts list consumers whose **average daily consumption** in that period exceeds **55 kWh** (configurable via `threshold` on `GET /api/alerts/high-consumption`).

## API (authenticated, except login)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | `{ username, password }` → JWT + user. |
| GET | `/api/users` | Consumers for the monitoring dropdown. |
| GET | `/api/summary?userId=&period=week\|month\|year` | Totals, min/max, daily series. |
| GET | `/api/alerts/high-consumption?period=&threshold=` | High-usage consumers. |

Send header: `Authorization: Bearer <token>`.

## Production notes

- Set `JWT_SECRET` and optionally `PORT`, `DB_PATH`.
- Replace demo auth with your IdP; harden CORS and serve the SPA from the same origin or configure explicit origins.
- Energy values are **kWh** (cumulative for the period for totals). Instantaneous **kW** would require power telemetry, not included in this scaffold.
