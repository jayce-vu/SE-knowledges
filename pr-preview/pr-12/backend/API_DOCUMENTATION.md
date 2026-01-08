# API Documentation

Tài liệu các API endpoints được hỗ trợ bởi Cloudflare Worker.

**Base URL**: `https://your-worker.workers.dev`

**CORS**: Tất cả endpoints đều hỗ trợ CORS. Có thể config qua env variable `ALLOWED_ORIGIN` (mặc định: `*`)

**Environment Variables:**
- `ENVIRONMENT`: `"development"` hoặc `"production"` (ảnh hưởng đến error messages)
- `ALLOWED_ORIGIN`: CORS origin (mặc định: `"*"`)

---

## 🏥 Health Check

### GET `/health`
Kiểm tra trạng thái của worker.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890123,
  "environment": "production"
}
```

**Example:**
```bash
GET /health
```

---

## 📊 View Count API

## 📊 View Count API

### GET/POST `/` hoặc `/increment`
Đếm lượt view cho bài viết. View count được tổng hợp cho tất cả ngôn ngữ của cùng một bài viết.

**Query Parameters:**
- `key` (required): Slug của bài viết (phải match format: `[a-z0-9_-]+`)

**Rate Limiting:** 
- 1 view mỗi IP mỗi 5 phút (300 giây) - Rate limit áp dụng theo slug (ngôn ngữ)

**Validation:**
- Slug phải match regex: `^[a-z0-9_-]+$`
- Slug phải tồn tại trong `article_translations`

**Logic:**
- View count được lưu theo `article_id` (không phải `slug`)
- Tất cả translations của cùng một article sẽ có cùng view count
- Ví dụ: Bài viết có slug `bai-viet-tieng-viet` (vi) và `article-in-english` (en) sẽ có cùng view count

**Response:**
```json
{
  "count": 42
}
```

**Example:**
```bash
GET /?key=bai-viet-tieng-viet
POST /increment?key=article-in-english
# Cả hai sẽ trả về cùng view count nếu là cùng một article
```

---

## 📝 Public Articles API

### GET `/api/articles`
Lấy danh sách bài viết đã publish với pagination.

**Query Parameters:**
- `lang` (optional): Ngôn ngữ (`vi` hoặc `en`). Mặc định: `vi`
- `limit` (optional): Số lượng bài viết mỗi trang. Mặc định: `20`, Tối đa: `100`
- `offset` (optional): Số bài viết bỏ qua. Mặc định: `0`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "slug": "my-article",
      "title": "Tiêu đề bài viết",
      "excerpt": "Tóm tắt...",
      "language": "vi",
      "created_at": 1234567890,
      "thumbnail_url": "https://...",
      "topic_name": "Security"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100,
    "hasMore": true
  }
}
```

**Example:**
```bash
GET /api/articles?lang=vi
GET /api/articles?lang=en&limit=10&offset=20
```

---

### GET `/api/articles/:slug`
Lấy chi tiết một bài viết theo slug.

**Path Parameters:**
- `slug`: Slug của bài viết (phải match format: `[a-z0-9_-]+`)

**Validation:**
- Slug phải match regex: `^[a-z0-9_-]+$`

**Response:**
```json
{
  "id": 1,
  "topic_id": 1,
  "author_id": 1,
  "thumbnail_url": "https://...",
  "is_published": 1,
  "created_at": 1234567890,
  "updated_at": 1234567890,
  "topic_name": "Security",
  "author_name": "admin",
  "slug": "my-article",
  "title": "Tiêu đề bài viết",
  "content": "Nội dung markdown...",
  "excerpt": "Tóm tắt...",
  "meta_description": "Meta description...",
  "language": "vi",
  "tags": [
    {
      "name": "Security",
      "slug": "security"
    }
  ]
}
```

**Example:**
```bash
GET /api/articles/my-article-slug
```

---

## 💬 Comments API

### GET `/api/comments`
Lấy danh sách comments của một bài viết.

**Query Parameters:**
- `post_slug` (required): Slug của bài viết

**Response:**
```json
[
  {
    "id": 1,
    "content": "Bình luận hay quá!",
    "created_at": 1234567890,
    "guest_name": "Nguyễn Văn A",
    "username": null
  }
]
```

