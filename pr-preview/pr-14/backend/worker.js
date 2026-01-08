export default {
  async fetch(request, env) {
    // CORS configuration - can be set via env variable
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Helper: Safe JSON parsing
    async function safeJsonParse(request) {
      try {
        return await request.json();
      } catch (e) {
        return null;
      }
    }

    // Helper: JSON response
    const json = (data, status = 200) => 
      new Response(JSON.stringify(data), { 
        status, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });

    // Helper: Error response with sanitized messages
    const error = (msg, status = 400) => {
      // In production, don't expose internal errors
      const isDev = env.ENVIRONMENT === "development";
      const sanitizedMsg = isDev ? msg : "An error occurred. Please try again.";
      return json({ error: sanitizedMsg }, status);
    };

    // Helper: Validate required fields
    function validateRequired(obj, fields) {
      for (const field of fields) {
        if (!obj[field] || (typeof obj[field] === "string" && obj[field].trim() === "")) {
          return { valid: false, error: `Missing or empty field: ${field}` };
        }
      }
      return { valid: true };
    }

    // Helper: Validate email format
    function validateEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    // Helper: Validate slug format (alphanumeric, hyphens, underscores)
    function validateSlug(slug) {
      const slugRegex = /^[a-z0-9_-]+$/i;
      return slugRegex.test(slug);
    }

    // Helper: Sanitize error message
    function sanitizeError(e, defaultMsg = "An error occurred") {
      if (env.ENVIRONMENT === "development") {
        return e.message || defaultMsg;
      }
      return defaultMsg;
    }

    try {
      // Health check endpoint
      if (path === "/health") {
        return json({ 
          status: "ok", 
          timestamp: Date.now(),
          environment: env.ENVIRONMENT || "production"
        });
      }

      // --- VIEW COUNT ---
      if (path === "/increment" || (path === "/" && url.searchParams.get("key"))) {
        return await handleViewCount(request, env, url, corsHeaders);
      }

      // --- PUBLIC API ---

      // GET /api/articles - List articles with pagination
      // Filter by language via ?lang=vi (default)
      // Pagination: ?limit=20&offset=0
      if (path === "/api/articles" && request.method === "GET") {
        const lang = url.searchParams.get("lang") || "vi";
        const limit = Math.min(parseInt(url.searchParams.get("limit")) || 20, 100); // Max 100
        const offset = Math.max(parseInt(url.searchParams.get("offset")) || 0, 0);

        const { results } = await env.DB.prepare(`
          SELECT 
            a.id, 
            t.slug, 
            t.title, 
            t.excerpt, 
            t.language, 
            a.created_at, 
            a.thumbnail_url, 
            top.name as topic_name,
            u.username as author_name
          FROM articles a
          JOIN article_translations t ON a.id = t.article_id
          LEFT JOIN topics top ON a.topic_id = top.id
          LEFT JOIN users u ON a.author_id = u.id
          WHERE a.is_published = 1 AND t.language = ?
          ORDER BY a.created_at DESC
          LIMIT ? OFFSET ?
        `).bind(lang, limit, offset).all();

        // Get total count for pagination metadata
        const { results: countResult } = await env.DB.prepare(`
          SELECT COUNT(*) as total
          FROM articles a
          JOIN article_translations t ON a.id = t.article_id
          WHERE a.is_published = 1 AND t.language = ?
        `).bind(lang).all();

        const total = countResult[0]?.total || 0;

        return json({
          data: results,
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total
          }
        });
      }

      // GET /api/articles/:slug - Get single article by slug
      if (path.startsWith("/api/articles/") && request.method === "GET") {
        const slug = path.split("/").pop();
        
        if (!slug || !validateSlug(slug)) {
          return error("Invalid slug format", 400);
        }

        // Find translation first
        const translation = await env.DB.prepare(`
            SELECT * FROM article_translations WHERE slug = ?
        `).bind(slug).first();

        if (!translation) return error("Article not found", 404);

        // Get Article details
        const article = await env.DB.prepare(`
            SELECT a.*, top.name as topic_name, u.username as author_name
            FROM articles a
            LEFT JOIN topics top ON a.topic_id = top.id
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.id = ?
        `).bind(translation.article_id).first();

        // Get Tags
        const { results: tags } = await env.DB.prepare(`
            SELECT t.name, t.slug 
            FROM tags t
            JOIN article_tags at ON t.id = at.tag_id
            WHERE at.article_id = ?
        `).bind(translation.article_id).all();

        return json({ ...article, ...translation, tags });
      }

      // --- COMMENTS ---
      // GET /api/comments?post_slug=xxx
      if (path === "/api/comments" && request.method === "GET") {
          const postSlug = url.searchParams.get("post_slug");
          if (!postSlug) return error("Missing post_slug param");
          
          if (!validateSlug(postSlug)) {
            return error("Invalid slug format", 400);
          }

          // Resolve slug to article_id first via article_translations
          const { results } = await env.DB.prepare(`
            SELECT c.id, c.content, c.created_at, c.guest_name, u.username
            FROM comments c
            JOIN article_translations t ON c.article_id = t.article_id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE t.slug = ? AND c.is_approved = 1
            ORDER BY c.created_at DESC
          `).bind(postSlug).all();

          return json(results);
      }

      // POST /api/comments
      if (path === "/api/comments" && request.method === "POST") {
          const body = await safeJsonParse(request);
          if (!body) return error("Invalid JSON body", 400);

          const { post_slug, content, guest_name, guest_email } = body;
          
          // Validation
          const validation = validateRequired(body, ["post_slug", "content", "guest_name"]);
          if (!validation.valid) return error(validation.error);

          if (content.trim().length < 3) {
            return error("Comment content must be at least 3 characters", 400);
          }

          if (guest_email && !validateEmail(guest_email)) {
            return error("Invalid email format", 400);
          }

          if (!validateSlug(post_slug)) {
            return error("Invalid slug format", 400);
          }

          // Find article_id from slug
          const translation = await env.DB.prepare("SELECT article_id FROM article_translations WHERE slug = ?").bind(post_slug).first();
          if (!translation) return error("Post not found", 404);

          const now = Math.floor(Date.now() / 1000);
          // Auto approve for simplicity
          await env.DB.prepare(
            `INSERT INTO comments (article_id, content, guest_name, guest_email, created_at, is_approved)
             VALUES (?, ?, ?, ?, ?, 1)`
          ).bind(translation.article_id, content.trim(), guest_name.trim(), guest_email?.trim() || null, now).run();

          return json({ success: true, message: "Comment submitted" }, 201);
      }

      // --- ADMIN API (Mock Auth) ---
      
      // Helper function to get current user from token
      async function getCurrentUser(authHeader) {
        if (!authHeader) return null;
        
        try {
          // Decode token (format: "userid:username:timestamp")
          const tokenData = atob(authHeader.replace('Bearer ', ''));
          const [userId] = tokenData.split(':');
          
          if (!userId || isNaN(parseInt(userId))) return null;
          
          const user = await env.DB.prepare("SELECT id, username, role FROM users WHERE id = ?").bind(parseInt(userId)).first();
          return user || null;
        } catch (e) {
          return null;
        }
      }
      
      // GET /api/admin/articles - List articles of current user
      if (path === "/api/admin/articles" && request.method === "GET") {
        const authHeader = request.headers.get("Authorization");
        const user = await getCurrentUser(authHeader);
        
        if (!user) return error("Unauthorized", 401);
        
        const lang = url.searchParams.get("lang") || "vi";
        
        // Get articles of current user only
        const { results } = await env.DB.prepare(`
          SELECT DISTINCT
            a.id,
            a.topic_id,
            a.author_id,
            a.thumbnail_url,
            a.is_published,
            a.created_at,
            a.updated_at,
            t.slug,
            t.title,
            t.excerpt,
            top.name as topic_name,
            u.username as author_name
          FROM articles a
          JOIN article_translations t ON a.id = t.article_id
          LEFT JOIN topics top ON a.topic_id = top.id
          LEFT JOIN users u ON a.author_id = u.id
          WHERE a.author_id = ? AND t.language = ?
          ORDER BY a.created_at DESC
        `).bind(user.id, lang).all();
        
        return json({ data: results });
      }
      
      // GET /api/admin/articles/:id - Get FULL article with ALL translations for editing
      if (path.startsWith("/api/admin/articles/") && request.method === "GET") {
          const authHeader = request.headers.get("Authorization");
          const user = await getCurrentUser(authHeader);
          
          if (!user) return error("Unauthorized", 401);
          
          const id = path.split("/").pop();
          
          if (!id || isNaN(parseInt(id))) {
            return error("Invalid article ID", 400);
          }

          const article = await env.DB.prepare("SELECT * FROM articles WHERE id = ? AND author_id = ?").bind(id, user.id).first();
          if (!article) return error("Article not found or access denied", 404);

          const { results: translations } = await env.DB.prepare(
              "SELECT * FROM article_translations WHERE article_id = ?"
          ).bind(id).all();

           const { results: tags } = await env.DB.prepare(`
            SELECT tag_id FROM article_tags WHERE article_id = ?
        `).bind(id).all();

          return json({ article, translations, tag_ids: tags.map(t => t.tag_id) });
      }

      // POST /api/admin/articles - Create/Update Article with multiple translations
      if (path === "/api/admin/articles" && request.method === "POST") {
        const authHeader = request.headers.get("Authorization");
        const user = await getCurrentUser(authHeader);
        
        if (!user) return error("Unauthorized", 401);

        const body = await safeJsonParse(request);
        if (!body) return error("Invalid JSON body", 400);

        const { id, topic_id, thumbnail_url, is_published, tags, translations } = body;
        
        // Use current user's ID as author_id (prevent user from creating articles for others)
        const author_id = user.id; 
        
        // Validation
        if (!translations || !Array.isArray(translations) || translations.length === 0) {
            return error("At least one translation is required");
        }

        // Validate each translation
        for (const t of translations) {
          const transValidation = validateRequired(t, ["language", "slug", "title"]);
          if (!transValidation.valid) {
            return error(transValidation.error);
          }
          if (!validateSlug(t.slug)) {
            return error(`Invalid slug format: ${t.slug}`, 400);
          }
          if (!["vi", "en"].includes(t.language)) {
            return error(`Invalid language: ${t.language}. Must be 'vi' or 'en'`, 400);
          }
        }

        const now = Math.floor(Date.now() / 1000);
        let articleId = id;
        const isUpdate = !!articleId;

        // Transaction
        // 1. Create or Update Article Parent
        if (!articleId) {
            const result = await env.DB.prepare(
                `INSERT INTO articles (topic_id, author_id, thumbnail_url, is_published, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(topic_id, author_id, thumbnail_url, is_published ? 1 : 0, now, now).run();
            articleId = result.meta.last_row_id;
        } else {
            // Check ownership before update
            const existingArticle = await env.DB.prepare("SELECT author_id FROM articles WHERE id = ?").bind(articleId).first();
            if (!existingArticle) return error("Article not found", 404);
            if (existingArticle.author_id !== user.id) return error("Access denied: You can only edit your own articles", 403);
            
            await env.DB.prepare(
                `UPDATE articles SET topic_id=?, thumbnail_url=?, is_published=?, updated_at=? WHERE id=? AND author_id=?`
            ).bind(topic_id, thumbnail_url, is_published ? 1 : 0, now, articleId, user.id).run();
        }

        // 2. Upsert Translations
        const stmts = [];
        for (const t of translations) {
             stmts.push(env.DB.prepare(
                 `INSERT INTO article_translations (article_id, language, slug, title, content, excerpt, meta_description, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(article_id, language) DO UPDATE SET
                  slug=excluded.slug, title=excluded.title, content=excluded.content, excerpt=excluded.excerpt, meta_description=excluded.meta_description, updated_at=excluded.updated_at`
             ).bind(articleId, t.language, t.slug, t.title, t.content || null, t.excerpt || null, t.meta_description || null, now));
        }

        // 3. Update Tags
        if (tags && Array.isArray(tags)) {
             stmts.push(env.DB.prepare("DELETE FROM article_tags WHERE article_id = ?").bind(articleId));
             for (const tagId of tags) {
                 if (typeof tagId === "number") {
                   stmts.push(env.DB.prepare("INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)").bind(articleId, tagId));
                 }
             }
        }

        await env.DB.batch(stmts);

        // Return appropriate status code: 201 for create, 200 for update
        return json({ success: true, id: articleId }, isUpdate ? 200 : 201);
      }

      // Common endpoints
      if (path === "/api/topics" && request.method === "GET") {
         const { results } = await env.DB.prepare("SELECT * FROM topics ORDER BY name ASC").all();
         return json(results);
      }
      
      // POST /api/topics - Create Topic
      if (path === "/api/topics" && request.method === "POST") {
         const body = await safeJsonParse(request);
         if (!body) return error("Invalid JSON body", 400);

         const { name, slug, description } = body;
         
         const validation = validateRequired(body, ["name", "slug"]);
         if (!validation.valid) return error(validation.error);

         if (!validateSlug(slug)) {
           return error("Invalid slug format. Use only letters, numbers, hyphens, and underscores", 400);
         }

         try {
           const result = await env.DB.prepare(
              "INSERT INTO topics (name, slug, description) VALUES (?, ?, ?)"
           ).bind(name.trim(), slug.trim(), description?.trim() || null).run();
           
           return json({ success: true, id: result.meta.last_row_id }, 201);
         } catch (e) {
           return error("Topic with this slug already exists", 409);
         }
      }

      // --- AUTH API ---
      
      // POST /api/register - Simple registration (In prod, disable or secure this)
      if (path === "/api/register" && request.method === "POST") {
          const body = await safeJsonParse(request);
          if (!body) return error("Invalid JSON body", 400);

          const { username, password, email } = body;
          
          const validation = validateRequired(body, ["username", "password", "email"]);
          if (!validation.valid) return error(validation.error);

          if (!validateEmail(email)) {
            return error("Invalid email format", 400);
          }

          if (username.length < 3 || username.length > 30) {
            return error("Username must be between 3 and 30 characters", 400);
          }

          if (password.length < 6) {
            return error("Password must be at least 6 characters", 400);
          }

          // Hash password (simple mock hash, use bcrypt/argon2 in prod)
          // Since Worker environment is limited, we might need SubtleCrypto
          // For MVP, we store plain text or simple base64 (NOT SECURE for production)
          // TODO: Implement proper hashing
          const password_hash = btoa(password); 

          const now = Math.floor(Date.now() / 1000);
          
          try {
            const result = await env.DB.prepare(
                "INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, 'author', ?)"
            ).bind(username.trim(), email.trim().toLowerCase(), password_hash, now).run();
            return json({ success: true, id: result.meta.last_row_id }, 201);
          } catch(e) {
            // Sanitize error message
            const errorMsg = sanitizeError(e, "Registration failed. Username or email may already exist.");
            return error(errorMsg, 400);
          }
      }

      // POST /api/login
      if (path === "/api/login" && request.method === "POST") {
          const body = await safeJsonParse(request);
          if (!body) return error("Invalid JSON body", 400);

          const { username, password } = body;
          
          const validation = validateRequired(body, ["username", "password"]);
          if (!validation.valid) return error(validation.error);

          const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username.trim()).first();
          
          if (!user || user.password_hash !== btoa(password)) {
              return error("Invalid credentials", 401);
          }

          // Generate simple token (In prod, use JWT signed with secret)
          // Mock token: "userid:username:signature"
          const token = btoa(`${user.id}:${user.username}:${Date.now()}`);

          return json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
      }
      
      if (path === "/api/tags" && request.method === "GET") {
         const { results } = await env.DB.prepare("SELECT * FROM tags ORDER BY name ASC").all();
         return json(results);
      }

      return error("Route not found", 404);

    } catch (e) {
      // Log error internally
      console.error("Worker error:", e);
      return error(sanitizeError(e, "Internal server error"), 500);
    }
  },
};

// Extracted View Count Logic
// Đếm view theo article_id thay vì slug để tổng hợp view cho tất cả ngôn ngữ
async function handleViewCount(request, env, url, corsHeaders) {
    const slug = url.searchParams.get("key"); // This is the slug
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    if (!slug) {
      return new Response(JSON.stringify({ error: "Missing key param" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9_-]+$/i;
    if (!slugRegex.test(slug)) {
      return new Response(JSON.stringify({ error: "Invalid slug format" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Resolve slug to article_id
    const translation = await env.DB.prepare(
        "SELECT article_id FROM article_translations WHERE slug = ?"
    ).bind(slug).first();

    if (!translation) {
      return new Response(JSON.stringify({ error: "Article not found" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const articleId = translation.article_id;

    let shouldIncrement = false;
    const RATE_LIMIT_WINDOW = 300; 
    const now = Math.floor(Date.now() / 1000);

    // Rate limiting vẫn dùng slug để tránh spam theo từng ngôn ngữ
    // (Người dùng có thể xem cả vi và en trong cùng 5 phút)
    if (request.method === "POST" || url.pathname.includes("/increment")) {
        const lastViewResult = await env.DB.prepare(
            "SELECT last_viewed FROM rate_limits WHERE ip = ? AND slug = ?"
        ).bind(ip, slug).first();

        if (!lastViewResult || (now - lastViewResult.last_viewed > RATE_LIMIT_WINDOW)) {
            shouldIncrement = true;
            await env.DB.prepare(
                `INSERT INTO rate_limits (ip, slug, last_viewed) VALUES (?, ?, ?)
                 ON CONFLICT(ip, slug) DO UPDATE SET last_viewed = ?`
            ).bind(ip, slug, now, now).run();
        }
    }

    // Get view count by article_id (tổng hợp cho tất cả ngôn ngữ)
    const viewResult = await env.DB.prepare(
        "SELECT count FROM post_views WHERE article_id = ?"
    ).bind(articleId).first();
    
    let count = viewResult ? viewResult.count : 0;

    if (shouldIncrement) {
      count++;
      await env.DB.prepare(
        `INSERT INTO post_views (article_id, count) VALUES (?, ?)
         ON CONFLICT(article_id) DO UPDATE SET count = ?`
      ).bind(articleId, count, count).run();
    }

    return new Response(JSON.stringify({ count }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
}
