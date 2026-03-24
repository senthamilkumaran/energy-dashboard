import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "energy.db");

export function openDatabase() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email_id TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS energy_consumption_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_kwh REAL NOT NULL,
      min_daily_kwh REAL NOT NULL,
      max_daily_kwh REAL NOT NULL,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS energy_generation_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_kwh REAL NOT NULL,
      min_daily_kwh REAL NOT NULL,
      max_daily_kwh REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_consumption_user_date ON energy_consumption_daily(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_generation_date ON energy_generation_daily(date);
  `);
  return db;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function seedIfEmpty(db) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count > 0) return;

  const hash = bcrypt.hashSync("admin123", 10);
  const insertUser = db.prepare(
    `INSERT INTO users (username, email_id, password_hash) VALUES (?, ?, ?)`
  );

  const users = [
    ["admin", "admin@shellglobal.example", hash],
    ["Alex Rivera", "alex@example.com", hash],
    ["Jordan Lee", "jordan@example.com", hash],
    ["Sam Patel", "sam@example.com", hash],
  ];
  for (const u of users) insertUser.run(...u);

  const userRows = db.prepare("SELECT user_id, username FROM users WHERE username != 'admin'").all();
  const insertCons = db.prepare(
    `INSERT INTO energy_consumption_daily (user_id, date, total_kwh, min_daily_kwh, max_daily_kwh)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertGen = db.prepare(
    `INSERT INTO energy_generation_daily (date, total_kwh, min_daily_kwh, max_daily_kwh)
     VALUES (?, ?, ?, ?)`
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 400; i++) {
    const day = addDays(today, -i);
    const ds = isoDate(day);
    const baseGen = 120 + Math.sin(i / 7) * 25 + (i % 11) * 2;
    const genMin = baseGen * 0.75;
    const genMax = baseGen * 1.15;
    insertGen.run(ds, baseGen, genMin, genMax);

    for (const { user_id, username } of userRows) {
      const noise = (username.charCodeAt(0) % 5) * 3;
      const total = 35 + noise + Math.sin(i / 5 + user_id) * 12 + (i % 9);
      const isHigh = user_id === userRows[0].user_id && i % 30 < 8;
      const bump = isHigh ? 45 : 0;
      const t = total + bump;
      insertCons.run(user_id, ds, t, t * 0.4, t * 1.2 + 5);
    }
  }
}
