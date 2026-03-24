import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openDatabase, seedIfEmpty } from "./db.js";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { requireAuth } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = openDatabase();
seedIfEmpty(db);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes(db));
app.use("/api", requireAuth, dashboardRoutes(db));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Energy dashboard API listening on http://localhost:${PORT}`);
});
