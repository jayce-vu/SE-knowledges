# Migration Guide: View Count từ Slug sang Article ID

## Tổng Quan

View count đã được thay đổi từ đếm theo `slug` sang đếm theo `article_id` để tổng hợp view cho tất cả ngôn ngữ của cùng một bài viết.

## Tại Sao Thay Đổi?

**Vấn đề cũ:**
- Mỗi translation có slug riêng (ví dụ: `bai-viet-tieng-viet` và `article-in-english`)
- View count được đếm riêng cho mỗi slug
- Cùng một bài viết nhưng khác ngôn ngữ có view count khác nhau → không hợp lý

**Giải pháp mới:**
- View count được đếm theo `article_id` (tổng hợp cho tất cả ngôn ngữ)
- Tất cả translations của cùng một article sẽ có cùng view count
- Rate limiting vẫn dùng slug để tránh spam theo từng ngôn ngữ

## Thay Đổi Schema

### Trước:
```sql
CREATE TABLE post_views (
  slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);
```

### Sau:
```sql
CREATE TABLE post_views (
  article_id INTEGER PRIMARY KEY,
  count INTEGER DEFAULT 0,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
```

## Cách Migrate

### Bước 1: Backup Database
```bash
# Export dữ liệu hiện tại (nếu có)
wrangler d1 execute blog-views-db --command "SELECT * FROM post_views" > backup_views.json
```

### Bước 2: Chạy Migration Script

**Option A: Nếu chưa có dữ liệu (Fresh Install)**
```bash
# Chỉ cần chạy schema.sql mới
wrangler d1 execute blog-views-db --file=./schema.sql
```

**Option B: Nếu đã có dữ liệu (Existing Data)**
```bash
# 1. Chạy migration script
wrangler d1 execute blog-views-db --file=./migrate_views_to_article_id.sql

# Hoặc chạy từng bước thủ công:
# Bước 1: Tạo bảng mới
wrangler d1 execute blog-views-db --command "
CREATE TABLE IF NOT EXISTS post_views_new (
  article_id INTEGER PRIMARY KEY,
  count INTEGER DEFAULT 0,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
"

# Bước 2: Migrate dữ liệu
wrangler d1 execute blog-views-db --command "
INSERT INTO post_views_new (article_id, count)
SELECT 
    t.article_id,
    COALESCE(SUM(pv.count), 0) as total_count
FROM article_translations t
LEFT JOIN post_views pv ON t.slug = pv.slug
GROUP BY t.article_id
ON CONFLICT(article_id) DO UPDATE SET count = excluded.count;
"

# Bước 3: Xóa bảng cũ và đổi tên
wrangler d1 execute blog-views-db --command "
DROP TABLE IF EXISTS post_views;
ALTER TABLE post_views_new RENAME TO post_views;
"
```

### Bước 3: Verify Migration
```bash
# Kiểm tra kết quả
wrangler d1 execute blog-views-db --command "
SELECT 
    a.id as article_id,
    COUNT(DISTINCT t.language) as translation_count,
    pv.count as total_views
FROM articles a
LEFT JOIN article_translations t ON a.id = t.article_id
LEFT JOIN post_views pv ON a.id = pv.article_id
GROUP BY a.id, pv.count
ORDER BY pv.count DESC;
"
```

## Thay Đổi Code

### Worker Code
- `handleViewCount()` đã được cập nhật để:
  1. Resolve slug → article_id từ `article_translations`
  2. Đếm view theo `article_id` thay vì `slug`
  3. Rate limiting vẫn dùng slug (để tránh spam theo ngôn ngữ)

### API Behavior
- API endpoint không thay đổi: vẫn nhận `slug` trong query parameter
- Response format không thay đổi: vẫn trả về `{ count: number }`
- Logic thay đổi: view count giờ là tổng hợp cho tất cả ngôn ngữ

## Testing

Sau khi migrate, test các scenarios sau:

1. **Test cùng một article, khác ngôn ngữ:**
```bash
# Tạo view cho slug tiếng Việt
POST /increment?key=bai-viet-tieng-viet

# Kiểm tra view count cho slug tiếng Anh (cùng article)
GET /?key=article-in-english
# Kết quả: count phải giống nhau
```

2. **Test rate limiting:**
```bash
# View slug vi
POST /increment?key=bai-viet-tieng-viet

# Ngay lập tức view slug en (cùng article)
POST /increment?key=article-in-english
# Kết quả: Cả hai đều được đếm (rate limit theo slug)
```

3. **Test với article không tồn tại:**
```bash
GET /?key=non-existent-slug
# Kết quả: 404 "Article not found"
```

## Rollback (Nếu Cần)

Nếu cần rollback về schema cũ:

```sql
-- Tạo lại bảng cũ
CREATE TABLE post_views_old (
  slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- Migrate ngược lại (lấy view count từ article_id đầu tiên)
INSERT INTO post_views_old (slug, count)
SELECT 
    t.slug,
    pv.count
FROM article_translations t
JOIN post_views pv ON t.article_id = pv.article_id
WHERE t.language = 'vi'; -- Hoặc ngôn ngữ mặc định

-- Xóa bảng mới và đổi tên
DROP TABLE post_views;
ALTER TABLE post_views_old RENAME TO post_views;
```

## FAQ

**Q: Tại sao rate limiting vẫn dùng slug?**
A: Để người dùng có thể xem cả hai ngôn ngữ trong cùng 5 phút. Nếu dùng article_id, người dùng chỉ có thể xem một lần cho tất cả ngôn ngữ.

**Q: Có mất dữ liệu khi migrate không?**
A: Không, migration script sẽ tổng hợp view count từ tất cả slugs của cùng một article.

**Q: Nếu một article chỉ có 1 translation thì sao?**
A: Vẫn hoạt động bình thường, view count sẽ được lưu theo article_id.

**Q: Có cần update frontend không?**
A: Không, API endpoint và response format không thay đổi. Chỉ logic internal thay đổi.

