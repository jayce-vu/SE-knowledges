# Hướng dẫn Deploy Tính Năng Đếm Lượt View với Cloudflare D1

Tính năng này sử dụng **Cloudflare Workers** (miễn phí) để xử lý logic đếm và **Cloudflare D1** (SQL Database) để lưu trữ dữ liệu bền vững.

Có 2 cách deploy: **CLI (Khuyến nghị)** hoặc **Dashboard**. Xem phần tương ứng bên dưới.

---

## Phương pháp 1: Deploy bằng Cloudflare CLI (Wrangler) - Khuyến nghị

### Bước 1: Cài đặt Wrangler CLI

```bash
npm install -g wrangler
# hoặc
npm install --save-dev wrangler
```

### Bước 2: Đăng nhập Cloudflare

```bash
cd backend
wrangler login
```

Lệnh này sẽ mở trình duyệt để bạn đăng nhập vào Cloudflare.

### Bước 3: Tạo D1 Database

```bash
# Tạo D1 database cho production
npm run d1:create

# Hoặc chạy trực tiếp
wrangler d1 create blog-views-db
```

Sau khi chạy lệnh, bạn sẽ nhận được output như:

```
✅ Successfully created DB 'blog-views-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.

[[d1_databases]]
binding = "DB"
database_name = "blog-views-db"
database_id = "abc123def456..."
```

Copy `database_id` và paste vào file `wrangler.toml` tại dòng `database_id = "YOUR_D1_DATABASE_ID"`.

### Bước 4: Tạo Schema Database

```bash
# Chạy migration để tạo các bảng
npm run d1:migrate
```

Hoặc chạy thủ công:

```bash
wrangler d1 execute blog-views-db --file=./schema.sql
```

### Bước 5: Cấu hình wrangler.toml

Mở file `backend/wrangler.toml` và cập nhật:

- `name`: Tên worker (sẽ tạo URL: `https://<name>.<your-subdomain>.workers.dev`)
- `database_id` trong `[[d1_databases]]`: ID từ bước 3

### Bước 6: Deploy Worker

```bash
# Deploy lên production
npm run deploy

# Hoặc chạy trực tiếp
wrangler deploy
```

Sau khi deploy thành công, bạn sẽ nhận được URL của worker (ví dụ: `https://post-views.your-subdomain.workers.dev`).

### Bước 7: Test Local (Tùy chọn)

```bash
# Chạy worker ở local để test
npm run dev
```

### Bước 8: Cập nhật \_config.yml

Copy URL worker và paste vào `_config.yml`:

```yaml
view_api_url: "https://post-views.your-subdomain.workers.dev"
```

### Các lệnh hữu ích khác

```bash
# Xem logs real-time
npm run tail

# Xem thông tin worker
wrangler whoami

# Xem danh sách workers
wrangler deployments list

# Query D1 database (ví dụ: SELECT * FROM post_views LIMIT 10)
npm run d1:query "SELECT * FROM post_views LIMIT 10"

# Xem danh sách D1 databases
wrangler d1 list
```

---

## Phương pháp 2: Deploy bằng Cloudflare Dashboard

### Bước 1: Tạo Cloudflare Worker

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Vào mục **Workers & Pages**.
3. Nhấn **Create Application** -> **Create Worker**.
4. Đặt tên cho worker (ví dụ: `blog-views-d1`).
5. Nhấn **Deploy** (đừng lo về code mặc định, ta sẽ sửa sau).

## Bước 2: Tạo D1 Database

1. Trong dashboard Workers & Pages, chọn **D1** ở menu trái.
2. Nhấn **Create Database**.
3. Chọn **Dashboard** -> Đặt tên `blog-views-db` -> **Create**.
4. Vào tab **Console** của database vừa tạo, copy nội dung file `backend/schema.sql` và dán vào, sau đó nhấn **Execute** để tạo bảng.

## Bước 3: Liên kết D1 với Worker

1. Quay lại Worker `blog-views-d1` đã tạo ở Bước 1.
2. Vào **Settings** -> **Variables**.
3. Tại mục **D1 Database Bindings**, nhấn **Add binding**:
   - **Variable name**: `DB` (Bắt buộc phải là tên này).
   - **D1 Database**: Chọn `blog-views-db` vừa tạo.
4. Nhấn **Save and Deploy**.

## Bước 4: Cập nhật Code Worker

1. Vào tab **Overview** của Worker, nhấn **Quick Edit**.
2. Xóa hết code cũ, copy toàn bộ nội dung từ file `backend/worker.js` trong project này dán vào.
3. Nhấn **Save and Deploy**.

## Bước 5: Cấu hình Blog

1. Copy đường dẫn Worker của bạn (dạng `https://blog-views-d1.username.workers.dev`).
2. Mở file `_config.yml` trong source code blog.
3. Tìm dòng `view_api_url` và dán đường dẫn vào:

```yaml
view_api_url: "https://blog-views-d1.username.workers.dev"
```

4. Commit và Push code lên GitHub.

## Kiểm tra

Vào một bài viết bất kỳ trên blog, nếu thấy số lượt view hiển thị (ban đầu là 0 hoặc 1) là thành công!
