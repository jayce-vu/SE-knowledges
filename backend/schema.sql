-- Bảng Users (Giữ nguyên)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'author',
  created_at INTEGER
);

-- Bảng Topics (Giữ nguyên)
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

-- Bảng Articles: Chứa các thông tin chung cho mọi ngôn ngữ của bài viết
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER,
  author_id INTEGER,
  thumbnail_url TEXT, -- Ảnh bìa dùng chung (hoặc có thể tách nếu cần)
  is_published BOOLEAN DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Bảng Article Translations: Chứa nội dung riêng theo từng ngôn ngữ
CREATE TABLE IF NOT EXISTS article_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  language TEXT NOT NULL, -- 'vi', 'en'
  slug TEXT UNIQUE NOT NULL, -- Slug định danh bài viết (URL), cần unique toàn cục để route dễ dàng
  title TEXT NOT NULL,
  content TEXT, -- Markdown
  excerpt TEXT,
  meta_description TEXT,
  updated_at INTEGER,
  UNIQUE(article_id, language), -- Mỗi bài viết chỉ có 1 bản dịch cho 1 ngôn ngữ
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Bảng Tags (Giữ nguyên - giả sử dùng tag tiếng Anh hoặc chung)
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

-- Bảng Post Tags: Link Article với Tags (Link vào Article cha thay vì Translation con)
CREATE TABLE IF NOT EXISTS article_tags (
  article_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Bảng Comments: Link vào Article cha
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  user_id INTEGER,
  guest_name TEXT,
  guest_email TEXT,
  content TEXT NOT NULL,
  created_at INTEGER,
  is_approved BOOLEAN DEFAULT 0,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bảng Post Views: Đếm view theo Article ID để tổng hợp view cho tất cả ngôn ngữ
-- Một bài viết có thể có nhiều translations (vi, en) nhưng view count chung
CREATE TABLE IF NOT EXISTS post_views (
  article_id INTEGER PRIMARY KEY,
  count INTEGER DEFAULT 0,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Rate limits vẫn dùng slug để tránh spam theo từng ngôn ngữ
-- (Người dùng có thể xem cả vi và en trong cùng 5 phút)
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT,
  slug TEXT,
  last_viewed INTEGER,
  PRIMARY KEY (ip, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic_id);
CREATE INDEX IF NOT EXISTS idx_translations_article ON article_translations(article_id);
CREATE INDEX IF NOT EXISTS idx_translations_lang ON article_translations(language);
