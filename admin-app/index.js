require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Serve the admin portal
app.use(express.static(path.join(__dirname, "..")));

// Redirect root to admin portal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "admin-portal", "index.html"));
});

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
