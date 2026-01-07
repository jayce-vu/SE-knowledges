// Config - In real app, load this from env or config file
// Ensure this matches your _config.yml or deployed worker URL
const API_URL = window.API_URL || "https://post-views.jayce-it-work.workers.dev"; 

document.addEventListener("DOMContentLoaded", function() {
    initTabs();
    loadTopics();
    loadPosts();

    // Event Listeners
    document.getElementById("btn-save").addEventListener("click", savePost);
    document.getElementById("btn-new").addEventListener("click", resetForm);

    // Auto-generate slugs
    document.getElementById("title-vi").addEventListener("input", (e) => {
        document.getElementById("slug-vi").value = slugify(e.target.value);
    });
    document.getElementById("title-en").addEventListener("input", (e) => {
        document.getElementById("slug-en").value = slugify(e.target.value);
    });
});

// --- Tabs Logic ---
function initTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Remove active class from all
            document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            
            // Add active to current
            tab.classList.add("active");
            const lang = tab.getAttribute("data-lang");
            document.querySelector(`.tab-content[data-lang="${lang}"]`).classList.add("active");
        });
    });
}

// --- Data Loading ---
async function loadTopics() {
    try {
        const res = await fetch(`${API_URL}/api/topics`);
        const topics = await res.json();
        const select = document.getElementById("topic-select");
        select.innerHTML = '<option value="">Select Topic</option>';
        topics.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.name;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading topics", e);
    }
}

async function loadPosts() {
    try {
        const list = document.getElementById("post-list");
        list.innerHTML = '<li class="loading">Loading...</li>';
        
        // Fetch all articles (default VI view for list)
        const res = await fetch(`${API_URL}/api/articles?lang=vi`);
        const posts = await res.json();
        
        list.innerHTML = "";
        posts.forEach(p => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${p.title}</strong>
                <div class="post-status">${new Date(p.created_at * 1000).toLocaleDateString()}</div>
            `;
            li.addEventListener("click", () => loadPostDetails(p.id || p.slug)); // Note: API returns ID joined
            list.appendChild(li);
        });
    } catch (e) {
        console.error("Error loading posts", e);
    }
}

async function loadPostDetails(identifier) {
    // For admin, we need a special endpoint to get ALL translations
    // Currently using the public one won't give us EN if we fetch VI
    // So we use the /api/admin/articles/:id endpoint we created
    
    // If identifier is slug, we might need to find ID first, but the list returns ID.
    // Assuming identifier is ID here.
    
    // Note: The public list API returns 'id' of article parent.
    try {
        const res = await fetch(`${API_URL}/api/admin/articles/${identifier}`);
        const data = await res.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }

        const { article, translations, tag_ids } = data;

        // Fill Parent Data
        document.getElementById("post-id").value = article.id;
        document.getElementById("topic-select").value = article.topic_id || "";
        document.getElementById("thumbnail-url").value = article.thumbnail_url || "";
        document.getElementById("is-published").checked = !!article.is_published;
        document.getElementById("post-tags").value = tag_ids ? tag_ids.join(", ") : ""; // Simplified tag logic

        // Fill Translations
        // Reset first
        ["vi", "en"].forEach(lang => {
            document.getElementById(`title-${lang}`).value = "";
            document.getElementById(`slug-${lang}`).value = "";
            document.getElementById(`excerpt-${lang}`).value = "";
            document.getElementById(`content-${lang}`).value = "";
        });

        translations.forEach(t => {
            const lang = t.language;
            if (document.getElementById(`title-${lang}`)) {
                document.getElementById(`title-${lang}`).value = t.title || "";
                document.getElementById(`slug-${lang}`).value = t.slug || "";
                document.getElementById(`excerpt-${lang}`).value = t.excerpt || "";
                document.getElementById(`content-${lang}`).value = t.content || "";
            }
        });

    } catch (e) {
        console.error("Error loading details", e);
    }
}

// --- Save Logic ---
async function savePost() {
    const btn = document.getElementById("btn-save");
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        const id = document.getElementById("post-id").value;
        const topic_id = document.getElementById("topic-select").value;
        const thumbnail_url = document.getElementById("thumbnail-url").value;
        const is_published = document.getElementById("is-published").checked;
        const tagsRaw = document.getElementById("post-tags").value;
        
        // Prepare Translations
        const translations = [];
        ["vi", "en"].forEach(lang => {
            const title = document.getElementById(`title-${lang}`).value;
            if (title) {
                translations.push({
                    language: lang,
                    title: title,
                    slug: document.getElementById(`slug-${lang}`).value,
                    excerpt: document.getElementById(`excerpt-${lang}`).value,
                    content: document.getElementById(`content-${lang}`).value,
                    meta_description: "" // Add field if needed
                });
            }
        });

        // Mock Tag IDs (In real app, we need to create tags if not exist or lookup IDs)
        // For now, assuming user enters IDs or we ignore. 
        // To make it work with schema: schema expects integer IDs.
        // Simplified: Let's assume input is just for show or requires numeric IDs for now.
        // TODO: Implement "Create Tag" logic.
        const tags = []; 

        const payload = {
            id: id ? parseInt(id) : null,
            topic_id: topic_id ? parseInt(topic_id) : null,
            author_id: 1, // Hardcoded for now
            thumbnail_url,
            is_published,
            tags,
            translations
        };

        const res = await fetch(`${API_URL}/api/admin/articles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        
        if (res.ok) {
            alert("Saved successfully!");
            loadPosts(); // Refresh list
            if (!id) document.getElementById("post-id").value = result.id;
        } else {
            alert("Error: " + (result.error || "Unknown error"));
        }

    } catch (e) {
        console.error(e);
        alert("System error");
    } finally {
        btn.textContent = "Lưu bài viết";
        btn.disabled = false;
    }
}

function resetForm() {
    document.getElementById("post-form").reset();
    document.getElementById("post-id").value = "";
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}
