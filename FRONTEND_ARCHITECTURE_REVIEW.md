# Frontend Architecture Review

**Ngày review:** $(date)
**Status:** ⚠️ Cần cải thiện một số điểm

---

## 📊 Tổng Quan Kiến Trúc

### Hiện Tại
- **Framework:** Jekyll (Static Site Generator)
- **Hosting:** GitHub Pages
- **Backend API:** Cloudflare Workers (D1 Database)
- **Architecture:** Hybrid (Static + Dynamic API calls)
- **Language:** Vanilla JavaScript (no framework)

### Cấu Trúc Thư Mục
```
/
├── _layouts/          # Jekyll layouts
│   ├── default.html
│   ├── post.html
│   └── home.html
├── _includes/         # Reusable components
│   ├── header.html
│   └── footer.html
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   └── admin.css
│   └── js/
│       ├── view-count.js
│       └── admin.js
├── admin.html         # Admin panel
├── login.html         # Auth page
├── view.html          # Article viewer
└── index.html         # Home page
```

---

## ✅ Điểm Tốt

### 1. **Separation of Concerns**
- ✅ Layouts và includes được tách riêng
- ✅ CSS và JS được tổ chức trong `assets/`
- ✅ Admin và public pages tách biệt

### 2. **Jekyll Integration**
- ✅ Sử dụng Jekyll variables (`site.view_api_url`)
- ✅ Liquid templating cho static content
- ✅ Bilingual support với collections

### 3. **API Integration**
- ✅ Fetch API được sử dụng đúng cách
- ✅ CORS được handle
- ✅ Error handling cơ bản

### 4. **Features**
- ✅ View count integration
- ✅ Comments system
- ✅ Admin panel với CRUD
- ✅ Bilingual support

---

## ⚠️ Vấn Đề Cần Sửa

### 🔴 Critical Issues

#### 1. **API Response Format Mismatch**
**File:** `index.html`, `admin.js`

**Vấn đề:** 
- API trả về `{ data: [...], pagination: {...} }`
- Frontend expect `Array` trực tiếp

**Code hiện tại:**
```javascript
const posts = await postsRes.json();
posts.forEach(p => { ... }); // ❌ posts is object, not array
```

**Nên sửa:**
```javascript
const response = await postsRes.json();
const posts = response.data || response; // Handle both formats
const pagination = response.pagination;
```

**Impact:** High - Home page và admin list sẽ crash

---

#### 2. **XSS Vulnerability trong Comments**
**File:** `view.html` (line 136)

**Vấn đề:** 
```javascript
${c.content}  // ❌ Direct HTML injection
```

