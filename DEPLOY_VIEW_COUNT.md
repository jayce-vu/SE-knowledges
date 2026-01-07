# Hướng dẫn Deploy Tính Năng Đếm Lượt View với Cloudflare D1

Tính năng này sử dụng **Cloudflare Workers** (miễn phí) để xử lý logic đếm và **Cloudflare D1** (SQL Database) để lưu trữ dữ liệu bền vững.

## Bước 1: Tạo Cloudflare Worker

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
