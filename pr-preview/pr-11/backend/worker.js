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

      // GET /api/posts - List published posts
      if (path === "/api/posts" && request.method === "GET") {
        const { results } = await env.DB.prepare(`
          SELECT p.id, p.slug, p.title, p.excerpt, p.language, p.created_at, p.thumbnail_url, t.name as topic_name 
          FROM posts p
          LEFT JOIN topics t ON p.topic_id = t.id
          WHERE p.is_published = 1 
          ORDER BY p.created_at DESC
        `).all();
        return json(results);
      }

      // GET /api/posts/:slug - Get post details
      if (path.startsWith("/api/posts/") && request.method === "GET") {
        const slug = path.split("/").pop();
        const post = await env.DB.prepare(`
          SELECT p.*, t.name as topic_name, u.username as author_name
          FROM posts p
          LEFT JOIN topics t ON p.topic_id = t.id
          LEFT JOIN users u ON p.author_id = u.id
          WHERE p.slug = ?
        `).bind(slug).first();
        
        if (!post) return error("Post not found", 404);

        // Get tags
        const { results: tags } = await env.DB.prepare(`
          SELECT t.name, t.slug 
          FROM tags t
          JOIN post_tags pt ON t.id = pt.tag_id
          WHERE pt.post_id = ?
        `).bind(post.id).all();

        return json({ ...post, tags });
      }

      // GET /api/topics
      if (path === "/api/topics" && request.method === "GET") {
         const { results } = await env.DB.prepare("SELECT * FROM topics").all();
         return json(results);
      }

      // GET /api/tags
      if (path === "/api/tags" && request.method === "GET") {
         const { results } = await env.DB.prepare("SELECT * FROM tags").all();
         return json(results);
      }

      // --- COMMENTS ---
      // GET /api/comments?post_slug=xxx
      if (path === "/api/comments" && request.method === "GET") {
          const postSlug = url.searchParams.get("post_slug");
          if (!postSlug) return error("Missing post_slug param");

          const { results } = await env.DB.prepare(`
            SELECT c.id, c.content, c.created_at, c.guest_name, u.username
            FROM comments c
            JOIN posts p ON c.post_id = p.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE p.slug = ? AND c.is_approved = 1
            ORDER BY c.created_at DESC
          `).bind(postSlug).all();

          return json(results);
      }

      // POST /api/comments
      if (path === "/api/comments" && request.method === "POST") {
          const body = await request.json();
          const { post_slug, content, guest_name, guest_email } = body;
          
          const post = await env.DB.prepare("SELECT id FROM posts WHERE slug = ?").bind(post_slug).first();
          if (!post) return error("Post not found", 404);

          const now = Math.floor(Date.now() / 1000);
          // Auto approve for simplicity, in real app set is_approved=0
          await env.DB.prepare(
            `INSERT INTO comments (post_id, content, guest_name, guest_email, created_at, is_approved)
             VALUES (?, ?, ?, ?, ?, 1)`
          ).bind(post.id, content, guest_name, guest_email, now).run();

          return json({ success: true, message: "Comment submitted" }, 201);
      }

      // --- ADMIN API (Mock Auth) ---
      // In production, verify JWT token here
      
      // POST /api/admin/posts
      if (path === "/api/admin/posts" && request.method === "POST") {
        const body = await request.json();
        const { slug, title, content, topic_id, language, pair_id, tags } = body; // tags is array of tag_ids
        const now = Math.floor(Date.now() / 1000);

        const result = await env.DB.prepare(
          `INSERT INTO posts (slug, title, content, topic_id, language, pair_id, created_at, updated_at, is_published)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
        ).bind(slug, title, content, topic_id, language, pair_id, now, now).run();

        const postId = result.meta.last_row_id;

        // Insert Tags
        if (tags && Array.isArray(tags)) {
            const stmt = env.DB.prepare("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)");
            const batch = tags.map(tagId => stmt.bind(postId, tagId));
            await env.DB.batch(batch);
        }

        return json({ success: true, id: postId }, 201);
      }

      return error("Route not found", 404);

    } catch (e) {
      return error(e.message, 500);
    }
  },
};

// Extracted View Count Logic (Same as before)
async function handleViewCount(request, env, url, corsHeaders) {
    const key = url.searchParams.get("key");
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