**Example:**
```bash
GET /api/comments?post_slug=my-article-slug
```

---

### POST `/api/comments`
Tạo comment mới cho bài viết.

**Request Body:**
```json
{
  "post_slug": "my-article-slug",
  "content": "Bình luận của tôi",
  "guest_name": "Nguyễn Văn A",
  "guest_email": "email@example.com"
}
```

**Validation:**
- `post_slug` (required): Slug hợp lệ
- `content` (required): Tối thiểu 3 ký tự
- `guest_name` (required): Không được rỗng
- `guest_email` (optional): Phải là email hợp lệ nếu có

**Response:**
```json
{
  "success": true,
  "message": "Comment submitted"
}
```

**Note:** Comments được auto-approve (is_approved = 1)

**Example:**
```bash
POST /api/comments
Content-Type: application/json

{
  "post_slug": "my-article-slug",
  "content": "Great article!",
  "guest_name": "John Doe",
  "guest_email": "john@example.com"
}
```

---

## 🔐 Admin API

### GET `/api/admin/articles/:id`
Lấy toàn bộ thông tin bài viết (bao gồm tất cả translations) để chỉnh sửa.

**Path Parameters:**
- `id`: ID của bài viết

**Response:**
```json
{
  "article": {
    "id": 1,
    "topic_id": 1,
    "author_id": 1,
    "thumbnail_url": "https://...",
    "is_published": 1,
    "created_at": 1234567890,
    "updated_at": 1234567890
  },
  "translations": [
    {
      "id": 1,
      "article_id": 1,
      "language": "vi",
      "slug": "bai-viet-tieng-viet",
      "title": "Tiêu đề tiếng Việt",
      "content": "...",
      "excerpt": "...",
      "meta_description": "..."
    },
    {
      "id": 2,
      "article_id": 1,
      "language": "en",
      "slug": "article-in-english",
      "title": "English Title",
      "content": "...",
      "excerpt": "...",
      "meta_description": "..."
    }
  ],
  "tag_ids": [1, 2, 3]
}
```

**Example:**
```bash
GET /api/admin/articles/1
```

---

### POST `/api/admin/articles`
Tạo hoặc cập nhật bài viết với nhiều translations.

**Headers:**
- `Authorization`: (required) Token xác thực (hiện tại chỉ check có header)

**Request Body:**
```json
{
  "id": null,  // null để tạo mới, có ID để update
  "topic_id": 1,
  "author_id": 1,
  "thumbnail_url": "https://...",
  "is_published": true,
  "tags": [1, 2, 3],
  "translations": [
    {
      "language": "vi",
      "slug": "bai-viet-tieng-viet",
      "title": "Tiêu đề tiếng Việt",
      "content": "Nội dung markdown...",
      "excerpt": "Tóm tắt...",
      "meta_description": "Meta description..."
    },
    {
      "language": "en",
      "slug": "article-in-english",
      "title": "English Title",
      "content": "Markdown content...",
      "excerpt": "Excerpt...",
      "meta_description": "Meta description..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "id": 1
}
```

**Status Codes:**
- `201`: Created (tạo mới)
- `200`: OK (cập nhật)

**Validation:**
- `translations` (required): Array, tối thiểu 1 translation
- Mỗi translation phải có: `language` (`vi` hoặc `en`), `slug`, `title`
- `slug` phải match format: `^[a-z0-9_-]+$`

**Example:**
```bash
POST /api/admin/articles
Authorization: Bearer token123
Content-Type: application/json

{
  "topic_id": 1,
  "author_id": 1,
  "is_published": true,
  "translations": [...]
}
```

---

## 🏷️ Topics API

### GET `/api/topics`
Lấy danh sách tất cả topics.

**Response:**
```json
[
  {
    "id": 1,
    "slug": "security",
    "name": "Security",
    "description": "Bài viết về bảo mật"
  }
]
```

**Example:**
```bash
GET /api/topics
```

---

### POST `/api/topics`
Tạo topic mới.

**Request Body:**
```json
{
  "name": "Security",
  "slug": "security",
  "description": "Bài viết về bảo mật"
}
```

