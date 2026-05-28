require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3002;
const ADMIN_PORTAL_PATH = path.join(__dirname, "..", "admin-portal", "index.html");

app.use(cors());
app.use(express.json());

function serveAdminPortalPage(req, res) {
  try {
    let html = fs.readFileSync(ADMIN_PORTAL_PATH, "utf8");
    html = html
      .replaceAll("https://rtm-api-abop.onrender.com/RT%20MEDIA_animate%203.PNG", "/rt-logo.png?v=portal-logo-2")
      .replaceAll("/RT%20MEDIA_animate%203.PNG", "/rt-logo.png?v=portal-logo-2")
      .replaceAll("/rt-logo.png\"", "/rt-logo.png?v=portal-logo-2\"")
      .replaceAll("onerror=\"this.style.display='none'\"", "onerror=\"this.onerror=null;this.src='/apple-touch-icon.png'\"")
      .replace(/\n\/\* Force redeploy 2026-05-26T20:10:00Z \*\/\s*$/, "\n");
    res.type("html").send(html);
  } catch (error) {
    console.error("Failed to serve admin portal", error);
    res.status(500).send("Portal unavailable");
  }
}

app.get(["/", "/index.html"], serveAdminPortalPage);

// Serve the admin portal
app.use(express.static(path.join(__dirname, "..")));

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "admin-portal" });
});

// Proxy API calls to main server
const MAIN_SERVER = process.env.MAIN_SERVER_URL || "http://localhost:3001";

app.get("/bookings", async (req, res) => {
  try {
    const response = await fetch(`${MAIN_SERVER}/bookings`, {
      headers: { "Authorization": `Bearer ${req.query.secret}` }
    });
    res.json(await response.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/settings", async (req, res) => {
  try {
    const response = await fetch(`${MAIN_SERVER}/settings`);
    res.json(await response.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/settings", async (req, res) => {
  try {
    const response = await fetch(`${MAIN_SERVER}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    res.json(await response.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/confirm", async (req, res) => {
  try {
    const response = await fetch(`${MAIN_SERVER}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    res.json(await response.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/booking/:conf", async (req, res) => {
  try {
    const response = await fetch(`${MAIN_SERVER}/booking/${req.params.conf}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${req.query.secret}` }
    });
    res.json(await response.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Admin portal running on :${PORT}`));
