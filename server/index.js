require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const fs       = require("fs");
const multer   = require("multer");
const { pool, init } = require("./db");
const em       = require("./emails");

const app  = express();
const PORT = process.env.PORT || 3001;
const ADMIN_SECRET = "rt_media26";
const DEPLOY_TIME = new Date().toISOString();
const VIDEOS_DIR = "/mnt/videos";
const RATE_LIMITS = new Map();
const TRUSTED_ORIGINS = new Set([
  "https://rtm-api-abop.onrender.com",
  "https://roundtablemedia.ca",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
]);

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cache-Control", "no-store");
  const origin = req.headers.origin;
  if (!origin || TRUSTED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' https://unpkg.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https://rtm-api-abop.onrender.com https://www.google-analytics.com https://www.googletagmanager.com;"
  );
  next();
});

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    return res.sendStatus(204);
  }
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "32kb" }));

function rateLimit(key, limit, windowMs) {
  return (req, res, next) => {
    const now = Date.now();
    const routeKey = `${key}:${req.ip || "unknown"}`;
    const bucket = RATE_LIMITS.get(routeKey) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    RATE_LIMITS.set(routeKey, bucket);
    if (bucket.count > limit) {
      return res.status(429).json({ ok: false, error: "Too many requests" });
    }
    next();
  };
}

// Create videos directory if it doesn't exist
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

const upload = multer({ storage: multer.diskStorage({ destination: VIDEOS_DIR, filename: (req, file, cb) => cb(null, file.originalname) }) });

// Serve static files with MIME types
app.use(express.static(path.join(__dirname, ".."), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
  }
}));

// Serve videos from persistent disk with MIME types
app.use('/videos', express.static('/mnt/videos', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
  }
}));

// Temporary upload endpoint for videos (secret token required)
app.post('/upload-videos/:token', rateLimit('upload-videos', 6, 15 * 60 * 1000), upload.array('files'), (req, res) => {
  if (req.params.token !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  res.json({ ok: true, uploaded: req.files?.length || 0 });
});

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

async function isSessionTokenValid(sessionToken) {
  if (!sessionToken) return false;
  const { rows } = await pool.query(
    "SELECT 1 FROM login_sessions WHERE session_token=$1 AND expires_at > NOW() LIMIT 1",
    [sessionToken]
  );
  return rows.length > 0;
}

async function isAdminAuthorized(secretOrToken) {
  if (!secretOrToken) return false;
  if (secretOrToken === ADMIN_SECRET) return true;
  return isSessionTokenValid(secretOrToken);
}

function normalizeChatText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatChatHours(value, fallback = 0) {
  const hour = Number.isFinite(Number(value)) ? Number(value) : fallback;
  const normalized = ((hour % 24) + 24) % 24;
  const ampm = normalized >= 12 ? "PM" : "AM";
  const display = normalized % 12 || 12;
  return `${display}:00 ${ampm}`;
}

function formatChatMoney(value, fallback = 0) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : fallback;
  return `$${amount.toFixed(2)}`;
}

function summarizeEnabledLabels(items, fallbackLabels = []) {
  const labels = Array.isArray(items)
    ? items
        .filter(item => item && item.enabled !== false)
        .map(item => normalizeChatText(item.label || item.name || item.title))
        .filter(Boolean)
    : [];
  return labels.length > 0 ? labels : fallbackLabels;
}

async function getSettingsMap() {
  const { rows } = await pool.query("SELECT key, value FROM settings");
  const out = {};
  rows.forEach(r => {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  });
  return out;
}

