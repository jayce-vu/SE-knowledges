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
            
            const excerptEl = document.getElementById("post-excerpt");
            if (data.excerpt) {
                excerptEl.textContent = data.excerpt;
                excerptEl.style.display = "block";
            } else {
                excerptEl.style.display = "none";
            }
            
            document.getElementById("post-author").textContent = data.author_name || "Unknown";
            document.getElementById("post-date").textContent = formatDate(data.created_at);
            
            // Display thumbnail image if exists
            const thumbnailContainer = document.getElementById("post-thumbnail-container");
            const thumbnailImg = document.getElementById("post-thumbnail");
            if (data.thumbnail_url && thumbnailContainer && thumbnailImg) {
                thumbnailImg.src = escapeHtml(data.thumbnail_url);
                thumbnailImg.alt = data.title || "Article thumbnail";
                thumbnailContainer.style.display = "block";
            } else if (thumbnailContainer) {
                thumbnailContainer.style.display = "none";
            }
            
            // Update Open Graph and Twitter Card meta tags for social sharing
            updateSocialMetaTags({
                title: data.title || "",
                description: data.excerpt || data.title || "",
                image: data.thumbnail_url || "",
                url: window.location.href
            });

            // Render Content (Markdown with syntax highlighting)
            if (typeof marked !== 'undefined') {
                // Configure marked.js options
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    headerIds: true,
                    mangle: false
                });

                // Parse markdown
                const html = marked.parse(data.content || "");
                document.getElementById("markdown-body").innerHTML = html;

                // Apply syntax highlighting to code blocks
                if (typeof hljs !== 'undefined') {
                    document.querySelectorAll('#markdown-body pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }
            } else {
                // Fallback if marked.js not loaded
                document.getElementById("markdown-body").textContent = data.content || "";
            }

            // Show article
            setLoading("loading", false);
            document.getElementById("article-content").style.display = "block";
            document.getElementById("comments-section").style.display = "block";

            // Load Comments
            await loadComments(slug);

        } catch (e) {
            console.error("Error loading article:", e);
            showError("Error loading article. Please try again later.", "loading");
        }
    }
    
    // Update social media meta tags dynamically for ALL platforms
    function updateSocialMetaTags({ title, description, image, url }) {
        // Helper function to update or create meta tags
        const updateMetaTag = (property, content, isProperty = true) => {
            if (!content) return;
            
            let meta = document.querySelector(
                isProperty 
                    ? `meta[property="${property}"]` 
                    : `meta[name="${property}"]`
            );
            
            if (!meta) {
                meta = document.createElement('meta');
                if (isProperty) {
                    meta.setAttribute('property', property);
                } else {
                    meta.setAttribute('name', property);
                }
                document.head.appendChild(meta);
            }
            
            meta.setAttribute('content', content);
        };
        
        // Update title (for all platforms)
        if (title) {
            document.title = `${title} · SE-knowledges`;
            updateMetaTag('og:title', title);
            updateMetaTag('twitter:title', title, false);
        }
        
        // Update description (for all platforms)
        if (description) {
            // Limit description length for better display
            const shortDescription = description.length > 200 
                ? description.substring(0, 197) + '...' 
                : description;
            
            updateMetaTag('description', shortDescription, false);
            updateMetaTag('og:description', shortDescription);
            updateMetaTag('twitter:description', shortDescription, false);
        }
        
        // Update image (for all platforms)
        if (image) {
            // Ensure absolute URL
            let imageUrl = image;
            if (!image.startsWith('http://') && !image.startsWith('https://')) {
                try {
                    imageUrl = new URL(image, window.location.origin).href;
                } catch (e) {
                    // If URL construction fails, try relative to origin
                    imageUrl = window.location.origin + (image.startsWith('/') ? image : '/' + image);
                }
            }
            
            // Open Graph image (Facebook, LinkedIn, WhatsApp, Telegram, Discord, Slack)
            updateMetaTag('og:image', imageUrl);
            updateMetaTag('og:image:secure_url', imageUrl); // For HTTPS
            updateMetaTag('og:image:type', 'image/jpeg'); // Default, can be improved
            
            // Twitter Card image
            updateMetaTag('twitter:image', imageUrl, false);
            updateMetaTag('twitter:image:src', imageUrl, false); // Legacy support
            
            // Image alt text
            if (title) {
                updateMetaTag('og:image:alt', title);
            }
        }
        
        // Update URL (for all platforms)
        if (url) {
            updateMetaTag('og:url', url);
            updateMetaTag('twitter:url', url, false);
        }
        
        // Set article type for blog posts (better for Facebook, LinkedIn)
        updateMetaTag('og:type', 'article');
        
        // Additional meta tags for better compatibility
        // Article published time (if available)
        const publishedTime = document.querySelector('meta[property="article:published_time"]');
        if (!publishedTime) {
            const meta = document.createElement('meta');
            meta.setAttribute('property', 'article:published_time');
            meta.setAttribute('content', new Date().toISOString());
            document.head.appendChild(meta);
        }
        
        // Author (if available)
        const authorEl = document.getElementById('post-author');
        if (authorEl && authorEl.textContent) {
            updateMetaTag('article:author', authorEl.textContent.trim());
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
                <div class="comment-item">
                    <div class="comment-author">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        ${escapeHtml(c.guest_name || c.username || 'Anonymous')}
                        <span class="comment-date">${formatDate(c.created_at)}</span>
                    </div>
                    <div class="comment-content">${escapeHtml(c.content)}</div>
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

