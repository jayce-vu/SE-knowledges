const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const DB_FILE = path.join(__dirname, 'views.json');

// In-memory rate limiting store for mock server
// Structure: { "ip:key": timestamp }
const rateLimitCache = {};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute for testing

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const key = url.searchParams.get('key');
    // Mock IP address (in real world this comes from headers)
    const ip = req.socket.remoteAddress || '127.0.0.1';

    if (!key) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing key param' }));
        return;
    }

    // Read DB
    let views = {};
    try {
        views = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error('Error reading DB:', e);
    }

    let count = views[key] || 0;
    let shouldIncrement = false;

    // Increment logic with Rate Limiting
    if (req.method === 'POST' || url.pathname.includes('/increment')) {
        const rateLimitKey = `${ip}:${key}`;
        const now = Date.now();
        const lastViewed = rateLimitCache[rateLimitKey];

        if (!lastViewed || (now - lastViewed > RATE_LIMIT_WINDOW_MS)) {
            shouldIncrement = true;
            rateLimitCache[rateLimitKey] = now;
        } else {
            console.log(`[Rate Limit] Blocked spam from ${ip} for key ${key}`);
        }
    }

    if (shouldIncrement) {
        count++;
        views[key] = count;
        fs.writeFileSync(DB_FILE, JSON.stringify(views, null, 2));
        console.log(`[View Count] Key: ${key}, Count: ${count} (Incremented)`);
    } else {
        console.log(`[View Count] Key: ${key}, Count: ${count} (Not Incremented)`);
    }

    res.writeHead(200);
    res.end(JSON.stringify({ count }));
});

server.listen(PORT, () => {
    console.log(`Mock View Count API running at http://localhost:${PORT}`);
    console.log(`- Rate Limit Window: ${RATE_LIMIT_WINDOW_MS / 1000} seconds`);
    console.log(`- GET/POST http://localhost:${PORT}/increment?key=some-id`);
});
