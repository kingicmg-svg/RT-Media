const fetch = require("node-fetch");

const BREVO_KEY    = process.env.BREVO_KEY;
const FROM_NAME    = process.env.FROM_NAME    || "Round Table Media";
const FROM_EMAIL   = process.env.FROM_EMAIL   || "rtablemedia@gmail.com";
const STUDIO_EMAIL = process.env.STUDIO_EMAIL || "rtablemedia@gmail.com";
const BASE_URL     = process.env.BASE_URL     || "https://rtm-api-abop.onrender.com";

async function send({ to, toName, subject, html }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_KEY,
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to, name: toName || "" }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Brevo error:", err);
  }
}

// ── Shared brand wrapper ──────────────────────────────────────────────────────
function wrap(bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
  body{margin:0;padding:0;background:#F4F4F2;font-family:'DM Sans',sans-serif}
  .shell{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.07)}
  .hdr{background:#0D0D0D;padding:32px 40px;text-align:center}
  .hdr img{height:48px;width:auto}
  .hdr-sub{color:rgba(255,255,255,.45);font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-top:10px;font-weight:500}
  .body{padding:40px}
  .label{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#FF7835;margin-bottom:6px}
  .title{font-size:28px;font-weight:700;color:#0D0D0D;margin:0 0 6px;line-height:1.15}
  .conf{display:inline-block;background:#F7F6F4;border:1px solid #E8E8E8;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;color:#555;letter-spacing:.12em;margin-bottom:28px}
  .row{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #F0F0EE;font-size:14px}
  .row:last-child{border-bottom:none}
  .row .k{color:#888;font-weight:400}
  .row .v{color:#0D0D0D;font-weight:600;text-align:right;max-width:60%}
  .total-box{background:#F7F6F4;border-radius:12px;padding:20px 24px;margin:20px 0}
  .total-row{display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px;color:#555}
  .total-row.big{font-size:18px;font-weight:700;color:#0D0D0D;margin-top:12px;padding-top:12px;border-top:1px solid #E0E0E0;margin-bottom:0}
  .pill{display:inline-block;padding:5px 14px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
  .pill-orange{background:#FFF0E8;color:#FF7835}
  .pill-green{background:#ECFDF5;color:#059669}
  .pill-blue{background:#EFF6FF;color:#2563EB}
  .btn{display:inline-block;padding:14px 28px;border-radius:100px;background:linear-gradient(135deg,#FF7835,#FF3D6B);color:#fff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.02em}
  .btn-outline{display:inline-block;padding:13px 28px;border-radius:100px;border:1.5px solid #E0E0E0;color:#555;text-decoration:none;font-weight:600;font-size:13px}
  .footer-bar{background:#0D0D0D;padding:22px 40px;text-align:center;font-size:12px;color:rgba(255,255,255,.3)}
  .footer-bar a{color:rgba(255,255,255,.45);text-decoration:none}
  .divider{height:1px;background:#F0F0EE;margin:24px 0}
  .note{font-size:13px;color:#888;line-height:1.7;background:#F7F6F4;border-radius:10px;padding:16px 18px}
</style>
</head><body>
<div class="shell">
  <div class="hdr">
    <div style="font-size:22px;font-weight:800;letter-spacing:.08em;color:#fff">RT <span style="background:linear-gradient(135deg,#FF7835,#FF3D6B);-webkit-background-clip:text;-webkit-text-fill-color:transparent">MEDIA</span></div>
    <div class="hdr-sub">Round Table Media · Toronto</div>
  </div>
  <div class="body">
    ${bodyHtml}
  </div>
  <div class="footer-bar">
    © Round Table Media · Toronto &nbsp;·&nbsp; <a href="https://roundtablemedia.ca">roundtablemedia.ca</a>
  </div>
</div>
</body></html>`;
}

// ── 1. Booking received (to client) ──────────────────────────────────────────
function emailBookingReceived(b) {
  return wrap(`
    <div class="label">Booking Request</div>
    <div class="title">We got your request!</div>
    <div class="conf">Conf# ${b.conf}</div>
    <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px">
      Hi ${b.name}, thanks for booking the CYC wall. Your request is being reviewed and we'll confirm your slot as soon as your deposit clears.
    </p>
    <div class="row"><span class="k">Date</span><span class="v">${b.date_str}</span></div>
    <div class="row"><span class="k">Time</span><span class="v">${b.start_time} (${b.hrs}h)</span></div>
    <div class="row"><span class="k">Duration</span><span class="v">${b.dur_label}</span></div>
    ${b.addons ? `<div class="row"><span class="k">Add-ons</span><span class="v">${b.addons}</span></div>` : ""}
    <div class="row"><span class="k">Payment method</span><span class="v">${b.pay_method}</span></div>
    <div class="total-box">
      <div class="total-row"><span>Studio (${b.hrs}h × $100)</span><span>$${Number(b.studio_total).toFixed(2)}</span></div>
      <div class="total-row"><span>Cleaning fee</span><span>$10.00</span></div>
      <div class="total-row"><span>HST (13%)</span><span>$${Number(b.hst).toFixed(2)}</span></div>
      <div class="total-row big"><span>Total</span><span>$${Number(b.grand_total).toFixed(2)}</span></div>
    </div>
    <div class="total-row" style="font-size:14px;margin:8px 0 4px;display:flex;justify-content:space-between"><span style="color:#888">Deposit paid</span><span style="font-weight:700;color:#059669">$${Number(b.deposit).toFixed(2)}</span></div>
    <div class="total-row" style="font-size:14px;display:flex;justify-content:space-between"><span style="color:#888">Balance due on arrival</span><span style="font-weight:700">$${Number(b.balance_due).toFixed(2)}</span></div>
    <div class="divider"></div>
    <div class="note">Questions? Reply to this email or reach us at <a href="mailto:bookings@roundtablemedia.ca" style="color:#FF7835">bookings@roundtablemedia.ca</a></div>
  `);
}

// ── 2. Booking confirmed + receipt link (to client) ───────────────────────────
function emailBookingConfirmed(b, receiptUrl) {
  return wrap(`
    <div class="label">Booking Confirmed</div>
    <div class="title">You're all set! 🎬</div>
    <div class="conf">Conf# ${b.conf}</div>
    <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px">
      Hi ${b.name}, your booking is confirmed. Your deposit has been received — just bring your balance on the day.
    </p>
    <div class="row"><span class="k">Date</span><span class="v">${b.date_str}</span></div>
    <div class="row"><span class="k">Time</span><span class="v">${b.start_time} (${b.hrs}h)</span></div>
    <div class="row"><span class="k">Location</span><span class="v">Round Table Media Studio, Toronto</span></div>
    ${b.addons ? `<div class="row"><span class="k">Add-ons</span><span class="v">${b.addons}</span></div>` : ""}
    <div class="total-box">
      <div class="total-row big"><span>Balance due on arrival</span><span>$${Number(b.balance_due).toFixed(2)}</span></div>
    </div>
    <div style="text-align:center;margin:32px 0 20px">
      <a href="${receiptUrl}" class="btn">📄 Download Receipt</a>
    </div>
    <div class="note">Save this email. Your receipt link is always active at:<br/><a href="${receiptUrl}" style="color:#FF7835;word-break:break-all">${receiptUrl}</a></div>
  `);
}

// ── 3. Reschedule request (to client, from studio) ────────────────────────────
function emailRescheduleRequest(b, newDate, newTime) {
  return wrap(`
    <div class="label">Reschedule Request</div>
    <div class="title">We need to reschedule</div>
    <div class="conf">Conf# ${b.conf}</div>
    <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px">
      Hi ${b.name}, we need to move your booking to a new time. Here's what we're proposing — please reply to confirm or suggest an alternative.
    </p>
    <div class="row"><span class="k">Original date</span><span class="v">${b.date_str} at ${b.start_time}</span></div>
    <div class="row"><span class="k" style="color:#FF7835;font-weight:700">New proposed date</span><span class="v" style="color:#FF7835">${newDate} at ${newTime}</span></div>
    <div class="row"><span class="k">Duration</span><span class="v">${b.hrs}h — unchanged</span></div>
    <div class="divider"></div>
    <div class="note">Reply directly to this email to confirm the new time or request a different date. No changes are final until you confirm.</div>
  `);
}

// ── 4. Reschedule confirmed (to client) ──────────────────────────────────────
function emailRescheduleConfirmed(b) {
  return wrap(`
    <div class="label">Reschedule Confirmed</div>
    <div class="title">New time locked in ✓</div>
    <div class="conf">Conf# ${b.conf}</div>
    <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px">
      Hi ${b.name}, your booking has been rescheduled. Here are your updated details:
    </p>
    <div class="row"><span class="k">New date</span><span class="v">${b.date_str}</span></div>
    <div class="row"><span class="k">New time</span><span class="v">${b.start_time} (${b.hrs}h)</span></div>
    <div class="row"><span class="k">Location</span><span class="v">Round Table Media Studio, Toronto</span></div>
    <div class="total-box">
      <div class="total-row big"><span>Balance due on arrival</span><span>$${Number(b.balance_due).toFixed(2)}</span></div>
    </div>
    <div class="note">Questions? Reply to this email anytime.</div>
  `);
}

// ── 5. Admin notification (to studio) ────────────────────────────────────────
function emailAdminNewBooking(b, adminUrl) {
  return wrap(`
    <div class="label">New Booking</div>
    <div class="title">${b.name} — ${b.date_str}</div>
    <div class="conf">Conf# ${b.conf}</div>
    <div class="row"><span class="k">Time</span><span class="v">${b.start_time} (${b.hrs}h)</span></div>
    <div class="row"><span class="k">Duration</span><span class="v">${b.dur_label}</span></div>
    <div class="row"><span class="k">Add-ons</span><span class="v">${b.addons || "None"}</span></div>
    <div class="row"><span class="k">Payment</span><span class="v">${b.pay_method}</span></div>
    <div class="row"><span class="k">Deposit</span><span class="v">$${Number(b.deposit).toFixed(2)}</span></div>
    <div class="row"><span class="k">Grand Total</span><span class="v">$${Number(b.grand_total).toFixed(2)}</span></div>
    <div class="row"><span class="k">Email</span><span class="v">${b.email}</span></div>
    <div class="row"><span class="k">Phone</span><span class="v">${b.phone || "N/A"}</span></div>
    <div style="text-align:center;margin:32px 0 20px;display:flex;gap:12px;justify-content:center">
      <a href="${adminUrl}" class="btn">Open Admin Panel →</a>
    </div>
  `);
}

// ── 6. Production inquiry to studio ──────────────────────────────────────────
function emailAdminProduction(b) {
  return wrap(`
    <div class="label">Production Inquiry</div>
    <div class="title">${b.name}</div>
    <div class="conf">Conf# ${b.conf}</div>
    <div class="row"><span class="k">Email</span><span class="v">${b.email}</span></div>
    <div class="row"><span class="k">Phone</span><span class="v">${b.phone || "N/A"}</span></div>
    <div class="row"><span class="k">Project type</span><span class="v">${b.project_type || "N/A"}</span></div>
    <div class="row"><span class="k">Crew add-ons</span><span class="v">${b.crew_addons || "None"}</span></div>
    <div class="divider"></div>
    <p style="font-size:14px;color:#555;line-height:1.7"><strong>Details:</strong><br/>${(b.message || "").replace(/\n/g,"<br/>")}</p>
  `);
}

module.exports = {
  send, wrap,
  emailBookingReceived,
  emailBookingConfirmed,
  emailRescheduleRequest,
  emailRescheduleConfirmed,
  emailAdminNewBooking,
  emailAdminProduction,
  STUDIO_EMAIL, FROM_EMAIL, BASE_URL
};