**Nên sửa:**
```javascript
${escapeHtml(c.content)}  // Sanitize HTML

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Impact:** High - Security risk

---

#### 3. **View Count Key Mismatch**
**File:** `view-count.js`, `post.html`

**Vấn đề:**
- Frontend dùng `pair_id` từ meta tag
- API expect `slug` trong query parameter
- Không match với nhau

**Code hiện tại:**
```javascript
// view-count.js
const pairId = metaPairId.getAttribute('content');
fetch(`${apiUrl}/increment?key=${pairId}`);  // ❌ pair_id ≠ slug
```

**Nên sửa:**
- Option 1: Dùng slug thay vì pair_id
- Option 2: API accept cả pair_id và slug
- Option 3: Resolve pair_id → slug trước khi call API

**Impact:** High - View count không hoạt động

---

#### 4. **Hardcoded Author ID**
**File:** `admin.js` (line 180)

**Vấn đề:**
```javascript
author_id: 1, // Hardcoded for now
```

**Nên sửa:**
```javascript
// Get from logged in user
const user = JSON.parse(localStorage.getItem("user"));
author_id: user?.id || null,
```

**Impact:** Medium - Tất cả bài viết có cùng author

---

### 🟡 Important Issues

#### 5. **Inline Scripts**
**Vấn đề:** 
- Scripts được viết trực tiếp trong HTML files
- Khó maintain và test
- Không có module bundling

**Files:**
- `index.html` - inline script
- `view.html` - inline script
- `login.html` - inline script

**Nên tách ra:**
```javascript
// assets/js/home.js
// assets/js/article-viewer.js
// assets/js/auth.js
```

---

#### 6. **API URL Configuration**
**Vấn đề:**
- API URL được set ở nhiều nơi
- Hardcoded trong một số files
- Không nhất quán

**Files:**
- `admin.js`: `const API_URL = window.API_URL || "https://post-views..."`
- `view-count.js`: `let apiUrl = window.VIEW_API_URL;`
- `index.html`: `const API_URL = "{{ site.view_api_url }}";`

**Nên:**
- Tạo một config file chung
- Hoặc dùng Jekyll config nhất quán

---

#### 7. **Error Handling Không Nhất Quán**
**Vấn đề:**
- Một số nơi dùng `alert()`
- Một số nơi dùng `console.error()`
- Không có user-friendly error messages

**Nên:**
- Tạo error handler chung
- Hiển thị errors trong UI thay vì alert

---

#### 8. **Loading States**
**Vấn đề:**
- Loading states không nhất quán
- Một số pages không có loading indicator
- Không có skeleton screens

**Nên:**
- Tạo loading component
- Skeleton screens cho better UX

---

#### 9. **Pagination Không Được Sử Dụng**
**Vấn đề:**
- API có pagination nhưng frontend không dùng
- Load tất cả articles một lúc
- Performance issues với nhiều articles

**Nên:**
- Implement pagination UI
- Load more / infinite scroll

---

#### 10. **Không Có Routing System**
**Vấn đề:**
- Dùng query parameters (`?slug=xxx`)
- Không có proper routing
- URL không clean

**Nên:**
- Implement client-side routing
- Hoặc dùng Jekyll routing với proper permalinks

---

### 🟢 Nice to Have

#### 11. **State Management**
- Không có state management
- Data được fetch lại mỗi lần
- Không có caching

**Nên:**
- Implement simple state management
- Cache API responses
- Use localStorage for offline support

---

#### 12. **Component Structure**
- Không có component system
- Code duplication
- Khó reuse

**Nên:**
- Tạo reusable components
- Hoặc migrate sang framework (React/Vue)

---

#### 13. **TypeScript / Type Safety**
- Không có type checking
- Dễ có bugs runtime

**Nên:**
- Thêm JSDoc comments
- Hoặc migrate sang TypeScript

---

## 📋 Checklist Cải Thiện

### Priority 1 (Critical)
- [ ] Fix API response format mismatch
- [ ] Fix XSS vulnerability trong comments
- [ ] Fix view count key mismatch (pair_id vs slug)
- [ ] Fix hardcoded author_id

### Priority 2 (Important)
- [ ] Tách inline scripts ra files riêng
- [ ] Standardize API URL configuration
- [ ] Improve error handling
- [ ] Add consistent loading states
- [ ] Implement pagination

### Priority 3 (Nice to Have)
- [ ] Add routing system
- [ ] Implement state management
- [ ] Create component structure
- [ ] Add TypeScript/JSDoc

---

## 🎯 Recommendations

### Short Term (1-2 weeks)
1. **Fix Critical Issues:**
   - API response format
   - XSS vulnerability
   - View count key mismatch
   - Author ID

2. **Refactor Code:**
   - Tách inline scripts
   - Standardize config
   - Improve error handling

### Medium Term (1-2 months)
1. **Improve Architecture:**
   - Add routing
   - Implement pagination
   - Better state management

2. **Enhance UX:**
   - Loading states
   - Error messages
   - Skeleton screens

### Long Term (3+ months)
1. **Consider Migration:**
   - Evaluate React/Vue migration
   - Or improve Jekyll + Vanilla JS
   - Add build tools (Webpack/Vite)

2. **Add Features:**
   - Offline support
   - PWA capabilities
   - Better admin UX

---

## 🔧 Quick Fixes

### Fix 1: API Response Format
```javascript
// assets/js/api-helper.js
async function fetchArticles(lang, limit = 20, offset = 0) {
  const res = await fetch(`${API_URL}/api/articles?lang=${lang}&limit=${limit}&offset=${offset}`);
  const data = await res.json();
  
  // Handle both old and new format
  if (data.data) {
    return { articles: data.data, pagination: data.pagination };
  }
  return { articles: data, pagination: null };
}
```

### Fix 2: XSS Protection
```javascript
// assets/js/utils.js
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderComment(comment) {
  return `
    <div class="comment">
      <strong>${escapeHtml(comment.guest_name)}</strong>
      <p>${escapeHtml(comment.content)}</p>
    </div>
  `;
}
```

### Fix 3: View Count Fix
```javascript
// Option: Use slug instead of pair_id
// In post.html, add slug to meta tag
<meta name="article-slug" content="{{ page.slug }}">

// In view-count.js
const slug = document.querySelector('meta[name="article-slug"]')?.getAttribute('content');
if (slug) {
  fetch(`${apiUrl}/increment?key=${slug}`, { method: 'POST' });
}
```

### Fix 4: Author ID
```javascript
// In admin.js
function getCurrentUser() {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

const user = getCurrentUser();
const payload = {
  author_id: user?.id || null,
  // ...
};
```

---

## 📊 Architecture Score

**Điểm số:** 6/10

**Breakdown:**
- Structure: 7/10 ✅
- Security: 4/10 ⚠️
- Maintainability: 5/10 ⚠️
- Performance: 6/10 ⚠️
- UX: 6/10 ⚠️

**Đánh giá:**
- ✅ Cấu trúc cơ bản tốt
- ✅ Jekyll integration tốt
- ⚠️ Cần fix security issues
- ⚠️ Cần improve code organization
- ⚠️ Cần better error handling

---

## 📚 References

- [Jekyll Best Practices](https://jekyllrb.com/docs/best-practices/)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Frontend Architecture Patterns](https://www.patterns.dev/)

