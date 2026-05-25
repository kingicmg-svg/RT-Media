const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id          SERIAL PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL DEFAULT 'admin',
      password    TEXT NOT NULL,
      email       TEXT NOT NULL,
      twofa_enabled BOOLEAN DEFAULT false,
      last_login  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS twofa_codes (
      id          SERIAL PRIMARY KEY,
      admin_id    INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      code        TEXT NOT NULL,
      session_id  TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      verified    BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS login_sessions (
      id          SERIAL PRIMARY KEY,
      admin_id    INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      session_token TEXT UNIQUE NOT NULL,
      ip_address  TEXT,
      user_agent  TEXT,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS login_history (
      id          SERIAL PRIMARY KEY,
      admin_id    INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      ip_address  TEXT,
      user_agent  TEXT,
      success     BOOLEAN NOT NULL,
      reason      TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
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
      ('studio_email',  'rtablemedia@gmail.com'),
      ('portfolio',     '[{"id":"1","title":"ESCO — Live From Iron City","category":"Music Video","thumbnail":"","src":"","poster":"","order":0},{"id":"2","title":"Northbound — Brand Film","category":"Commercial","thumbnail":"","src":"","poster":"","order":1},{"id":"3","title":"Caano — Story Sessions","category":"Music Video","thumbnail":"","src":"","poster":"","order":2},{"id":"4","title":"Summit — Launch Campaign","category":"Commercial","thumbnail":"","src":"","poster":"","order":3},{"id":"5","title":"Iron City — Movement","category":"Music Video","thumbnail":"","src":"","poster":"","order":4},{"id":"6","title":"Studio 905 — Corporate","category":"Commercial","thumbnail":"","src":"","poster":"","order":5}]'),
      ('cyc_wall',      '[]')
    ON CONFLICT (key) DO NOTHING;
    INSERT INTO admin_users (username, password, email, twofa_enabled) 
    VALUES ('admin', 'rt_media26', 'rtablemedia@gmail.com', true)
    ON CONFLICT (username) DO NOTHING;
  `);
  console.log("DB ready");
}

module.exports = { pool, init };