function buildChatReply(message, settings) {
  const text = normalizeChatText(message).toLowerCase();
  const weekdayOpen = formatChatHours(settings.weekday_open ?? settings.studio_open, 8);
  const weekdayClose = formatChatHours(settings.weekday_close ?? settings.studio_close, 24);
  const weekendOpen = formatChatHours(settings.weekend_open ?? settings.studio_open, 10);
  const weekendClose = formatChatHours(settings.weekend_close ?? settings.studio_close, 26);
  const hourlyRate = Number.isFinite(Number(settings.hourly_rate)) ? Number(settings.hourly_rate) : 100;
  const minHours = Math.max(1, Math.round(Number(settings.min_hours ?? 2)) || 2);
  const cleaningFee = formatChatMoney(settings.cleaning_fee, 10);
  const hstRate = Number.isFinite(Number(settings.hst_rate)) ? Number(settings.hst_rate) : 0.13;
  const studioEmail = normalizeChatText(settings.studio_email) || "rtablemedia@gmail.com";
  const serviceSummary = summarizeEnabledLabels(settings.services, ["Music Videos", "Commercials & Brand", "Full Production", "CYC Wall Rental"]);
  const cycAddonSummary = summarizeEnabledLabels(settings.cyc_addons, ["Smoke / Fog Machine", "Camera & Run-Gun Kit", "Additional Lighting", "Extra C-Stands", "Sandbags"]);
  const crewAddonSummary = summarizeEnabledLabels(settings.crew_addons, ["Director", "Producer", "Cinematographer", "Gaffer", "Hair & Makeup"]);

  const wantsHuman = /(human|management|studio management|manager|person|representative|talk to someone|call me|reply by email|book a call|contact studio)/i.test(text);

  if (wantsHuman) {
    return {
      reply: `I can pass this directly to studio management. Leave your name and email if you'd like a reply, or send your question here and the team will see it in the admin inbox.`,
      handoff: true,
    };
  }

  if (/(hours|open|opening|close|closing|when are you open|schedule)/i.test(text)) {
    return {
      reply: `Studio hours are Mon - Fri: ${weekdayOpen} - ${weekdayClose} and Sat - Sun: ${weekendOpen} - ${weekendClose}.`,
      handoff: false,
    };
  }

  if (/(pricing|price|rate|rates|cost|quote|how much)/i.test(text)) {
    return {
      reply: `CYC Wall bookings start at ${formatChatMoney(hourlyRate)}/hr with a ${minHours}-hour minimum. Cleaning fee is ${cleaningFee}, HST is ${Math.round(hstRate * 100)}%, and selected add-ons appear in the quote.`,
      handoff: false,
    };
  }

  if (/(deposit|hold|payment hold|payment|pay|pay via|pay by|paypal|apple pay|google pay|etransfer)/i.test(text)) {
    return {
      reply: `To reserve a slot, checkout holds your booking for 5 minutes. The current deposit is ${formatChatMoney(100)}, the cleaning fee is ${cleaningFee}, and HST is ${Math.round(hstRate * 100)}%. If the hold expires, you can restart checkout.`,
      handoff: false,
    };
  }

  if (/(book|booking|reserve|availability|available|date|time)/i.test(text)) {
    return {
      reply: "You can start a booking from the Book section by choosing your date, time, add-ons, and payment method. If you want, I can send this to studio management for a custom quote.",
      handoff: false,
    };
  }

  if (/(addon|add-on|add ons|extra|extras|equipment|lights|crew|producer|director|gaffer|makeup|hair)/i.test(text)) {
    const addOnParts = [];
    if (cycAddonSummary.length) addOnParts.push(`CYC add-ons: ${cycAddonSummary.join(", ")}`);
    if (crewAddonSummary.length) addOnParts.push(`crew support: ${crewAddonSummary.join(", ")}`);
    return {
      reply: addOnParts.length
        ? `${addOnParts.join(". ")}. If you want exact pricing for your booking, I can send it to studio management.`
        : "Add-ons are quoted based on the booking type. If you need exact options, I can send this to studio management.",
      handoff: false,
    };
  }

  if (/(services|what do you do|production|music video|commercial|brand|cyc|wall|studio)/i.test(text)) {
    return {
      reply: `We offer ${serviceSummary.join(", ")}. If you want a quote or custom package, studio management can take it from here.`,
      handoff: false,
    };
  }

  if (/(format|delivery|prores|dnxhd|h\.264|raw footage|turnaround|revision|licens|permit|location|colour|color)/i.test(text)) {
    return {
      reply: "FAQ quick answer: we deliver in common pro formats like ProRes, DNxHD, and H.264; turnaround is usually 2-4 weeks depending on scope; color grading is included on standard work; 2 revision rounds are included; and permits can be handled for location shoots when needed.",
      handoff: false,
    };
  }

  if (/(email|contact|location|address|where are you|bookings@|rtablemedia@gmail.com)/i.test(text)) {
    return {
      reply: `You can reach studio management at ${studioEmail}. The studio is at 130 Westmore Drive, Etobicoke, Unit 2.`,
      handoff: false,
    };
  }

  if (text.length < 18) {
    return {
      reply: `I can pass this directly to studio management. Leave your name and email if you'd like a reply, or send your question here and the team will see it in the admin inbox.`,
      handoff: true,
    };
  }

  return {
    reply: `I can help with bookings, hours, pricing, add-ons, studio services, or delivery timelines. If you want a human, I can send your message directly to studio management.`,
    handoff: true,
  };
}

