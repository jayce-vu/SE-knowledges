// Config - Load from Jekyll config or window variable
const API_URL = window.API_URL || window.VIEW_API_URL || ""; 

document.addEventListener("DOMContentLoaded", function() {
    // Check Auth
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login/";
        return;
    }

    initTabs();
    initPreview();
    loadTopics();
    loadPosts();

    // Event Listeners
    document.getElementById("btn-save").addEventListener("click", savePost);
    document.getElementById("btn-new").addEventListener("click", resetForm);
    document.getElementById("btn-create-topic").addEventListener("click", createTopic);

    // Auto-generate slugs
    document.getElementById("title-vi").addEventListener("input", (e) => {
        document.getElementById("slug-vi").value = slugify(e.target.value);
    });
    document.getElementById("title-en").addEventListener("input", (e) => {
        document.getElementById("slug-en").value = slugify(e.target.value);
    });

    // Setup paste formatting for markdown editors
    setupPasteFormatting();
    
    // Setup markdown toolbar
    initMarkdownToolbar();
    
    // Setup fullscreen editor
    initFullscreenEditor();
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

// --- Preview Logic ---
function initPreview() {
    // Configure marked.js
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
        });
    }

    // Preview toggle buttons
    document.querySelectorAll('.btn-preview-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            togglePreview(lang);
        });
    });

    // Real-time preview on input
    ['vi', 'en'].forEach(lang => {
        const editor = document.getElementById(`content-${lang}`);
        if (editor) {
            editor.addEventListener('input', () => {
                updatePreview(lang);
            });
        }
    });
}

function togglePreview(lang) {
    const editor = document.getElementById(`content-${lang}`);
    const preview = document.getElementById(`preview-${lang}`);
    const wrapper = editor?.closest('.editor-wrapper');
    const btn = document.querySelector(`.btn-preview-toggle[data-lang="${lang}"]`);
    
    if (!editor || !preview || !wrapper) return;

    const isPreviewVisible = preview.style.display !== 'none';
    
    if (isPreviewVisible) {
        // Hide preview, show editor only
        preview.style.display = 'none';
        editor.style.display = 'block';
        editor.style.width = '100%';
        wrapper.classList.remove('split-view');
        btn?.classList.remove('active');
        btn.textContent = `👁️ Preview ${lang.toUpperCase()}`;
    } else {
        // Show preview
        preview.style.display = 'block';
        editor.style.display = 'block';
        editor.style.width = '50%';
        preview.style.width = '50%';
        wrapper.classList.add('split-view');
        btn?.classList.add('active');
        btn.textContent = `✏️ Edit ${lang.toUpperCase()}`;
        updatePreview(lang);
    }
}