**Validation:**
- `name` (required): Không được rỗng
- `slug` (required): Phải match format `^[a-z0-9_-]+$`

**Response:**
```json
{
  "success": true,
  "id": 1
}
```

**Example:**
```bash
POST /api/topics
Content-Type: application/json

{
  "name": "Security",
  "slug": "security",
  "description": "Security articles"
}
```

---

## 🏷️ Tags API

### GET `/api/tags`
Lấy danh sách tất cả tags.

**Response:**
```json
[
  {
    "id": 1,
    "slug": "javascript",
    "name": "JavaScript"
  }
]
```

**Example:**
```bash
GET /api/tags
```

---

## 🔑 Auth API

### POST `/api/register`
Đăng ký user mới.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com"
}
```

**Validation:**
- `username` (required): 3-30 ký tự
- `password` (required): Tối thiểu 6 ký tự
- `email` (required): Email hợp lệ

**Response:**
```json
{
  "success": true,
  "id": 1
}
```

**⚠️ Security Warning:** 
- Password hiện tại chỉ được encode base64 (KHÔNG AN TOÀN)
- Cần implement proper hashing (bcrypt/argon2) cho production
- Nên disable endpoint này trong production hoặc thêm rate limiting

**Example:**
```bash
POST /api/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com"
}
```

---

### POST `/api/login`
Đăng nhập và nhận token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "base64encodedtoken",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "author"
  }
}
```

**⚠️ Security Warning:**
- Token hiện tại là base64 encoded (KHÔNG AN TOÀN)
- Cần implement JWT với secret key cho production

**Example:**
```bash
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

---

## 📋 Tóm tắt Endpoints

| Method | Endpoint | Mô tả | Auth Required |
|--------|----------|-------|---------------|
| GET/POST | `/` hoặc `/increment` | View count | ❌ |
| GET | `/health` | Health check | ❌ |
| GET | `/api/articles` | List articles (with pagination) | ❌ |
| GET | `/api/articles/:slug` | Get article by slug | ❌ |
| GET | `/api/comments` | Get comments | ❌ |
| POST | `/api/comments` | Create comment | ❌ |
| GET | `/api/admin/articles/:id` | Get full article for edit | ⚠️ Mock |
| POST | `/api/admin/articles` | Create/Update article | ✅ |
| GET | `/api/topics` | List topics | ❌ |
| POST | `/api/topics` | Create topic | ❌ |
| GET | `/api/tags` | List tags | ❌ |
| POST | `/api/register` | Register user | ❌ |
| POST | `/api/login` | Login | ❌ |

---

## ✅ Cải Thiện Đã Thực Hiện

1. **Error Handling**: 
   - Safe JSON parsing với error handling
   - Sanitized error messages (ẩn internal errors trong production)
   - Proper HTTP status codes

2. **Input Validation**:
   - Email format validation
   - Slug format validation (`^[a-z0-9_-]+$`)
   - Required fields validation
   - Length validation (username, password, content)

3. **Pagination**: 
   - GET `/api/articles` hỗ trợ pagination với `limit` và `offset`

4. **Health Check**: 
   - Endpoint `/health` để monitor worker status

5. **CORS Configuration**: 
   - Có thể config qua env variable `ALLOWED_ORIGIN`

6. **Status Codes**: 
   - Đúng HTTP semantics (201 cho create, 200 cho update)

---

## ⚠️ Lưu ý Bảo mật

1. **Authentication**: Hiện tại chỉ có mock auth (check header có tồn tại)
2. **Password Hashing**: Chưa implement, chỉ dùng base64
3. **JWT Token**: Chưa implement, chỉ dùng base64
4. **Rate Limiting**: Chỉ có cho view count, chưa có cho các API khác
5. **XSS Protection**: Comments chưa được sanitize HTML (nên sanitize ở frontend hoặc backend)

**Khuyến nghị cho Production:**
- Implement JWT authentication với secret key
- Hash password bằng bcrypt hoặc argon2
- Thêm rate limiting cho comments và auth endpoints
- Sanitize HTML trong comments
- Disable `/api/register` hoặc thêm CAPTCHA
- Thêm request logging và monitoring