async function createChatThread(visitorId, name, email) {
  const { rows } = await pool.query(
    `INSERT INTO chat_threads (visitor_id, name, email, status, last_message_at)
     VALUES ($1, $2, $3, 'open', NOW())
     ON CONFLICT (visitor_id) DO UPDATE
       SET name = COALESCE(EXCLUDED.name, chat_threads.name),
           email = COALESCE(EXCLUDED.email, chat_threads.email),
           updated_at = NOW()
     RETURNING *`,
    [visitorId, name || null, email || null]
  );
  return rows[0];
}

async function addChatMessage(threadId, role, message, senderName = null, source = 'site', markRead = false) {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (thread_id, role, sender_name, message, source, read_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [threadId, role, senderName, message, source, markRead ? new Date() : null]
  );
  await pool.query(
    `UPDATE chat_threads
        SET last_message = $1,
            last_message_at = NOW(),
            updated_at = NOW(),
            status = CASE WHEN $2 = 'admin' THEN 'open' ELSE status END
      WHERE id = $3`,
    [message, role, threadId]
  );
  return rows[0];
}

// ── POST /booking  (CYC Wall) ─────────────────────────────────────────────────
app.post("/booking", rateLimit('booking', 10, 15 * 60 * 1000), async (req, res) => {
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
app.post("/production", rateLimit('production', 10, 15 * 60 * 1000), async (req, res) => {
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
    if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: "Unauthorized" });

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
    if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: "Unauthorized" });

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
    if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: "Unauthorized" });

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
  if (!(await isAdminAuthorized(req.query.secret))) return res.status(401).json({ ok: false });
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
  if (out.weekday_open == null) out.weekday_open = 8;
  if (out.weekday_close == null) out.weekday_close = 24;
  if (out.weekend_open == null) out.weekend_open = 10;
  if (out.weekend_close == null) out.weekend_close = 26;
  res.json(out);
});

// ── PUT /settings  (Admin — update one or many keys) ─────────────────────────
app.put("/settings", rateLimit("settings-put", 30, 15 * 60 * 1000), async (req, res) => {
  const { secret, ...updates } = req.body;
  if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: "Unauthorized" });
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