function updatePreview(lang) {
    const editor = document.getElementById(`content-${lang}`);
    const preview = document.getElementById(`preview-${lang}`);
    
    if (!editor || !preview) return;
    
    const markdown = editor.value;
    
    if (typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(markdown || '*No content yet*');
        
        // Apply syntax highlighting if highlight.js is available
        if (typeof hljs !== 'undefined') {
            preview.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    } else {
        preview.textContent = markdown || 'No content yet';
    }
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
        if (!res.ok) {
            throw new Error("Failed to fetch articles");
        }
        
        const postsData = await res.json();
        // Parse API response (handle both old and new format)
        const { data: posts } = parseApiResponse(postsData);
        
        list.innerHTML = "";
        if (posts.length === 0) {
            list.innerHTML = '<li>No articles found. Create your first article!</li>';
            return;
        }
        
        posts.forEach(p => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${escapeHtml(p.title)}</strong>
                <div class="post-status">${formatDate(p.created_at)}</div>
            `;
            li.addEventListener("click", () => loadPostDetails(p.id || p.slug));
            list.appendChild(li);
        });
    } catch (e) {
        console.error("Error loading posts", e);
        const list = document.getElementById("post-list");
        list.innerHTML = '<li class="error">Error loading posts. Please refresh.</li>';
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

        // Get author_id from current user
        const user = getCurrentUser();
        if (!user || !user.id) {
            alert("Error: User not logged in. Please login again.");
            window.location.href = "/login/";
            return;
        }

        const payload = {
            id: id ? parseInt(id) : null,
            topic_id: topic_id ? parseInt(topic_id) : null,
            author_id: user.id, // Get from logged in user
            thumbnail_url,
            is_published,
            tags,
            translations
        };

        const res = await fetch(`${API_URL}/api/admin/articles`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": localStorage.getItem("token") 
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        
        if (res.ok) {
            showSuccess("Saved successfully!", "post-list");
            loadPosts(); // Refresh list
            if (!id) document.getElementById("post-id").value = result.id;
        } else {
            showError(result.error || "Unknown error", "post-list");
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

// slugify is now in utils.js, but keep for backward compatibility
// Will use from utils if available

async function createTopic() {
    const name = prompt("Nhập tên Chủ đề (Topic Name):");
    if (!name) return;

    const slug = slugify(name);
    const description = prompt("Nhập mô tả (Optional):") || "";

    try {
        const res = await fetch(`${API_URL}/api/topics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, slug, description })
        });

        if (res.ok) {
            alert("Tạo topic thành công!");
            loadTopics(); // Refresh dropdown
        } else {
            const err = await res.json();
            alert("Lỗi: " + (err.error || "Unknown"));
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi hệ thống");
    }
}

// --- Paste Formatting ---
function setupPasteFormatting() {
    const markdownEditors = document.querySelectorAll('.markdown-editor');
    
    markdownEditors.forEach(editor => {
        editor.addEventListener('paste', async (e) => {
            e.preventDefault();
            
            const clipboardData = e.clipboardData || window.clipboardData;
            const htmlData = clipboardData.getData('text/html');
            const plainData = clipboardData.getData('text/plain');
            
            if (!htmlData && !plainData) return;
            
            // Get cursor position
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const text = editor.value;
            
            // Convert HTML to Markdown if HTML detected
            let formattedText = htmlData ? htmlToMarkdown(htmlData) : formatPlainTextToMarkdown(plainData);
            
            // Insert formatted text at cursor position
            editor.value = text.substring(0, start) + formattedText + text.substring(end);
            
            // Restore cursor position after inserted text
            const newCursorPos = start + formattedText.length;
            editor.setSelectionRange(newCursorPos, newCursorPos);
            
            // Trigger input event for any listeners
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });
}

// Convert HTML to Markdown
function htmlToMarkdown(html) {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get plain text first
    let markdown = tempDiv.innerText || tempDiv.textContent || '';
    
    // Process links - replace with markdown format
    tempDiv.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent || '';
        if (href && text && markdown.includes(text)) {
            markdown = markdown.replace(text, `[${text}](${href})`);
        }
    });
    
    // Process images
    tempDiv.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        if (src) {
            markdown += `\n![${alt}](${src})\n`;
        }
    });
    
    // Process headings
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag, index) => {
        tempDiv.querySelectorAll(tag).forEach(heading => {
            const text = heading.textContent || '';
            const prefix = '#'.repeat(index + 1) + ' ';
            if (markdown.includes(text)) {
                markdown = markdown.replace(text, prefix + text);
            }
        });
    });
    
    // Process bold
    tempDiv.querySelectorAll('strong, b').forEach(bold => {
        const text = bold.textContent || '';
        if (text && markdown.includes(text)) {
            markdown = markdown.replace(text, `**${text}**`);
        }
    });
    
    // Process italic
    tempDiv.querySelectorAll('em, i').forEach(italic => {
        const text = italic.textContent || '';
        if (text && markdown.includes(text) && !text.includes('**')) {
            markdown = markdown.replace(text, `*${text}*`);
        }
    });
    
    // Process code blocks
    tempDiv.querySelectorAll('pre code').forEach(code => {
        const text = code.textContent || '';
        if (text && markdown.includes(text)) {
            markdown = markdown.replace(text, '```\n' + text + '\n```');
        }
    });
    
    // Process inline code
    tempDiv.querySelectorAll('code:not(pre code)').forEach(code => {
        const text = code.textContent || '';
        if (text && markdown.includes(text) && !text.includes('```')) {
            markdown = markdown.replace(text, '`' + text + '`');
        }
    });
    
    // Process lists - convert to markdown bullets
    tempDiv.querySelectorAll('ul li, ol li').forEach(li => {
        const text = li.textContent || '';
        if (text && markdown.includes(text)) {
            markdown = markdown.replace(text, '- ' + text);
        }
    });
    
    // Clean up extra whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    return markdown.trim();
}

