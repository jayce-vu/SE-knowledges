---
title: "PHÂN TÍCH CHI TIẾT: SECURE STORAGE CHUẨN BANKING (ANDROID & iOS)"
date: 2026-01-07
tags: [android, ios, security, banking]
summary: "Phân tích chi tiết về Secure Storage chuẩn Banking trên Android và iOS, bao gồm Android Keystore, iOS Keychain, Secure Enclave và các tiêu chuẩn bảo mật quan trọng."
pair_id: secure-storage-banking-analysis
---

## Bối cảnh

Trong phát triển ứng dụng ngân hàng (Banking App), bảo mật dữ liệu là yếu tố sống còn. Một trong những câu hỏi quan trọng nhất từ các Auditor là: "Dữ liệu nhạy cảm (token, key) được lưu trữ như thế nào?". Bài viết này phân tích chi tiết về Secure Storage chuẩn Banking trên hai nền tảng Android và iOS.

## I. ANDROID – ANDROID KEYSTORE (BANKING GRADE)

### 1️⃣ Android Keystore là gì (hiểu đúng)

Android Keystore không phải là nơi lưu data, mà là nơi lưu **KEY**.

- **Data (token)** → encrypt
- **Encrypted data** → lưu ở file/db bình thường
- **Key để decrypt** → nằm trong Keystore

👉 **Attacker có file data cũng không decrypt được nếu không có key.**

### 2️⃣ Hardware-backed (TEE / StrongBox) – vì sao cực kỳ quan trọng

**TEE (Trusted Execution Environment)**
- Key nằm trong vùng bảo mật phần cứng
- OS, app, root không đọc được
- Crypto operation xảy ra bên trong TEE

**StrongBox (level cao hơn)**
- Secure chip riêng
- Chống physical attack
- Một số device cao cấp hỗ trợ

📌 **Auditor sẽ hỏi:**
> "Key có hardware-backed không?"

- Nếu ❌ Software-only key → risk cao
- Nếu ✅ Hardware-backed → pass nhiều bank

### 3️⃣ Key non-exportable – sống còn

**Nghĩa là gì?**
Key không thể export ra ngoài. Không thể:
- dump memory
- backup
- copy sang device khác

**Vì sao quan trọng?**
- Root + memory dump → vẫn không lấy được key
- Token bị copy sang máy khác → decrypt fail

👉 **Nếu key exportable → fail audit**

### 4️⃣ Token encrypt → store encrypted blob (luồng chuẩn)

**Flow đúng:**
```
[API Response]
    ↓
Encrypt token bằng Keystore key
    ↓
Encrypted blob (Base64)
    ↓
Lưu file / db / SharedPreferences
```

📌 **Quan trọng:**
- Không bao giờ lưu raw token
- SharedPreferences chỉ chứa blob đã encrypt

**Auditor sẽ kiểm tra:**
- Dump filesystem
- Nếu thấy raw token → fail

### 5️⃣ Tie key với User Authentication

**Nghĩa là gì?**
Key chỉ dùng được sau khi user auth:
- PIN
- Password
- Biometrics

**Kết quả:**
- Mở app nhưng chưa auth → decrypt fail
- App bị background lâu → phải auth lại

👉 **Chống:**
- Stolen device
- App auto-login nguy hiểm

### 6️⃣ Tie key với Device Lock

**Ý nghĩa:**
- Device phải có lock screen
- User tắt lock → key bị invalidate

📌 **Banking app thường:**
- Bắt buộc device có PIN/Pattern
- Không có → chặn app

### 7️⃣ Tie key với Biometric (optional nhưng rất mạnh)

Key chỉ usable sau biometric success. Dùng cho:
- Transfer
- View sensitive data

📌 **Quan trọng:**
- Biometric không thay thế PIN
- Chỉ là lớp tiện lợi + security thêm

## II. iOS – KEYCHAIN + SECURE ENCLAVE (BANKING GRADE)

### 1️⃣ iOS Keychain – khác UserDefaults chỗ nào?

| | Keychain | UserDefaults |
|---|---|---|
| **Encrypt** | Plain text |
| **OS protected** | File |
| **Hardware support** | Không |
| **Audit accepted** | ❌ |

Keychain là secure storage chính thức của iOS.

### 2️⃣ kSecAttrAccessibleWhenUnlockedThisDeviceOnly

**Giải thích từng phần:**
- **WhenUnlocked:** Chỉ truy cập khi device đang unlock
- **ThisDeviceOnly:**
  - Không backup
  - Không sync iCloud
  - Không restore sang device khác

👉 **Đây là flag bắt buộc trong banking**

**Auditor sẽ hỏi:**
> “Keychain item có restore được không?”

### 3️⃣ Secure Enclave – level cao nhất của iOS

**Secure Enclave là gì?**
- Chip bảo mật riêng
- Key nằm trong hardware
- OS không đọc được

**Banking dùng thế nào?**
- Key generate trong Secure Enclave
- Key non-exportable
- Crypto operation trong enclave

📌 **Không phải device nào cũng có, nhưng:**
- Nếu có → nên dùng
- Nếu không → Keychain software-backed (still OK)

### 4️⃣ Không sync iCloud – vì sao?

Nếu sync iCloud:
- Token → upload cloud
- Restore → device khác decrypt được
❌ **Fail banking policy**

👉 **Phải:**
- Disable iCloud sync
- Use `ThisDeviceOnly`

### 5️⃣ Device-only binding (cốt lõi)

**Nghĩa là:**
Token gắn với:
- App instance
- Device hardware

Copy sang device khác → vô dụng

📌 **Combined với backend:**
- Backend lưu device_id
- Token chỉ hợp lệ cho device đó

## III. Auditor nhìn vào đâu?

**Android:**
- Key hardware-backed?
- Non-exportable?
- Token raw có tồn tại không?
- Key tied với auth?
- Root detect → wipe key?

**iOS:**
- Keychain access control?
- iCloud disabled?
- Secure Enclave used?
- Backup/restore test?

## IV. Những lỗi phổ biến khiến FAIL AUDIT

- Dùng SharedPreferences/UserDefaults cho token
- Key software-only
- Cho phép backup
- Token decrypt được khi app background
- Không wipe key khi root/JB

## V. Kết luận ngắn gọn

- Token không quan trọng bằng **KEY**
- Key không nằm trong hardware → **không phải banking-grade**
