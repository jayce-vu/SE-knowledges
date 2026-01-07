export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    if (!key) {
      return new Response("Missing key param", { status: 400, headers: corsHeaders });
    }

    // Initialize tables if they don't exist (Lazy initialization)
    // In production, you should run migrations via wrangler d1 migrations
    // But for simplicity/robustness here we can try-catch or assume existence.
    // Better to assume existence as per standard D1 workflow.

    let shouldIncrement = false;

    // Rate Limiting Logic with D1
    // Table: rate_limits (ip, slug, last_viewed)
    // Window: 300 seconds (5 minutes)
    const RATE_LIMIT_WINDOW = 300; 
    const now = Math.floor(Date.now() / 1000);

    if (request.method === "POST" || url.pathname.includes("/increment")) {
        // Check last view
        const lastViewResult = await env.DB.prepare(
            "SELECT last_viewed FROM rate_limits WHERE ip = ? AND slug = ?"
        ).bind(ip, key).first();

        if (!lastViewResult || (now - lastViewResult.last_viewed > RATE_LIMIT_WINDOW)) {
            shouldIncrement = true;
            
            // Update rate limit
            // SQLite UPSERT syntax
            await env.DB.prepare(
                `INSERT INTO rate_limits (ip, slug, last_viewed) VALUES (?, ?, ?)
                 ON CONFLICT(ip, slug) DO UPDATE SET last_viewed = ?`
            ).bind(ip, key, now, now).run();
        }
    }

    // Get current count
    // Table: post_views (slug, count)
    const viewResult = await env.DB.prepare(
        "SELECT count FROM post_views WHERE slug = ?"
    ).bind(key).first();
    
    let count = viewResult ? viewResult.count : 0;

    if (shouldIncrement) {
      count++;
      // Upsert view count
      await env.DB.prepare(
        `INSERT INTO post_views (slug, count) VALUES (?, ?)
         ON CONFLICT(slug) DO UPDATE SET count = ?`
      ).bind(key, count, count).run();
    }

    return new Response(JSON.stringify({ count }), {
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders 
      }
    });
  },
};
