CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  entry_date TEXT NOT NULL UNIQUE,
  scene_type TEXT NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 5),
  event_text TEXT NOT NULL,
  first_reaction TEXT NOT NULL,
  hidden_desire TEXT NOT NULL,
  hidden_fear TEXT NOT NULL,
  self_justification TEXT NOT NULL,
  stone_id TEXT,
  stone_text_snapshot TEXT NOT NULL,
  next_action TEXT NOT NULL,
  custom_tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('draft', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stone_id) REFERENCES stones(id)
);

CREATE TABLE IF NOT EXISTS stones (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stones_name ON stones(name);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('weekly', 'monthly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_entries INTEGER NOT NULL DEFAULT 0,
  top_stones_json TEXT NOT NULL DEFAULT '[]',
  top_scenes_json TEXT NOT NULL DEFAULT '[]',
  summary_text TEXT NOT NULL DEFAULT '',
  commitment_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT NOT NULL DEFAULT 'light',
  auto_save_enabled INTEGER NOT NULL DEFAULT 1,
  show_writing_hints INTEGER NOT NULL DEFAULT 1,
  default_export_path TEXT NOT NULL DEFAULT '',
  db_path TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO app_settings (
  id,
  theme,
  auto_save_enabled,
  show_writing_hints,
  default_export_path,
  db_path,
  updated_at
) VALUES (1, 'light', 1, 1, '', '', CURRENT_TIMESTAMP);
