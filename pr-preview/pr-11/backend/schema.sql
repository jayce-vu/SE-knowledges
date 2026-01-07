CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'author', -- admin, author, reader
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT, -- Markdown content
  excerpt TEXT,
  language TEXT DEFAULT 'vi', -- 'vi' or 'en'
  topic_id INTEGER,
  author_id INTEGER,
  pair_id TEXT, -- ID để map giữa bài viết tiếng Anh và Việt
  meta_description TEXT, -- SEO
  thumbnail_url TEXT, -- Cover image
  created_at INTEGER,
  updated_at INTEGER,
  published_at INTEGER,
  is_published BOOLEAN DEFAULT 0,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER, -- Nullable for anonymous guests if allowed
  guest_name TEXT, -- For guests
  guest_email TEXT, -- For guests
  content TEXT NOT NULL,
  created_at INTEGER,
  is_approved BOOLEAN DEFAULT 0, -- Kiểm duyệt comment
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS post_views (
  slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  post_id INTEGER,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT,
  slug TEXT,
  last_viewed INTEGER,
  PRIMARY KEY (ip, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_pair ON posts(pair_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