// Format plain text to Markdown
function formatPlainTextToMarkdown(text) {
    if (!text) return '';
    
    let formatted = text;
    
    // Auto-detect URLs and convert to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, '[$1]($1)');
    
    // Auto-detect email addresses
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    formatted = formatted.replace(emailRegex, '[$1](mailto:$1)');
    
    // Detect numbered lists (lines starting with numbers)
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '$1. $2');
    
    // Detect bullet points (lines starting with -, •, or *)
    formatted = formatted.replace(/^([•\-\*])\s+(.+)$/gm, '- $2');
    
    return formatted;
}

// --- Markdown Toolbar ---
function initMarkdownToolbar() {
    document.querySelectorAll('.markdown-toolbar').forEach(toolbar => {
        const editorId = toolbar.getAttribute('data-editor');
        const editor = document.getElementById(editorId);
        
        if (!editor) return;
        
        // Add click handlers to all toolbar buttons
        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                handleToolbarAction(action, editor);
            });
        });
        
        // Keyboard shortcuts
        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b') {
                    e.preventDefault();
                    handleToolbarAction('bold', editor);
                } else if (e.key === 'i') {
                    e.preventDefault();
                    handleToolbarAction('italic', editor);
                }
            }
        });
    });
}

function handleToolbarAction(action, editor) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const selectedText = text.substring(start, end);
    
    let insertText = '';
    let newCursorPos = start;
    
    switch(action) {
        case 'bold':
            if (selectedText) {
                insertText = `**${selectedText}**`;
                newCursorPos = start + insertText.length;
            } else {
                insertText = '**bold text**';
                newCursorPos = start + 2;
            }
            break;
            
        case 'italic':
            if (selectedText) {
                insertText = `*${selectedText}*`;
                newCursorPos = start + insertText.length;
            } else {
                insertText = '*italic text*';
                newCursorPos = start + 1;
            }
            break;
            
        case 'heading':
            const level = prompt('Enter heading level (1-6):', '2');
            if (level && level >= 1 && level <= 6) {
                const prefix = '#'.repeat(parseInt(level)) + ' ';
                if (selectedText) {
                    insertText = prefix + selectedText;
                    newCursorPos = start + insertText.length;
                } else {
                    insertText = prefix;
                    newCursorPos = start + insertText.length;
                }
            } else {
                return;
            }
            break;
            
        case 'link':
            const linkText = selectedText || prompt('Link text:', 'link text');
            if (linkText === null) return;
            const linkUrl = prompt('Link URL:', 'https://');
            if (linkUrl === null) return;
            insertText = `[${linkText}](${linkUrl})`;
            newCursorPos = start + insertText.length;
            break;
            
        case 'image':
            const altText = prompt('Image alt text:', '');
            if (altText === null) return;
            const imageUrl = prompt('Image URL:', 'https://');
            if (imageUrl === null) return;
            insertText = `![${altText}](${imageUrl})`;
            newCursorPos = start + insertText.length;
            break;
            
        case 'code':
            if (selectedText) {
                insertText = `\`${selectedText}\``;
                newCursorPos = start + insertText.length;
            } else {
                const lang = prompt('Code language (optional):', '');
                insertText = lang ? `\`\`\`${lang}\n\n\`\`\`` : '```\n\n```';
                newCursorPos = start + (lang ? lang.length + 5 : 4);
            }
            break;
            
        case 'quote':
            if (selectedText) {
                const lines = selectedText.split('\n');
                insertText = lines.map(line => `> ${line}`).join('\n');
                newCursorPos = start + insertText.length;
            } else {
                insertText = '> ';
                newCursorPos = start + 2;
            }
            break;
            
        case 'list':
            if (selectedText) {
                const lines = selectedText.split('\n');
                insertText = lines.map(line => line.trim() ? `- ${line.trim()}` : '').join('\n');
                newCursorPos = start + insertText.length;
            } else {
                insertText = '- ';
                newCursorPos = start + 2;
            }
            break;
            
        case 'listOrdered':
            if (selectedText) {
                const lines = selectedText.split('\n').filter(l => l.trim());
                insertText = lines.map((line, i) => `${i + 1}. ${line.trim()}`).join('\n');
                newCursorPos = start + insertText.length;
            } else {
                insertText = '1. ';
                newCursorPos = start + 3;
            }
            break;
            
        case 'indent':
            if (selectedText) {
                const lines = selectedText.split('\n');
                insertText = lines.map(line => line.trim() ? '    ' + line : line).join('\n');
                newCursorPos = start + insertText.length;
            } else {
                // Get current line
                const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                const lineEnd = text.indexOf('\n', start);
                const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
                insertText = '    ' + currentLine;
                editor.value = text.substring(0, lineStart) + insertText + text.substring(lineEnd === -1 ? text.length : lineEnd);
                newCursorPos = start + 4;
                editor.setSelectionRange(newCursorPos, newCursorPos);
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }
            break;
            
        case 'outdent':
            if (selectedText) {
                const lines = selectedText.split('\n');
                insertText = lines.map(line => {
                    if (line.startsWith('    ')) {
                        return line.substring(4);
                    } else if (line.startsWith('\t')) {
                        return line.substring(1);
                    }
                    return line;
                }).join('\n');
                newCursorPos = start + insertText.length;
            } else {
                // Get current line
                const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                const lineEnd = text.indexOf('\n', start);
                const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
                if (currentLine.startsWith('    ')) {
                    insertText = currentLine.substring(4);
                    editor.value = text.substring(0, lineStart) + insertText + text.substring(lineEnd === -1 ? text.length : lineEnd);
                    newCursorPos = start - 4;
                    editor.setSelectionRange(newCursorPos, newCursorPos);
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    return;
                } else {
                    return;
                }
            }
            break;
            
        case 'hr':
            insertText = '\n---\n';
            newCursorPos = start + insertText.length;
            break;
            
        default:
            return;
    }
    
    // Insert text
    editor.value = text.substring(0, start) + insertText + text.substring(end);
    
    // Set cursor position
    editor.setSelectionRange(newCursorPos, newCursorPos);
    editor.focus();
    
    // Trigger input event for preview update
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}

