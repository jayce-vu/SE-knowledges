// Home Page Script - Loads articles list
console.log("home.js script file loaded");

(function() {
    console.log("home.js IIFE executing");
    const API_URL = window.API_URL || window.VIEW_API_URL || '';
    
    document.addEventListener("DOMContentLoaded", async () => {
        console.log("DOMContentLoaded fired, API_URL:", API_URL);
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
            // Load all articles (limit=100 to get all)
            const [postsRes, topicsRes] = await Promise.all([
                fetch(`${API_URL}/api/articles?lang=${lang}&limit=100`),
                fetch(`${API_URL}/api/topics`)
            ]);

            if (!postsRes.ok) {
                const errorData = await postsRes.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${postsRes.status}: Failed to fetch articles`);
            }
            
            if (!topicsRes.ok) {
                console.warn("Failed to fetch topics, continuing without filter");
            }

            const postsData = await postsRes.json();
            const topics = topicsRes.ok ? await topicsRes.json() : [];
            
            console.log("Posts data:", postsData); // Debug log
            
            // Parse API response (handle both old and new format)
            const { data: posts, pagination } = parseApiResponse(postsData);
            
            console.log("Parsed posts:", posts); // Debug log
            console.log("Pagination:", pagination); // Debug log

            if (!posts || posts.length === 0) {
                setLoading("loading-indicator", false);
                listContainer.style.display = "block";
                listContainer.innerHTML = "<p style='text-align: center; padding: 40px; color: var(--muted);'>No articles found. Create your first post!</p>";
                return;
            }

            // Render Topics
            topicFilter.innerHTML = '<option value="">All Topics</option>';
            if (topics && topics.length > 0) {
                topics.forEach(t => {
                    const opt = document.createElement("option");
                    opt.value = t.name;
                    opt.textContent = t.name;
                    topicFilter.appendChild(opt);
                });
            }

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
            setLoading("loading-indicator", false);
            listContainer.style.display = "block";
            showError(`Error loading content: ${e.message}. Please try again later.`, "article-list");
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

