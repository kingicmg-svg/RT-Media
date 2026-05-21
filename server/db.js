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
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT INTO settings (key, value) VALUES
      ('hourly_rate',   '100'),
      ('cleaning_fee',  '10'),
      ('hst_rate',      '0.13'),
      ('min_hours',     '2'),
      ('max_hours',     '12'),
      ('studio_open',   '9'),
      ('studio_close',  '22'),
      ('cyc_addons',    '[{"id":"fog","label":"Smoke / Fog Machine","desc":"Atmospheric haze & fog effects","enabled":true},{"id":"cam","label":"Camera & Run-Gun Kit","desc":"Full run-and-gun kit","enabled":true},{"id":"light","label":"Additional Lighting","desc":"Extra LED panels, gels & diffusion","enabled":true},{"id":"cstand","label":"Extra C-Stands","desc":"Additional C-stands for flags & practicals","enabled":true},{"id":"sand","label":"Sandbags","desc":"Extra ballast for stands & rigs","enabled":true}]'),
      ('crew_addons',   '[{"label":"Videographer / DP","rate":"Rate on quote","enabled":true},{"label":"Director","rate":"Rate on quote","enabled":true},{"label":"Production Assistant","rate":"Rate on quote","enabled":true},{"label":"Lighting Tech","rate":"Rate on quote","enabled":true},{"label":"Hair & Makeup","rate":"Rate on quote","enabled":true}]'),
      ('services',      '[{"id":"cyc","label":"Rent the CYC Wall","enabled":true},{"id":"production","label":"Book a Production","enabled":true}]'),
      ('studio_name',   'Round Table Media'),
      ('studio_city',   'Toronto, Ontario'),
      ('studio_email',  'rtablemedia@gmail.com')
    ON CONFLICT (key) DO NOTHING;
  `);
  console.log("DB ready");
}

module.exports = { pool, init };