// --- Fullscreen Editor ---
function initFullscreenEditor() {
    // Clone toolbar for fullscreen
    const originalToolbar = document.querySelector('.markdown-toolbar');
    if (originalToolbar) {
        const fullscreenToolbar = document.getElementById('fullscreen-toolbar');
        if (fullscreenToolbar) {
            fullscreenToolbar.innerHTML = originalToolbar.innerHTML;
            // Re-attach event handlers
            fullscreenToolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = btn.getAttribute('data-action');
                    const editor = document.getElementById('fullscreen-editor');
                    if (editor) {
                        handleToolbarAction(action, editor);
                    }
                });
            });
        }
    }
    
    // Expand buttons
    document.querySelectorAll('.btn-expand-editor').forEach(btn => {
        btn.addEventListener('click', () => {
            const editorId = btn.getAttribute('data-editor');
            const previewId = btn.getAttribute('data-preview');
            openFullscreenEditor(editorId, previewId);
        });
    });
    
    // Close button
    const closeBtn = document.querySelector('.btn-close-fullscreen');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeFullscreenEditor);
    }
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('fullscreen-editor-modal');
            if (modal && modal.style.display !== 'none') {
                closeFullscreenEditor();
            }
        }
    });
    
    // Toggle split view
    const toggleSplitBtn = document.querySelector('.btn-toggle-split');
    if (toggleSplitBtn) {
        toggleSplitBtn.addEventListener('click', () => {
            const content = document.querySelector('.fullscreen-content');
            if (content) {
                if (content.classList.contains('preview-only')) {
                    content.classList.remove('preview-only');
                    content.classList.add('split-view');
                } else if (content.classList.contains('split-view')) {
                    content.classList.remove('split-view');
                    content.classList.add('editor-only');
                } else {
                    content.classList.remove('editor-only');
                    content.classList.add('split-view');
                }
            }
        });
    }
    
    // Live preview update
    const fullscreenEditor = document.getElementById('fullscreen-editor');
    if (fullscreenEditor) {
        fullscreenEditor.addEventListener('input', () => {
            updateFullscreenPreview();
        });
    }
}

