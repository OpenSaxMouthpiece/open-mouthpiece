-- The usage database (D1, bound to the Worker as USAGE): one row per anonymous event from the app
-- (src/usage.ts) or error report (src/report.ts). Apply with:
--   npx wrangler@3 d1 execute open-mouthpiece-usage --remote --file worker/usage.sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,   -- received, ms since 1970 (UTC)
  t INTEGER,             -- ms into the visit (orders a visit's events)
  visit TEXT,            -- random per page load; nothing links one visit to the next
  kind TEXT NOT NULL,    -- visit, design, setting, section, feature, download, quality, error
  name TEXT,             -- the setting, section, feature or download; the error's kind
  design TEXT,           -- a preset's or variant's path, or "own design"
  data TEXT,             -- JSON: a visit's window width / language / referrer site; a download's numbers
  country TEXT,          -- from Cloudflare (two letters)
  device TEXT,           -- phone or desktop
  build TEXT             -- the app build
);
CREATE INDEX IF NOT EXISTS events_kind_ts ON events (kind, ts);
CREATE INDEX IF NOT EXISTS events_visit ON events (visit);
