require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const { pool, init } = require("./db");
const em       = require("./emails");

const app  = express();
const PORT = process.env.PORT || 3001;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "changeme";

app.use(cors());
app.use(express.json());

// Serve the entire website (index.html, admin.html, receipt.html, images, etc.)
app.use(express.static(path.join(__dirname, "..")));


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

// ── Boot ──────────────────────────────────────────────────────────────────────
init().then(() => {
  app.listen(PORT, () => console.log(`RTM API running on :${PORT}`));
});