function openFullscreenEditor(editorId, previewId) {
    const editor = document.getElementById(editorId);
    const preview = document.getElementById(previewId);
    const modal = document.getElementById('fullscreen-editor-modal');
    const fullscreenEditor = document.getElementById('fullscreen-editor');
    const fullscreenPreview = document.getElementById('fullscreen-preview');
    const title = document.getElementById('fullscreen-title');
    
    if (!editor || !modal || !fullscreenEditor || !fullscreenPreview) return;
    
    // Copy content to fullscreen editor
    fullscreenEditor.value = editor.value;
    
    // Update title
    if (title) {
        const lang = editorId.includes('vi') ? 'Tiếng Việt' : 'English';
        title.textContent = `Editor & Preview - ${lang}`;
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Update preview
    updateFullscreenPreview();
    
    // Focus editor
    setTimeout(() => {
        fullscreenEditor.focus();
        // Restore cursor position if possible
        const cursorPos = editor.selectionStart;
        fullscreenEditor.setSelectionRange(cursorPos, cursorPos);
    }, 100);
    
    // Sync back to original editor on input
    fullscreenEditor.addEventListener('input', syncToOriginalEditor);
    function syncToOriginalEditor() {
        editor.value = fullscreenEditor.value;
        // Also update preview in main view if visible
        if (preview && preview.style.display !== 'none') {
            updatePreview(editorId.includes('vi') ? 'vi' : 'en');
        }
    }
    
    // Store sync function for cleanup
    fullscreenEditor._syncHandler = syncToOriginalEditor;
}

function closeFullscreenEditor() {
    const modal = document.getElementById('fullscreen-editor-modal');
    const fullscreenEditor = document.getElementById('fullscreen-editor');
    
    if (!modal || !fullscreenEditor) return;
    
    // Remove sync handler
    if (fullscreenEditor._syncHandler) {
        fullscreenEditor.removeEventListener('input', fullscreenEditor._syncHandler);
        delete fullscreenEditor._syncHandler;
    }
    
    // Hide modal
    modal.style.display = 'none';
    
    // Reset split view
    const content = document.querySelector('.fullscreen-content');
    if (content) {
        content.classList.remove('editor-only', 'preview-only');
        content.classList.add('split-view');
    }
}

function updateFullscreenPreview() {
    const fullscreenEditor = document.getElementById('fullscreen-editor');
    const fullscreenPreview = document.getElementById('fullscreen-preview');
    
    if (!fullscreenEditor || !fullscreenPreview) return;
    
    const markdown = fullscreenEditor.value;
    
    if (typeof marked !== 'undefined') {
        fullscreenPreview.innerHTML = marked.parse(markdown || '*No content yet*');
        
        // Apply syntax highlighting if highlight.js is available
        if (typeof hljs !== 'undefined') {
            fullscreenPreview.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    } else {
        fullscreenPreview.textContent = markdown || 'No content yet';
    }
}
