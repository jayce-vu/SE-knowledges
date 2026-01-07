export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    const json = (data, status = 200) => 
      new Response(JSON.stringify(data), { 
        status, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });

    const error = (msg, status = 400) => json({ error: msg }, status);

    try {
      // --- VIEW COUNT ---
      if (path === "/increment" || (path === "/" && url.searchParams.get("key"))) {
        return await handleViewCount(request, env, url, corsHeaders);
      }

      // --- PUBLIC API ---

      // GET /api/articles - List articles (Latest translations)
      // Filter by language via ?lang=vi (default)
      if (path === "/api/articles" && request.method === "GET") {
        const lang = url.searchParams.get("lang") || "vi";
        const { results } = await env.DB.prepare(`
          SELECT a.id, t.slug, t.title, t.excerpt, t.language, a.created_at, a.thumbnail_url, top.name as topic_name 
          FROM articles a
          JOIN article_translations t ON a.id = t.article_id
          LEFT JOIN topics top ON a.topic_id = top.id
          WHERE a.is_published = 1 AND t.language = ?
          ORDER BY a.created_at DESC
        `).bind(lang).all();
        return json(results);
      }

      // GET /api/articles/:slug - Get single article by slug
      if (path.startsWith("/api/articles/") && request.method === "GET") {
        const slug = path.split("/").pop();
        
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

      // --- ADMIN API (Mock Auth) ---
      
      // GET /api/admin/articles/:id - Get FULL article with ALL translations for editing
      if (path.startsWith("/api/admin/articles/") && request.method === "GET") {
          const id = path.split("/").pop();
          
          const article = await env.DB.prepare("SELECT * FROM articles WHERE id = ?").bind(id).first();
          if (!article) return error("Article not found", 404);

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
        const body = await request.json();
        const { id, topic_id, author_id, thumbnail_url, is_published, tags, translations } = body; 
        // translations is array: [{ lang: 'vi', title: '...', slug: '...', content: '...' }, { lang: 'en', ... }]
        
        const now = Math.floor(Date.now() / 1000);
        let articleId = id;

        if (!translations || !Array.isArray(translations) || translations.length === 0) {
            return error("At least one translation is required");
        }

        // Transaction (Batching manually as D1 transaction support is specific)
        // 1. Create or Update Article Parent
        if (!articleId) {
            const result = await env.DB.prepare(
                `INSERT INTO articles (topic_id, author_id, thumbnail_url, is_published, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(topic_id, author_id, thumbnail_url, is_published ? 1 : 0, now, now).run();
            articleId = result.meta.last_row_id;
        } else {
            await env.DB.prepare(
                `UPDATE articles SET topic_id=?, author_id=?, thumbnail_url=?, is_published=?, updated_at=? WHERE id=?`
            ).bind(topic_id, author_id, thumbnail_url, is_published ? 1 : 0, now, articleId).run();
        }

        // 2. Upsert Translations
        // Note: D1 doesn't support generic batch upsert cleanly in one statement easily for varying params, 
        // so we loop. For high volume, use batch().
        const stmts = [];
        
        for (const t of translations) {
             stmts.push(env.DB.prepare(
                 `INSERT INTO article_translations (article_id, language, slug, title, content, excerpt, meta_description, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(article_id, language) DO UPDATE SET
                  slug=excluded.slug, title=excluded.title, content=excluded.content, excerpt=excluded.excerpt, meta_description=excluded.meta_description, updated_at=excluded.updated_at`
             ).bind(articleId, t.language, t.slug, t.title, t.content, t.excerpt, t.meta_description, now));
        }

        // 3. Update Tags (Delete all and re-insert is simplest for now)
        if (tags) {
             stmts.push(env.DB.prepare("DELETE FROM article_tags WHERE article_id = ?").bind(articleId));
             for (const tagId of tags) {
                 stmts.push(env.DB.prepare("INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)").bind(articleId, tagId));
             }
        }

        await env.DB.batch(stmts);

        return json({ success: true, id: articleId }, 201);
      }

      // Common endpoints
      if (path === "/api/topics" && request.method === "GET") {
         const { results } = await env.DB.prepare("SELECT * FROM topics").all();
         return json(results);
      }

      return error("Route not found", 404);

    } catch (e) {
      return error(e.message, 500);
    }
  },
};

// Extracted View Count Logic
async function handleViewCount(request, env, url, corsHeaders) {
    const key = url.searchParams.get("key"); // This is the slug
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    if (!key) {
      return new Response("Missing key param", { status: 400, headers: corsHeaders });
    }

    let shouldIncrement = false;
    const RATE_LIMIT_WINDOW = 300; 
    const now = Math.floor(Date.now() / 1000);

    if (request.method === "POST" || url.pathname.includes("/increment")) {
        const lastViewResult = await env.DB.prepare(
            "SELECT last_viewed FROM rate_limits WHERE ip = ? AND slug = ?"
        ).bind(ip, key).first();

        if (!lastViewResult || (now - lastViewResult.last_viewed > RATE_LIMIT_WINDOW)) {
            shouldIncrement = true;
            await env.DB.prepare(
                `INSERT INTO rate_limits (ip, slug, last_viewed) VALUES (?, ?, ?)
                 ON CONFLICT(ip, slug) DO UPDATE SET last_viewed = ?`
            ).bind(ip, key, now, now).run();
        }
    }

    const viewResult = await env.DB.prepare(
        "SELECT count FROM post_views WHERE slug = ?"
    ).bind(key).first();
    
    let count = viewResult ? viewResult.count : 0;

    if (shouldIncrement) {
      count++;
      await env.DB.prepare(
        `INSERT INTO post_views (slug, count) VALUES (?, ?)
         ON CONFLICT(slug) DO UPDATE SET count = ?`
      ).bind(key, count, count).run();
    }

    return new Response(JSON.stringify({ count }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
}
