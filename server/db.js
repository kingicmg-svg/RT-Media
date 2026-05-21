const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id          SERIAL PRIMARY KEY,
      conf        TEXT UNIQUE NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      type        TEXT NOT NULL DEFAULT 'cyc',
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT,
      date_str    TEXT,
      start_time  TEXT,
      hrs         INTEGER,
      dur_label   TEXT,
      addons      TEXT,
      pay_method  TEXT,
      studio_total NUMERIC,
      hst         NUMERIC,
      grand_total NUMERIC,
      deposit     NUMERIC,
      balance_due NUMERIC,
      -- production fields
      project_type TEXT,
      crew_addons  TEXT,
      message      TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reschedules (
      id          SERIAL PRIMARY KEY,
      conf        TEXT NOT NULL,
      old_date    TEXT,
      old_time    TEXT,
      new_date    TEXT,
      new_time    TEXT,
      requested_by TEXT DEFAULT 'studio',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("DB ready");
}

module.exports = { pool, init };
