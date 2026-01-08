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

// Slugify helper (for admin)
function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

