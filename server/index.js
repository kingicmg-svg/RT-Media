require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const { pool, init } = require("./db");
const em       = require("./emails");

const app  = express();
const PORT = process.env.PORT || 3001;
const ADMIN_SECRET = "rt_media26";
const DEPLOY_TIME = new Date().toISOString();

app.use(cors());
app.use(express.json());

// Add MIME types for video files
app.use(express.static(path.join(__dirname, ".."), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
  }
}));


// ── Helpers ───────────────────────────────────────────────────────────────────
function confNum() {
  return "RTM-" + Date.now().toString(36).toUpperCase().slice(-6);
}
function adminUrl() {
  return `${em.BASE_URL}/admin.html?secret=${ADMIN_SECRET}`;
}
function receiptUrl(conf) {
  return `${em.BASE_URL}/receipt.html?conf=${conf}`;
}

// ── POST /booking  (CYC Wall) ─────────────────────────────────────────────────
app.post("/booking", async (req, res) => {
  try {
    const {
      name, email, phone,
      date_str, start_time, hrs, dur_label,
      addons, pay_method,
      studio_total, hst, grand_total, deposit, balance_due,
    } = req.body;

    const conf = confNum();

    await pool.query(
      `INSERT INTO bookings
        (conf,type,name,email,phone,date_str,start_time,hrs,dur_label,addons,
         pay_method,studio_total,hst,grand_total,deposit,balance_due,status)
       VALUES($1,'cyc',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending')`,
      [conf,name,email,phone||null,date_str,start_time,hrs,dur_label,
       addons||null,pay_method,studio_total,hst,grand_total,deposit,balance_due]
    );

    const b = (await pool.query("SELECT * FROM bookings WHERE conf=$1",[conf])).rows[0];

    // Email client
    await em.send({
      to: email, toName: name,
      subject: `Booking Request Received — Conf# ${conf}`,
      html: em.emailBookingReceived(b),
    });
    // Email studio
    await em.send({
      to: em.STUDIO_EMAIL, toName: "Round Table Media",
      subject: `🎬 New CYC Booking — ${name} · ${date_str} [${conf}]`,
      html: em.emailAdminNewBooking(b, adminUrl()),
    });

    res.json({ ok: true, conf });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /production  (Production inquiry) ────────────────────────────────────
app.post("/production", async (req, res) => {
  try {
    const { name, email, phone, project_type, crew_addons, message } = req.body;
    const conf = confNum();
    await pool.query(
      `INSERT INTO bookings (conf,type,name,email,phone,project_type,crew_addons,message,status)
       VALUES($1,'production',$2,$3,$4,$5,$6,$7,'pending')`,
      [conf,name,email,phone||null,project_type||null,crew_addons||null,message||null]
    );
    const b = (await pool.query("SELECT * FROM bookings WHERE conf=$1",[conf])).rows[0];
    await em.send({
      to: em.STUDIO_EMAIL, toName: "Round Table Media",
      subject: `🎥 Production Inquiry — ${name} [${conf}]`,
      html: em.emailAdminProduction(b),
    });
    res.json({ ok: true, conf });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /confirm  (Studio confirms booking) ──────────────────────────────────
app.post("/confirm", async (req, res) => {
  try {
    const { conf, secret } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: "Unauthorized" });

    await pool.query(
      "UPDATE bookings SET status='confirmed', updated_at=NOW() WHERE conf=$1", [conf]
    );
    const b = (await pool.query("SELECT * FROM bookings WHERE conf=$1",[conf])).rows[0];

    await em.send({
      to: b.email, toName: b.name,
      subject: `Booking Confirmed — Conf# ${conf} ✓`,
      html: em.emailBookingConfirmed(b, receiptUrl(conf)),
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /reschedule  (Studio proposes new time) ──────────────────────────────
app.post("/reschedule", async (req, res) => {
  try {
    const { conf, secret, new_date, new_time } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const b = (await pool.query("SELECT * FROM bookings WHERE conf=$1",[conf])).rows[0];

    // Log reschedule
    await pool.query(
      `INSERT INTO reschedules (conf,old_date,old_time,new_date,new_time)
       VALUES($1,$2,$3,$4,$5)`,
      [conf, b.date_str, b.start_time, new_date, new_time]
    );
    // Update booking
    await pool.query(
      "UPDATE bookings SET date_str=$1, start_time=$2, status='rescheduled', updated_at=NOW() WHERE conf=$3",
      [new_date, new_time, conf]
    );

    await em.send({
      to: b.email, toName: b.name,
      subject: `Your Booking Has Been Rescheduled — Conf# ${conf}`,
      html: em.emailRescheduleRequest(b, new_date, new_time),
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /reschedule-confirm  (Studio confirms rescheduled time is final) ─────
app.post("/reschedule-confirm", async (req, res) => {
  try {
    const { conf, secret } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: "Unauthorized" });

    await pool.query(
      "UPDATE bookings SET status='confirmed', updated_at=NOW() WHERE conf=$1", [conf]
    );
    const b = (await pool.query("SELECT * FROM bookings WHERE conf=$1",[conf])).rows[0];

    await em.send({
      to: b.email, toName: b.name,
      subject: `Reschedule Confirmed — Conf# ${conf} ✓`,
      html: em.emailRescheduleConfirmed(b),
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /bookings  (Admin — list all) ────────────────────────────────────────
app.get("/bookings", async (req, res) => {
  if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ ok: false });
  const { rows } = await pool.query(
    "SELECT * FROM bookings ORDER BY created_at DESC"
  );
  res.json(rows);
});

// ── GET /receipt/:conf  (Receipt data) ───────────────────────────────────────
app.get("/receipt/:conf", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM bookings WHERE conf=$1", [req.params.conf]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// ── GET /settings  (Public — site reads these) ───────────────────────────────
app.get("/settings", async (req, res) => {
  const { rows } = await pool.query("SELECT key, value FROM settings");
  const out = {};
  rows.forEach(r => {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  });
  res.json(out);
});

// ── PUT /settings  (Admin — update one or many keys) ─────────────────────────
app.put("/settings", async (req, res) => {
  const { secret, ...updates } = req.body;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: "Unauthorized" });
  try {
    for (const [key, value] of Object.entries(updates)) {
      const val = typeof value === "string" ? value : JSON.stringify(value);
      await pool.query(
        "INSERT INTO settings (key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2",
        [key, val]
      );
    }
    res.json({ ok: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── DELETE /booking/:conf  (Admin — cancel) ───────────────────────────────────
app.delete("/booking/:conf", async (req, res) => {
  if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ ok: false });
  await pool.query("UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE conf=$1", [req.params.conf]);
  res.json({ ok: true });
});

// ── POST /login-password  (Admin login with password) ──────────────────────────
app.post("/login-password", async (req, res) => {
  try {
    const { password } = req.body;
    const { rows } = await pool.query("SELECT id, password, email, twofa_enabled FROM admin_users WHERE username='admin'");
    if (!rows.length || rows[0].password !== password) {
      await pool.query("INSERT INTO login_history (admin_id, success, reason) VALUES (1, false, 'Invalid password')", []);
      return res.status(401).json({ ok: false, error: "Invalid password" });
    }
    const admin = rows[0];
    if (admin.twofa_enabled) {
      const code = Math.random().toString().slice(2, 8);
      const sessionId = Math.random().toString(36).slice(2);
      await pool.query(
        "INSERT INTO twofa_codes (admin_id, code, session_id, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')",
        [admin.id, code, sessionId]
      );
      await em.send({
        to: admin.email, toName: "Admin",
        subject: "RTM Portal - 2FA Code",
        html: `Your 2FA code is: <strong>${code}</strong><br>Valid for 10 minutes.`
      });
      return res.json({ ok: true, needs2fa: true, sessionId });
    }
    const sessionToken = Math.random().toString(36).slice(2);
    await pool.query(
      "INSERT INTO login_sessions (admin_id, session_token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
      [admin.id, sessionToken]
    );
    await pool.query("UPDATE admin_users SET last_login=NOW() WHERE id=$1", [admin.id]);
    res.json({ ok: true, sessionToken });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /verify-2fa  (Verify 2FA code) ────────────────────────────────────────
app.post("/verify-2fa", async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    const { rows } = await pool.query(
      "SELECT * FROM twofa_codes WHERE session_id=$1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [sessionId]
    );
    if (!rows.length || rows[0].code !== code) {
      return res.status(401).json({ ok: false, error: "Invalid or expired code" });
    }
    await pool.query("UPDATE twofa_codes SET verified=true WHERE id=$1", [rows[0].id]);
    const sessionToken = Math.random().toString(36).slice(2);
    await pool.query(
      "INSERT INTO login_sessions (admin_id, session_token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
      [rows[0].admin_id, sessionToken]
    );
    await pool.query("UPDATE admin_users SET last_login=NOW() WHERE id=$1", [rows[0].admin_id]);
    res.json({ ok: true, sessionToken });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /change-password  (Change admin password) ────────────────────────────
app.post("/change-password", async (req, res) => {
  try {
    const { sessionToken, oldPassword, newPassword } = req.body;
    const { rows: sessions } = await pool.query(
      "SELECT admin_id FROM login_sessions WHERE session_token=$1 AND expires_at > NOW()",
      [sessionToken]
    );
    if (!sessions.length) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const { rows: users } = await pool.query(
      "SELECT * FROM admin_users WHERE id=$1",
      [sessions[0].admin_id]
    );
    if (!users.length || users[0].password !== oldPassword) {
      return res.status(401).json({ ok: false, error: "Current password incorrect" });
    }
    await pool.query(
      "UPDATE admin_users SET password=$1, updated_at=NOW() WHERE id=$2",
      [newPassword, sessions[0].admin_id]
    );
    res.json({ ok: true, message: "Password changed successfully" });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /logout  (Admin logout) ────────────────────────────────────────────────
app.post("/logout", async (req, res) => {
  try {
    const { sessionToken } = req.body;
    await pool.query(
      "DELETE FROM login_sessions WHERE session_token=$1",
      [sessionToken]
    );
    res.json({ ok: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /security-info  (Get security settings) ────────────────────────────────
app.get("/security-info", async (req, res) => {
  try {
    const { secret } = req.query;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ ok: false });
    const { rows: users } = await pool.query("SELECT id, username, email, twofa_enabled, last_login FROM admin_users");
    const { rows: history } = await pool.query("SELECT * FROM login_history ORDER BY created_at DESC LIMIT 20");
    res.json({ users: users[0], history });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init().then(() => {
  app.listen(PORT, () => console.log(`RTM API running on :${PORT}`));
});
