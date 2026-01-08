// Utility Functions for Frontend

// XSS Protection: Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sanitize HTML (allow some tags if needed)
function sanitizeHtml(html) {
  // For now, just escape everything
  // In production, use DOMPurify or similar
  return escapeHtml(html);
}

// API Helper: Handle response format (old vs new)
function parseApiResponse(data) {
  // New format: { data: [...], pagination: {...} }
  // Old format: [...]
  if (data && Array.isArray(data)) {
    return { data: data, pagination: null };
  }
  if (data && data.data) {
    return { data: data.data, pagination: data.pagination };
  }
  return { data: [], pagination: null };
}

// Debug: Log when utils.js is loaded
console.log("utils.js loaded successfully");

// Get API URL from config
function getApiUrl() {
  return window.API_URL || window.VIEW_API_URL || '';
}

// Get current user from localStorage
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error("Error parsing user:", e);
    return null;
  }
}

// Get auth token
function getAuthToken() {
  return localStorage.getItem("token");
}

// Show error message (replace alert)
function showError(message, containerId = null) {
  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="error-message" style="padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px; margin: 10px 0;">${escapeHtml(message)}</div>`;
      return;
    }
  }
  // Fallback to alert if no container
  alert(message);
}

// Show success message
function showSuccess(message, containerId = null) {
  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="success-message" style="padding: 10px; background: #e8f5e9; color: #2e7d32; border-radius: 4px; margin: 10px 0;">${escapeHtml(message)}</div>`;
      setTimeout(() => {
        container.innerHTML = '';
      }, 3000);
      return;
    }
  }
  alert(message);
}

// Loading state helper
function setLoading(elementId, isLoading, message = "Loading...") {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (isLoading) {
    element.style.display = 'block';
    element.innerHTML = `<div style="text-align: center; padding: 20px;">${escapeHtml(message)}</div>`;
  } else {
    element.style.display = 'none';
  }
}

// Format date helper
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Convert Vietnamese diacritics to Latin characters
function removeVietnameseDiacritics(str) {
  if (!str) return '';
  
  // Vietnamese character mapping
  const vietnameseMap = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D'
  };
  
  // Use a more comprehensive regex that matches all Vietnamese characters
  return str.replace(/./g, function(char) {
    return vietnameseMap[char] || char;
  });
}

// Slugify helper (for admin) - Converts Vietnamese to Latin before slugifying
function slugify(text) {
  if (!text) return '';
  
  // Step 1: Convert Vietnamese diacritics to Latin
  let slug = removeVietnameseDiacritics(text.toString());
  
  // Step 2: Convert to lowercase
  slug = slug.toLowerCase();
  
  // Step 3: Replace spaces and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-');
  
  // Step 4: Remove all characters that are not a-z, 0-9, or hyphen
  slug = slug.replace(/[^a-z0-9\-]/g, '');
  
  // Step 5: Replace multiple hyphens with single hyphen
  slug = slug.replace(/\-+/g, '-');
  
  // Step 6: Trim hyphens from start and end
  slug = slug.replace(/^-+/, '').replace(/-+$/, '');
  
  return slug;
}

