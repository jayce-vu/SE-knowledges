# Auth & Author System

## 🔐 Authentication System

### Có Đăng Ký và Đăng Nhập

**✅ Có sẵn:**

1. **POST `/api/register`** - Đăng ký user mới
   - Tạo user với username, email, password
   - Role mặc định: `'author'`
   - Password được hash (hiện tại: base64 - **KHÔNG AN TOÀN**)

2. **POST `/api/login`** - Đăng nhập
   - Nhận username và password
   - Trả về token và user info
   - Token hiện tại: base64 encoded (mock token - **KHÔNG AN TOÀN**)

### ⚠️ Vấn Đề Hiện Tại

1. **Mock Authentication:**
   - Admin API chỉ check có `Authorization` header hay không
   - Không verify token thực sự
   - Code: `if (!authHeader) return error("Unauthorized", 401);`

2. **Password Security:**
   - Chỉ dùng `btoa(password)` - base64 encoding
   - **KHÔNG PHẢI** hashing, dễ bị decode
   - Cần implement proper hashing (bcrypt/argon2)

3. **Token Security:**
   - Token format: `btoa(`${user.id}:${user.username}:${Date.now()}`)`
   - Không có signature, không có expiration
   - Cần implement JWT với secret key

### 📋 Users Table Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'author',  -- 'author', 'admin', etc.
  created_at INTEGER
);
```

### 🔧 Cách Sử Dụng Hiện Tại

**Đăng ký:**
```bash
POST /api/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123",
  "email": "john@example.com"
}
```

**Đăng nhập:**
```bash
POST /api/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}

# Response:
{
  "success": true,
  "token": "base64encodedtoken",
  "user": {
    "id": 1,
    "username": "john_doe",
    "role": "author"
  }
}
```

**Sử dụng token (Admin API):**
```bash
POST /api/admin/articles
Authorization: Bearer base64encodedtoken
Content-Type: application/json

