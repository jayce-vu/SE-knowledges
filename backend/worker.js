export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Configure this to your domain in production
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

    // Rate Limiting Logic (Simple)
    // Key structure for rate limit: "rate_limit:IP:POST_ID"
    // Allow 1 view per IP per Post every 60 seconds (or 10 mins etc.)
    const rateLimitKey = `rate_limit:${ip}:${key}`;
    const hasViewed = await env.VIEWS.get(rateLimitKey);

    let shouldIncrement = false;

    // Only increment if POST request and not recently viewed
    if ((request.method === "POST" || url.pathname.includes("/increment"))) {
      if (!hasViewed) {
        shouldIncrement = true;
        // Set flag with expiration (TTL) in seconds. e.g., 300s = 5 minutes
        await env.VIEWS.put(rateLimitKey, "1", { expirationTtl: 300 }); 
      }
    }

    // Get current count
    let value = await env.VIEWS.get(key);
    let count = value ? parseInt(value) : 0;

    if (shouldIncrement) {
      count++;
      await env.VIEWS.put(key, count.toString());
    }

    return new Response(JSON.stringify({ count }), {
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders 
      }
    });
  },
};
