# Hướng dẫn Deploy Tính Năng Đếm Lượt View

Tính năng này sử dụng **Cloudflare Workers** (miễn phí) để xử lý logic đếm và **Cloudflare KV** để lưu trữ dữ liệu.

## Bước 1: Tạo Cloudflare Worker

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Vào mục **Workers & Pages**.
3. Nhấn **Create Application** -> **Create Worker**.
4. Đặt tên cho worker (ví dụ: `blog-views`).
5. Nhấn **Deploy** (đừng lo về code mặc định, ta sẽ sửa sau).

## Bước 2: Tạo KV Namespace (Cơ sở dữ liệu)

1. Trong dashboard của Worker vừa tạo, vào tab **Settings**.
2. Chọn **Variables** (hoặc **KV Namespaces** ở menu trái của trang Workers chính).
3. Tạo một KV Namespace mới, đặt tên là `VIEWS_DB`.
4. Quay lại trang **Settings** -> **Variables** của Worker `blog-views`.
5. Tại mục **KV Namespace Bindings**, nhấn **Add binding**:
   - **Variable name**: `VIEWS` (Bắt buộc phải là tên này vì code dùng biến này).
   - **KV Namespace**: Chọn `VIEWS_DB` vừa tạo.
6. Nhấn **Save and Deploy**.

## Bước 3: Cập nhật Code Worker

1. Vào tab **Overview** của Worker, nhấn **Quick Edit**.
2. Xóa hết code cũ, copy toàn bộ nội dung từ file `backend/worker.js` trong project này dán vào.
3. Nhấn **Save and Deploy**.

## Bước 4: Cấu hình Blog

1. Copy đường dẫn Worker của bạn (dạng `https://blog-views.username.workers.dev`).
2. Mở file `_config.yml` trong source code blog.
3. Tìm dòng `view_api_url` và dán đường dẫn vào:

```yaml
view_api_url: "https://blog-views.username.workers.dev"
```

4. Commit và Push code lên GitHub.

## Kiểm tra

Vào một bài viết bất kỳ trên blog, nếu thấy số lượt view hiển thị (ban đầu là 0 hoặc 1) là thành công!
