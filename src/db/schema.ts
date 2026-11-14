export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  default_fee REAL NOT NULL DEFAULT 800 CHECK (default_fee >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (location_id, name),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_number INTEGER NOT NULL UNIQUE CHECK (reg_number > 0),
  full_name TEXT NOT NULL,
  phone TEXT,
  batch_id INTEGER NOT NULL,
  weekly_fee REAL NOT NULL DEFAULT 800 CHECK (weekly_fee >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  session_date TEXT NOT NULL CHECK (session_date GLOB '????-??-??'),
  month_key TEXT NOT NULL CHECK (month_key = substr(session_date, 1, 7)),
  UNIQUE (batch_id, session_date),
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID')),
  amount_paid REAL NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  paid_at TEXT,
  UNIQUE (student_id, session_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('LOCATION', 'BATCH', 'STUDENT', 'CLASS_SESSION', 'PAYMENT')),
  entity_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
  last_synced_at TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batches_location_sort
  ON batches(location_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_students_batch_active_reg
  ON students(batch_id, is_active, reg_number);
CREATE INDEX IF NOT EXISTS idx_sessions_batch_month_date
  ON class_sessions(batch_id, month_key, session_date);
CREATE INDEX IF NOT EXISTS idx_payments_session_status
  ON payments(session_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_status_state_updated
  ON sync_status(status, updated_at);
`;

export const SEED_LOCATIONS = ["Matara", "Hakmana"] as const;
export const SEED_BATCHES = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
] as const;
