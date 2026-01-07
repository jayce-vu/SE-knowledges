document.addEventListener("DOMContentLoaded", function() {
  const metaPairId = document.querySelector('meta[name="pair-id"]');
  if (!metaPairId) return;

  const pairId = metaPairId.getAttribute('content');
  const viewElement = document.getElementById('view-count');
  const viewContainer = document.getElementById('view-count-container');
  
  // API URL - set this in your _config.yml or hardcode it here if you deployed the worker
  // Example: https://views.your-worker.workers.dev
  // We read it from a global variable if set, otherwise fallback or warn
  let apiUrl = window.VIEW_API_URL;

  if (!apiUrl || apiUrl === '') {
    console.warn('View count API URL not configured.');
    return;
  }

  // Ensure protocol is present
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    apiUrl = 'https://' + apiUrl;
  }

  // Fetch and increment view count
  fetch(`${apiUrl}/increment?key=${pairId}`, {
    method: 'POST'
  })
  .then(response => response.json())
  .then(data => {
    if (viewElement && data.count !== undefined) {
      viewElement.innerText = data.count;
      if (viewContainer) {
        viewContainer.style.display = 'inline'; // Show only after loading
      }
    }
  })
  .catch(error => {
    console.error('Error fetching view count:', error);
  });
});
