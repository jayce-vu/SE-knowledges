// Home Page Script - Loads articles list
(function() {
    const API_URL = window.API_URL || window.VIEW_API_URL || '';
    
    document.addEventListener("DOMContentLoaded", async () => {
        if (!API_URL) {
            console.error("API URL not configured");
            showError("API configuration error", "loading-indicator");
            return;
        }

        const listContainer = document.getElementById("article-list");
        const loading = document.getElementById("loading-indicator");
        const topicFilter = document.getElementById("topic-filter");
        
        // Initial Load
        const isEn = window.location.pathname.includes("/en/");
        const lang = isEn ? "en" : "vi";

        try {
            setLoading("loading-indicator", true, "Loading articles...");
            
            // Parallel Fetch: Articles & Topics
            const [postsRes, topicsRes] = await Promise.all([
                fetch(`${API_URL}/api/articles?lang=${lang}`),
                fetch(`${API_URL}/api/topics`)
            ]);

            if (!postsRes.ok || !topicsRes.ok) {
                throw new Error("Failed to fetch data");
            }

            const postsData = await postsRes.json();
            const topics = await topicsRes.json();
            
            // Parse API response (handle both old and new format)
            const { data: posts, pagination } = parseApiResponse(postsData);

            // Render Topics
            topicFilter.innerHTML = '<option value="">All Topics</option>';
            topics.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t.name;
                opt.textContent = t.name;
                topicFilter.appendChild(opt);
            });

            // Filter Logic
            topicFilter.addEventListener("change", () => {
                const selected = topicFilter.value;
                const filtered = selected 
                    ? posts.filter(p => p.topic_name === selected)
                    : posts;
                renderPosts(filtered);
            });

            setLoading("loading-indicator", false);
            listContainer.style.display = "block";
            renderPosts(posts);

        } catch (e) {
            console.error("Error loading articles:", e);
            showError("Error loading content. Please try again later.", "loading-indicator");
        }
        
        function renderPosts(data) {
            if (!data || data.length === 0) {
                listContainer.innerHTML = "<p>No articles found.</p>";
                return;
            }

            listContainer.innerHTML = data.map(post => `
                <article class="post-preview">
                    <a href="/view?slug=${escapeHtml(post.slug)}">
                        <h2 class="post-title">${escapeHtml(post.title)}</h2>
                        ${post.excerpt ? `<h3 class="post-subtitle">${escapeHtml(post.excerpt)}</h3>` : ''}
                    </a>
                    <p class="post-meta">
                        Posted by ${escapeHtml(post.author_name || 'Author')} on ${formatDate(post.created_at)}
                        ${post.topic_name ? ` · <span class="topic-tag">${escapeHtml(post.topic_name)}</span>` : ''}
                    </p>
                </article>
                <hr>
            `).join("");
        }
    });
})();

