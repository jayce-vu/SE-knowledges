document.addEventListener("DOMContentLoaded", function() {
  const viewElement = document.getElementById('view-count');
  const viewContainer = document.getElementById('view-count-container');
  
  if (!viewElement || !viewContainer) return;
  
  // API URL - set this in your _config.yml
  let apiUrl = window.VIEW_API_URL || window.API_URL;

  if (!apiUrl || apiUrl === '') {
    console.warn('View count API URL not configured.');
    return;
  }

  // Ensure protocol is present
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    apiUrl = 'https://' + apiUrl;
  }

  // Try to get slug from various sources
  // Priority: 1. URL slug param, 2. meta article-slug, 3. meta pair-id (fallback)
  let slug = null;
  
  // Check URL parameter (for view.html)
  const urlParams = new URLSearchParams(window.location.search);
  slug = urlParams.get('slug');
  
  // Check meta tag for article-slug (preferred)
  if (!slug) {
    const metaSlug = document.querySelector('meta[name="article-slug"]');
    if (metaSlug) {
      slug = metaSlug.getAttribute('content');
    }
  }
  
  // Fallback to pair-id (for Jekyll static posts)
  if (!slug) {
    const metaPairId = document.querySelector('meta[name="pair-id"]');
    if (metaPairId) {
      slug = metaPairId.getAttribute('content');
    }
  }
  
  // Extract slug from current URL path if still not found
  if (!slug) {
    const pathMatch = window.location.pathname.match(/\/([^\/]+)\/?$/);
    if (pathMatch) {
      slug = pathMatch[1];
    }
  }

  if (!slug) {
    console.warn('Could not determine article slug for view count.');
    return;
  }

  // Fetch and increment view count
  fetch(`${apiUrl}/increment?key=${encodeURIComponent(slug)}`, {
    method: 'POST'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.count !== undefined) {
      viewElement.textContent = data.count;
      viewContainer.style.display = 'inline'; // Show only after loading
    }
  })
  .catch(error => {
    console.error('Error fetching view count:', error);
    // Hide view count on error
    viewContainer.style.display = 'none';
  });
});
