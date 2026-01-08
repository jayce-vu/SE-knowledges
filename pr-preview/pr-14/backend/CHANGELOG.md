# Changelog

Tất cả các thay đổi đáng chú ý trong project này sẽ được ghi lại trong file này.

## [2.1.0] - 2024-01-XX

### 🔄 Changed
- **View Count Logic**: Đếm view theo `article_id` thay vì `slug`
  - View count được tổng hợp cho tất cả ngôn ngữ của cùng một bài viết
  - Ví dụ: Bài viết có slug `bai-viet-tieng-viet` (vi) và `article-in-english` (en) sẽ có cùng view count
  - Rate limiting vẫn dùng slug để tránh spam theo từng ngôn ngữ

### 📝 Database Changes
- **Schema Update**: `post_views` table thay đổi từ `slug TEXT PRIMARY KEY` sang `article_id INTEGER PRIMARY KEY`
- **Migration Script**: Thêm `migrate_views_to_article_id.sql` để migrate dữ liệu cũ

### ⚠️ Breaking Changes
- **Database Schema**: Cần chạy migration script nếu đã có dữ liệu
- **API Behavior**: View count giờ đây là tổng hợp cho tất cả ngôn ngữ

---

## [2.0.0] - 2024-01-XX

### ✨ Added
- **Health Check Endpoint**: Thêm `/health` endpoint để monitor worker status
- **Pagination**: GET `/api/articles` hỗ trợ pagination với `limit` và `offset`
- **Input Validation**: 
  - Email format validation
  - Slug format validation (`^[a-z0-9_-]+$`)
  - Required fields validation
  - Length validation (username, password, content)
- **Helper Functions**: 
  - `safeJsonParse()` - Safe JSON parsing với error handling
  - `validateRequired()` - Validate required fields
  - `validateEmail()` - Validate email format
  - `validateSlug()` - Validate slug format
  - `sanitizeError()` - Sanitize error messages

### 🔧 Improved
- **Error Handling**: 
  - Tất cả `await request.json()` đều có error handling
  - Error messages được sanitize (ẩn internal errors trong production)
  - Proper HTTP status codes (201 cho create, 200 cho update)
- **CORS Configuration**: 
  - Có thể config qua env variable `ALLOWED_ORIGIN`
  - Mặc định vẫn là `*` nhưng có thể giới hạn trong production
- **API Response**: 
  - GET `/api/articles` trả về object với `data` và `pagination` metadata
  - Error responses nhất quán với format `{ error: "message" }`
- **Validation**: 
  - Slug validation cho tất cả endpoints sử dụng slug
  - Email validation cho register và comments
  - Content length validation cho comments
  - Username và password length validation

### 🐛 Fixed
- **JSON Parsing**: Fix crash khi nhận invalid JSON body
- **Status Codes**: Fix status code cho POST `/api/admin/articles` (200 cho update, 201 cho create)
- **Error Messages**: Fix information disclosure trong error messages
- **Slug Validation**: Thêm validation cho slug format trong view count endpoint

### 📝 Documentation
- Cập nhật `API_DOCUMENTATION.md` với:
  - Health check endpoint
  - Pagination parameters
  - Validation requirements
  - Error handling improvements
- Cập nhật `wrangler.toml` với env variables documentation

### ⚠️ Breaking Changes
- GET `/api/articles` response format thay đổi:
  - **Trước**: `Array<Article>`
  - **Sau**: `{ data: Array<Article>, pagination: {...} }`

### 🔒 Security
- Sanitize error messages để tránh information disclosure
- Input validation để tránh invalid data
- Slug validation để tránh injection attacks

---

## [1.0.0] - Initial Release

### ✨ Features
- View count API với rate limiting
- Public articles API (list và detail)
- Comments API (get và create)
- Admin API (create/update articles)
- Topics và Tags API
- Auth API (register và login)
- D1 Database integration
- CORS support

---

## Format

Format dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
và project này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Types of Changes
- `Added` - Tính năng mới
- `Changed` - Thay đổi trong functionality hiện tại
- `Deprecated` - Tính năng sắp bị loại bỏ
- `Removed` - Tính năng đã bị loại bỏ
- `Fixed` - Bug fixes
- `Security` - Security fixes