{
  "author_id": 1,
  "topic_id": 1,
  "translations": [...]
}
```

---

## 👤 Author System

### ✅ Bài Post Có Author

**Database Schema:**
- `articles` table có `author_id` field
- Foreign key đến `users(id)`
- Mỗi bài viết phải có một author

```sql
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER,
  author_id INTEGER,  -- ← Link đến users table
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (author_id) REFERENCES users(id)
);
```

### 📊 Author Information trong API

**1. Khi lấy chi tiết bài viết (`GET /api/articles/:slug`):**
```json
{
  "id": 1,
  "author_id": 1,
  "author_name": "john_doe",  // ← Từ users table
  "title": "...",
  ...
}
```

**2. Khi tạo/cập nhật bài viết (`POST /api/admin/articles`):**
```json
{
  "author_id": 1,  // ← Phải truyền author_id
  "topic_id": 1,
  "translations": [...]
}
```

**3. Khi lấy danh sách bài viết (`GET /api/articles`):**
- Hiện tại **KHÔNG** có author info trong response
- Có thể thêm nếu cần

### 🔍 Code Implementation

**Get article detail với author:**
```javascript
const article = await env.DB.prepare(`
    SELECT a.*, top.name as topic_name, u.username as author_name
    FROM articles a
    LEFT JOIN topics top ON a.topic_id = top.id
    LEFT JOIN users u ON a.author_id = u.id  // ← Join với users
    WHERE a.id = ?
`).bind(translation.article_id).first();
```

**Create article với author:**
```javascript
await env.DB.prepare(
    `INSERT INTO articles (topic_id, author_id, thumbnail_url, is_published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
).bind(topic_id, author_id, thumbnail_url, is_published ? 1 : 0, now, now).run();
```

---

## 🎯 Workflow Hiện Tại

### 1. User đăng ký
```
POST /api/register
→ Tạo user trong database
→ Role: 'author'
→ Return user ID
```

### 2. User đăng nhập
```
POST /api/login
→ Verify username/password
→ Generate token (mock)
→ Return token + user info
```

### 3. Tạo bài viết
```
POST /api/admin/articles
Headers: Authorization: Bearer token
Body: {
  author_id: 1,  // ← ID của user đã đăng nhập
  topic_id: 1,
  translations: [...]
}
→ Tạo article với author_id
```

### 4. Xem bài viết
```
GET /api/articles/my-slug
→ Return article với author_name
```

---

## ⚠️ Vấn Đề và Cải Thiện Cần Thiết

### 🔴 Critical Issues

1. **Authentication không thực sự hoạt động:**
   - Chỉ check có header hay không
   - Không verify token
   - Không check user permissions

2. **Password không an toàn:**
   - Base64 encoding ≠ hashing
   - Dễ bị decode

3. **Token không an toàn:**
   - Không có signature
   - Không có expiration
   - Có thể fake dễ dàng

### 🟡 Improvements Needed

1. **Implement JWT Authentication:**
   ```javascript
   // Generate JWT token
   const token = jwt.sign(
     { id: user.id, username: user.username, role: user.role },
     env.JWT_SECRET,
     { expiresIn: '7d' }
   );
   
   // Verify token
   const decoded = jwt.verify(token, env.JWT_SECRET);
   ```

2. **Implement Password Hashing:**
   ```javascript
   // Hash password (cần dùng SubtleCrypto trong Workers)
   const encoder = new TextEncoder();
   const data = encoder.encode(password);
   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
   // Hoặc dùng bcrypt/argon2 nếu có thể
   ```

3. **Add Authorization Middleware:**
   ```javascript
   async function verifyAuth(request, env) {
     const authHeader = request.headers.get("Authorization");
     if (!authHeader) return null;
     
     const token = authHeader.replace("Bearer ", "");
     // Verify JWT token
     const decoded = jwt.verify(token, env.JWT_SECRET);
     return decoded;
   }
   ```

4. **Add Role-Based Access Control:**
   ```javascript
   function requireRole(user, requiredRole) {
     if (user.role !== requiredRole && user.role !== 'admin') {
       throw new Error("Insufficient permissions");
     }
   }
   ```

5. **Auto-set author_id từ token:**
   ```javascript
   // Thay vì phải truyền author_id trong body
   // Tự động lấy từ token
   const user = await verifyAuth(request, env);
   const author_id = user.id;
   ```

---

## 📝 Recommendations

### Cho Production:

1. **Disable `/api/register`** hoặc thêm:
   - CAPTCHA
   - Email verification
   - Rate limiting

2. **Implement proper authentication:**
   - JWT với secret key
   - Token expiration
   - Refresh tokens

3. **Implement password hashing:**
   - SHA-256 hoặc bcrypt/argon2
   - Salt + pepper

4. **Add authorization:**
   - Verify token trong mọi admin endpoint
   - Check user permissions
   - Auto-set author_id từ token

5. **Add user management:**
   - GET `/api/users` (admin only)
   - PUT `/api/users/:id` (update user)
   - DELETE `/api/users/:id` (admin only)

---

## 🧪 Testing Auth Flow

```bash
# 1. Register
curl -X POST https://your-worker.workers.dev/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123","email":"test@example.com"}'

# 2. Login
curl -X POST https://your-worker.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# 3. Create article (với token)
curl -X POST https://your-worker.workers.dev/api/admin/articles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "author_id": 1,
    "topic_id": 1,
    "is_published": true,
    "translations": [...]
  }'
```

---

## 📚 Summary

**✅ Có sẵn:**
- Register endpoint
- Login endpoint  
- Users table với roles
- Articles có author_id
- Author name trong article detail

**⚠️ Cần cải thiện:**
- Authentication thực sự (JWT)
- Password hashing
- Token verification
- Auto-set author_id từ token
- Role-based access control

**🎯 Hiện tại:**
- Auth system là **mock/prototype**
- Có thể dùng để test và develop
- **KHÔNG** an toàn cho production
- Cần implement proper security trước khi deploy

