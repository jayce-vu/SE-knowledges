// Article Viewer Script - Loads single article with comments
(function() {
    const API_URL = window.API_URL || window.VIEW_API_URL || '';
    let currentSlug = null;

    document.addEventListener("DOMContentLoaded", async () => {
        if (!API_URL) {
            console.error("API URL not configured");
            showError("API configuration error", "loading");
            return;
        }

        currentSlug = new URLSearchParams(window.location.search).get("slug");
        if (!currentSlug) {
            window.location.href = "/";
            return;
        }

        await loadArticle(currentSlug);

        // Comment Form
        const commentForm = document.getElementById("comment-form");
        if (commentForm) {
            commentForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                await submitComment();
            });
        }
    });

    async function loadArticle(slug) {
        try {
            setLoading("loading", true, "Loading article...");
            
            const res = await fetch(`${API_URL}/api/articles/${slug}`);
            const data = await res.json();

            if (data.error) {
                showError("Article not found.", "loading");
                return;
            }

            // Render Meta
            document.getElementById("post-title").textContent = data.title || "";
            document.getElementById("post-excerpt").textContent = data.excerpt || "";
            document.getElementById("post-author").textContent = data.author_name || "Unknown";
            document.getElementById("post-date").textContent = formatDate(data.created_at);
            
            if (data.thumbnail_url) {
                document.getElementById("header-bg").style.backgroundImage = `url('${escapeHtml(data.thumbnail_url)}')`;
            }

            // Render Content (Markdown is safe from marked.js)
            if (typeof marked !== 'undefined') {
                document.getElementById("markdown-body").innerHTML = marked.parse(data.content || "");
            } else {
                // Fallback if marked.js not loaded
                document.getElementById("markdown-body").textContent = data.content || "";
            }

            // Show article
            setLoading("loading", false);
            document.getElementById("article-content").style.display = "block";

            // Load Comments
            await loadComments(slug);

        } catch (e) {
            console.error("Error loading article:", e);
            showError("Error loading article. Please try again later.", "loading");
        }
    }

    async function loadComments(slug) {
        try {
            const res = await fetch(`${API_URL}/api/comments?post_slug=${slug}`);
            if (!res.ok) {
                console.error("Failed to load comments");
                return;
            }

            const comments = await res.json();
            const list = document.getElementById("comments-list");
            
            if (!comments || comments.length === 0) {
                list.innerHTML = "<p>No comments yet. Be the first to comment!</p>";
                return;
            }

            // Render comments with XSS protection
            list.innerHTML = comments.map(c => `
                <div class="media" style="margin-bottom: 20px; padding: 15px; border-bottom: 1px solid #ddd;">
                    <div class="media-body">
                        <h5 class="media-heading">
                            ${escapeHtml(c.guest_name || c.username || 'Anonymous')} 
                            <small style="color: #666;">${formatDate(c.created_at)}</small>
                        </h5>
                        <p>${escapeHtml(c.content)}</p>
                    </div>
                </div>
            `).join("");

        } catch (e) {
            console.error("Error loading comments:", e);
            document.getElementById("comments-list").innerHTML = "<p>Error loading comments.</p>";
        }
    }

    async function submitComment() {
        const contentInput = document.getElementById("comment-content");
        const content = contentInput.value.trim();
        
        if (!content) {
            showError("Please enter a comment", "comments-list");
            return;
        }

        const guestName = prompt("Your name (optional):") || "Guest";
        const guestEmail = prompt("Your email (optional):") || "";

        try {
            const payload = {
                post_slug: currentSlug,
                content: content,
                guest_name: guestName,
                guest_email: guestEmail || undefined
            };
            
            const res = await fetch(`${API_URL}/api/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (res.ok) {
                showSuccess("Comment submitted successfully!", "comments-list");
                contentInput.value = "";
                await loadComments(currentSlug);
            } else {
                showError(result.error || "Failed to submit comment", "comments-list");
            }

        } catch (e) {
            console.error("Error submitting comment:", e);
            showError("System error. Please try again.", "comments-list");
        }
    }
})();

