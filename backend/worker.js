export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Helper Response
    const json = (data, status = 200) => 
      new Response(JSON.stringify(data), { 
        status, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });

    const error = (msg, status = 400) => json({ error: msg }, status);

    try {
      // --- VIEW COUNT LOGIC ---
      if (path === "/increment" || (path === "/" && url.searchParams.get("key"))) {
        return await handleViewCount(request, env, url, corsHeaders);
      }

      // --- CMS API LOGIC ---
      
      // GET /api/posts - List posts
      if (path === "/api/posts" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT id, slug, title, excerpt, language, created_at FROM posts WHERE is_published = 1 ORDER BY created_at DESC"
        ).all();
        return json(results);
      }

      // GET /api/posts/:slug - Get single post
      if (path.startsWith("/api/posts/") && request.method === "GET") {
        const slug = path.split("/").pop();
        const post = await env.DB.prepare(
          "SELECT * FROM posts WHERE slug = ?"
        ).bind(slug).first();
        
        if (!post) return error("Post not found", 404);
        return json(post);
      }

      // POST /api/posts - Create post (Simple protected endpoint example)
      // In production, add Auth check here!
      if (path === "/api/posts" && request.method === "POST") {
        const body = await request.json();
        const { slug, title, content, topic_id, language, pair_id } = body;
        const now = Math.floor(Date.now() / 1000);

        const result = await env.DB.prepare(
          `INSERT INTO posts (slug, title, content, topic_id, language, pair_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(slug, title, content, topic_id, language, pair_id, now, now).run();

        return json({ success: true, id: result.meta.last_row_id }, 201);
      }
      
      // GET /api/topics
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
