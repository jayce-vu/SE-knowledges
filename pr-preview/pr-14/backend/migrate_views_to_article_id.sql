-- Migration Script: Chuyển view count từ slug sang article_id
-- Chạy script này sau khi update schema.sql

-- Bước 1: Tạo bảng tạm để lưu view count theo article_id
CREATE TABLE IF NOT EXISTS post_views_new (
  article_id INTEGER PRIMARY KEY,
  count INTEGER DEFAULT 0,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Bước 2: Migrate dữ liệu từ slug sang article_id
-- Tổng hợp view count cho tất cả translations của cùng một article
INSERT INTO post_views_new (article_id, count)
SELECT 
    t.article_id,
    COALESCE(SUM(pv.count), 0) as total_count
FROM article_translations t
LEFT JOIN post_views pv ON t.slug = pv.slug
GROUP BY t.article_id
ON CONFLICT(article_id) DO UPDATE SET count = excluded.count;

-- Bước 3: Xóa bảng cũ
DROP TABLE IF EXISTS post_views;

-- Bước 4: Đổi tên bảng mới thành tên cũ
ALTER TABLE post_views_new RENAME TO post_views;

-- Kiểm tra kết quả
SELECT 
    a.id as article_id,
    COUNT(DISTINCT t.language) as translation_count,
    pv.count as total_views
FROM articles a
LEFT JOIN article_translations t ON a.id = t.article_id
LEFT JOIN post_views pv ON a.id = pv.article_id
GROUP BY a.id, pv.count
ORDER BY pv.count DESC;

