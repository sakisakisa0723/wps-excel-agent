import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3890;
const DIST = path.join(__dirname, 'dist');

const MIME = {
    '.html': 'text/html', 
    '.js': 'application/javascript', 
    '.css': 'text/css',
    '.json': 'application/json', 
    '.png': 'image/png', 
    '.ico': 'image/x-icon', 
    '.xml': 'application/xml'
};

// 代理 LLM API 请求
function handleProxy(req, res) {
    // 从 header 或 query 参数获取目标 URL
    let targetUrl = req.headers['x-target-url'];
    
    // 兼容旧版本的 query 参数方式
    if (!targetUrl && req.url.startsWith('/proxy?')) {
        targetUrl = new URL(req.url, 'http://localhost').searchParams.get('url');
    }
    
    if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing X-Target-URL header or url param' }));
        return;
    }

    let target;
    try {
        target = new URL(targetUrl);
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid target URL' }));
        return;
    }

    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
        const isHttps = target.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const proxyReq = httpModule.request({
            hostname: target.hostname,
            port: target.port || (isHttps ? 443 : 80),
            path: target.pathname + target.search,
            method: req.method,
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': req.headers.authorization || '',
                'Host': target.hostname,
                'User-Agent': 'WPS-Excel-Agent/1.0'
            }
        }, proxyRes => {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL'
            });
            proxyRes.pipe(res);
        });

        proxyReq.on('error', e => {
            console.error('Proxy error:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
}

http.createServer((req, res) => {
    // CORS 预检
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL'
        });
        return res.end();
    }

    // API 代理
    if (req.url === '/proxy' || req.url.startsWith('/proxy?')) {
        return handleProxy(req, res);
    }

    // 静态文件
    let file = path.join(DIST, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(file)) file = path.join(DIST, 'index.html');
    
    const ext = path.extname(file);
    res.writeHead(200, { 
        'Content-Type': MIME[ext] || 'text/plain',
        'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`WPS Excel Agent Server running on port ${PORT}`));
