PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS submissions (
  submission_id TEXT PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  game_name_zh_cn TEXT NOT NULL DEFAULT '',
  game_name_zh_tw TEXT NOT NULL DEFAULT '',
  game_name_en TEXT NOT NULL DEFAULT '',
  contact_type TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  additional_note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'web',
  page_language TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL,
  client_ip TEXT NOT NULL DEFAULT '',
  client_country TEXT NOT NULL DEFAULT '',
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_error TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS request_items (
  request_id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL,
  target_language TEXT NOT NULL DEFAULT '',
  other_description TEXT NOT NULL DEFAULT '',
  user_status TEXT NOT NULL DEFAULT 'submitted',
  internal_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_anonymous_created
ON submissions(anonymous_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_app_created
ON submissions(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_items_submission
ON request_items(submission_id);
PRAGMA optimize;
