import { Router } from "express";
import bcrypt from "bcryptjs";
import { signToken } from "../middleware/auth.js";

export function authRoutes(db) {
  const r = Router();

  r.post("/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "username and password required" });
    }
    const row = db
      .prepare("SELECT user_id, username, email_id, password_hash FROM users WHERE username = ?")
      .get(username);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = signToken({
      sub: row.user_id,
      username: row.username,
      email: row.email_id,
    });
    res.json({
      token,
      user: {
        userId: row.user_id,
        username: row.username,
        emailId: row.email_id,
      },
    });
  });

  return r;
}
