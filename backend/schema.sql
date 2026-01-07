CREATE TABLE IF NOT EXISTS post_views (
  slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT,
  slug TEXT,
  last_viewed INTEGER,
  PRIMARY KEY (ip, slug)
);
