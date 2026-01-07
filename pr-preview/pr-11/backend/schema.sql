CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT, -- Markdown content
  excerpt TEXT,
  language TEXT DEFAULT 'vi', -- 'vi' or 'en'
  topic_id INTEGER,
  pair_id TEXT, -- ID để map giữa bài viết tiếng Anh và Việt
  created_at INTEGER,
  updated_at INTEGER,
  is_published BOOLEAN DEFAULT 1,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE TABLE IF NOT EXISTS post_views (
  slug TEXT PRIMARY KEY, -- Vẫn giữ slug làm key cho đơn giản khi map với frontend cũ
  count INTEGER DEFAULT 0,
  post_id INTEGER, -- Optional: link tới bảng posts
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT,
  slug TEXT,
  last_viewed INTEGER,
  PRIMARY KEY (ip, slug)
);

-- Index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_posts_pair ON posts(pair_id);
