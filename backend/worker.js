export default {
  async fetch(request, env) {
    // CORS headers to allow requests from the blog
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Configure this to your domain in production
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return new Response("Missing key param", { status: 400, headers: corsHeaders });
    }

    // Get current count from KV
    // Requires a KV Namespace bound to 'VIEWS'
    let value = await env.VIEWS.get(key);
    let count = value ? parseInt(value) : 0;

    // Increment logic
    if (request.method === "POST" || url.pathname.includes("/increment")) {
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
