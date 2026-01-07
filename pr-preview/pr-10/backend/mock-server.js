const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const DB_FILE = path.join(__dirname, 'views.json');

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

    // Increment if POST or path has /increment (to match worker logic)
    if (req.method === 'POST' || url.pathname.includes('/increment')) {
        count++;
        views[key] = count;
        fs.writeFileSync(DB_FILE, JSON.stringify(views, null, 2));
    }

    console.log(`[View Count] Key: ${key}, Count: ${count}`);

    res.writeHead(200);
    res.end(JSON.stringify({ count }));
});

server.listen(PORT, () => {
    console.log(`Mock View Count API running at http://localhost:${PORT}`);
    console.log(`- GET/POST http://localhost:${PORT}/increment?key=some-id`);
});
