import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3890;
const DIST = path.join(__dirname, 'dist');

const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.xml': 'application/xml'
};

http.createServer((req, res) => {
    // API 代理: /proxy?url=xxx
    if (req.url.startsWith('/proxy?')) {
        const targetUrl = new URL(req.url, 'http://localhost').searchParams.get('url');
        if (!targetUrl) return res.writeHead(400).end('Missing url param');

        const target = new URL(targetUrl);
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const proxy = https.request({
                hostname: target.hostname,
                port: 443,
                path: target.pathname,
                method: req.method,
                headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization || '' }
            }, r => {
                res.writeHead(r.statusCode, { ...r.headers, 'Access-Control-Allow-Origin': '*' });
                r.pipe(res);
            });
            proxy.on('error', e => res.writeHead(500).end(e.message));
            proxy.write(body);
            proxy.end();
        });
        return;
    }

    // CORS 预检
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    // 静态文件
    let file = path.join(DIST, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(file)) file = path.join(DIST, 'index.html');
    
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Server running on port ${PORT}`));