// ── CHAT ────────────────────────────────────────────────────────────────────
app.post("/chat/message", rateLimit("chat-message", 20, 5 * 60 * 1000), async (req, res) => {
  try {
    const visitorId = normalizeChatText(req.body.visitor_id) || Math.random().toString(36).slice(2);
    const name = normalizeChatText(req.body.name);
    const email = normalizeChatText(req.body.email);
    const message = normalizeChatText(req.body.message);
    const source = normalizeChatText(req.body.source) || 'site';

    if (!message) return res.status(400).json({ ok: false, error: "Message required" });

    const settings = await getSettingsMap();
    const thread = await createChatThread(visitorId, name, email);
    await addChatMessage(thread.id, 'user', message, name || null, source, false);

    const replyData = buildChatReply(message, settings);
    await addChatMessage(thread.id, 'bot', replyData.reply, 'RTM Assistant', 'bot', true);

    if (replyData.handoff) {
      await pool.query(`UPDATE chat_threads SET status='needs_human', updated_at=NOW() WHERE id=$1`, [thread.id]);
    }

    if (replyData.handoff && normalizeChatText(settings.studio_email)) {
      try {
        await em.send({
          to: normalizeChatText(settings.studio_email),
          toName: normalizeChatText(settings.studio_name) || 'Round Table Media',
          subject: `New website chat message${name ? ` from ${name}` : ''}`,
          html: `<h2>New website chat message</h2><p><strong>Name:</strong> ${escapeHtml(name || 'Visitor')}</p><p><strong>Email:</strong> ${escapeHtml(email || '—')}</p><p><strong>Message:</strong><br/>${escapeHtml(message).replace(/\n/g,'<br/>')}</p>`,
        });
      } catch (mailErr) {
        console.error('Chat notification email failed:', mailErr.message);
      }
    }

    res.json({ ok: true, visitor_id: visitorId, thread_id: thread.id, reply: replyData.reply, handoff: replyData.handoff });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/chat/threads", rateLimit("chat-threads", 60, 60 * 1000), async (req, res) => {
  try {
    if (!(await isAdminAuthorized(req.query.secret))) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const { rows } = await pool.query(`
      SELECT
        t.id,
        t.visitor_id,
        t.name,
        t.email,
        t.status,
        t.last_message,
        t.last_message_at,
        t.updated_at,
        COALESCE(SUM(CASE WHEN m.role='user' AND m.read_at IS NULL THEN 1 ELSE 0 END), 0)::int AS unread_count
      FROM chat_threads t
      LEFT JOIN chat_messages m ON m.thread_id = t.id
      GROUP BY t.id
      ORDER BY t.last_message_at DESC, t.id DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/chat/messages/:threadId", rateLimit("chat-messages", 120, 60 * 1000), async (req, res) => {
  try {
    if (!(await isAdminAuthorized(req.query.secret))) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const { rows } = await pool.query(
      `SELECT * FROM chat_messages WHERE thread_id=$1 ORDER BY created_at ASC`,
      [req.params.threadId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/chat/reply", rateLimit("chat-reply", 60, 60 * 1000), async (req, res) => {
  try {
    const { secret, thread_id, message } = req.body;
    if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const threadId = Number(thread_id);
    const text = normalizeChatText(message);
    if (!threadId || !text) return res.status(400).json({ ok: false, error: 'Thread and message required' });
    await addChatMessage(threadId, 'admin', text, 'Studio Management', 'admin', true);
    await pool.query(`UPDATE chat_threads SET status='open', updated_at=NOW() WHERE id=$1`, [threadId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/chat/mark-read", rateLimit("chat-mark-read", 120, 60 * 1000), async (req, res) => {
  try {
    const { secret, thread_id } = req.body;
    if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    await pool.query(
      `UPDATE chat_messages SET read_at=COALESCE(read_at, NOW()) WHERE thread_id=$1 AND role='user'`,
      [Number(thread_id)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/chat/close", rateLimit("chat-close", 30, 60 * 1000), async (req, res) => {
  try {
    const { secret, thread_id } = req.body;
    if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    await pool.query(`UPDATE chat_threads SET status='closed', updated_at=NOW() WHERE id=$1`, [Number(thread_id)]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── DELETE /booking/:conf  (Admin — cancel) ───────────────────────────────────
app.delete("/booking/:conf", async (req, res) => {
  if (!(await isAdminAuthorized(req.query.secret))) return res.status(401).json({ ok: false });
  await pool.query("UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE conf=$1", [req.params.conf]);
  res.json({ ok: true });
});

// ── POST /login-password  (Admin login with password) ──────────────────────────
app.post("/login-password", rateLimit('login-password', 8, 15 * 60 * 1000), async (req, res) => {
  try {
    const { password } = req.body;
    let { rows } = await pool.query("SELECT id, password, email, twofa_enabled FROM admin_users WHERE username='admin'");
    
    if (!rows.length) {
      await pool.query(
        "INSERT INTO admin_users (username, password, email, twofa_enabled) VALUES ('admin', $1, 'rtablemedia@gmail.com', true)",
        [password]
      );
      rows = (await pool.query("SELECT id, password, email, twofa_enabled FROM admin_users WHERE username='admin'")).rows;
    }
    
    if (rows[0].password !== password) {
      await pool.query("INSERT INTO login_history (admin_id, success, reason) VALUES ($1, false, 'Invalid password')", [rows[0].id]);
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
        html: `<h2>Your 2FA Code</h2><p>Enter this code to login: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>Valid for 10 minutes.</p>`
      });
      return res.json({ ok: true, needs2fa: true, sessionId, email: admin.email });
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
app.post("/verify-2fa", rateLimit('verify-2fa', 8, 15 * 60 * 1000), async (req, res) => {
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
app.post("/change-password", rateLimit('change-password', 5, 15 * 60 * 1000), async (req, res) => {
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
app.post("/logout", rateLimit('logout', 20, 15 * 60 * 1000), async (req, res) => {
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

// ── POST /portfolio-upload  (Upload media for portfolio/cyc wall) ─────────────
app.post('/portfolio-upload/:secret', rateLimit('portfolio-upload', 6, 15 * 60 * 1000), upload.single('file'), async (req, res) => {
  if (!(await isAdminAuthorized(req.params.secret))) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });
  res.json({ 
    ok: true, 
    filename: req.file.filename,
    url: `/videos/${req.file.filename}`,
    size: req.file.size
  });
});

// ── GET /videos-list  (List available video files) ──────────────────────────────
app.get('/videos-list', (req, res) => {
  try {
    const files = fs.readdirSync(VIDEOS_DIR).filter(f => 
      f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.webm') || f.endsWith('.avi')
    );
    res.json(files.map(f => ({ name: f, url: `/videos/${f}` })));
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /portfolio  (Fetch portfolio items) ────────────────────────────────────
app.get('/portfolio', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key='portfolio'");
    const portfolio = rows.length ? JSON.parse(rows[0].value) : [];
    res.json(portfolio);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /portfolio  (Update portfolio items) ────────────────────────────────────
app.put('/portfolio', async (req, res) => {
  const { secret, items } = req.body;
  if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    await pool.query(
      "INSERT INTO settings (key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2",
      ['portfolio', JSON.stringify(items)]
    );
    res.json({ ok: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /cyc-wall  (Fetch CYC wall gallery items) ────────────────────────────
app.get('/cyc-wall', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key='cyc_wall'");
    const cycWall = rows.length ? JSON.parse(rows[0].value) : [];
    res.json(cycWall);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /cyc-wall  (Update CYC wall gallery) ───────────────────────────────────
app.put('/cyc-wall', async (req, res) => {
  const { secret, items } = req.body;
  if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    await pool.query(
      "INSERT INTO settings (key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2",
      ['cyc_wall', JSON.stringify(items)]
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
    if (!(await isAdminAuthorized(secret))) return res.status(401).json({ ok: false });
    const { rows: users } = await pool.query("SELECT id, username, email, twofa_enabled, last_login FROM admin_users");
    const { rows: history } = await pool.query("SELECT * FROM login_history ORDER BY created_at DESC LIMIT 20");
    res.json({ ok: true, users: users[0], history });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /toggle-2fa  (Enable/disable admin 2FA) ─────────────────────────────
app.post("/toggle-2fa", async (req, res) => {
  try {
    const { sessionToken, secret, enabled } = req.body;
    const authToken = sessionToken || secret;
    if (!(await isAdminAuthorized(authToken))) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    let adminId = null;
    if (sessionToken) {
      const { rows: sessions } = await pool.query(
        "SELECT admin_id FROM login_sessions WHERE session_token=$1 AND expires_at > NOW()",
        [sessionToken]
      );
      adminId = sessions[0]?.admin_id || null;
    }

    if (!adminId) {
      const { rows: users } = await pool.query(
        "SELECT id FROM admin_users WHERE username='admin' ORDER BY id ASC LIMIT 1"
      );
      adminId = users[0]?.id || null;
    }

    if (!adminId) {
      return res.status(404).json({ ok: false, error: "Admin user not found" });
    }

    await pool.query(
      "UPDATE admin_users SET twofa_enabled=$1, updated_at=NOW() WHERE id=$2",
      [Boolean(enabled), adminId]
    );

    const { rows: users } = await pool.query(
      "SELECT id, username, email, twofa_enabled, last_login FROM admin_users WHERE id=$1",
      [adminId]
    );
    res.json({ ok: true, user: users[0] || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init().then(() => {
  app.listen(PORT, () => console.log(`RTM API running on :${PORT}`));
});
