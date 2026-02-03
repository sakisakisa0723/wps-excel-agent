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

// CORS 头 - 支持所有来源和方法
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL, X-API-Key, X-Auth-Format, X-Stream, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
};

// 代理 LLM API 请求
function handleProxy(req, res) {
    const targetUrl = req.headers['x-target-url'];
    
    if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ error: 'Missing X-Target-URL header' }));
        return;
    }

    let target;
    try {
        target = new URL(targetUrl);
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ error: 'Invalid target URL' }));
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        console.log('Request body:', body);
        
        const isHttps = target.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        // 判断是否是 Anthropic/Kimi Code 格式
        const isAnthropic = req.headers['x-auth-format'] === 'anthropic' || 
                           targetUrl.includes('kimi.com/coding') ||
                           targetUrl.includes('anthropic');
        
        // 构建请求头
        const proxyHeaders = {
            'Content-Type': 'application/json',
            'Host': target.hostname,
            'User-Agent': 'WPS-Excel-Agent/1.0'
        };
        
        // 处理 API Key 认证
        const apiKey = req.headers['x-api-key'];
        if (apiKey) {
            if (isAnthropic) {
                // Anthropic/Kimi Code 格式: x-api-key + anthropic-version
                proxyHeaders['x-api-key'] = apiKey;
                proxyHeaders['anthropic-version'] = '2023-06-01';
            } else {
                // OpenAI 格式: Authorization: Bearer
                proxyHeaders['Authorization'] = `Bearer ${apiKey}`;
            }
        }

        console.log(`Proxy request to: ${targetUrl}`);
        console.log(`Using ${isAnthropic ? 'Anthropic' : 'OpenAI'} format`);
        console.log('Proxy headers:', JSON.stringify(proxyHeaders, null, 2));

        const proxyReq = httpModule.request({
            hostname: target.hostname,
            port: target.port || (isHttps ? 443 : 80),
            path: target.pathname + target.search,
            method: req.method,
            headers: proxyHeaders
        }, proxyRes => {
            console.log(`Proxy response status: ${proxyRes.statusCode}`);
            
            // 收集响应体以便调试
            let responseBody = '';
            proxyRes.on('data', chunk => responseBody += chunk);
            proxyRes.on('end', () => {
                if (proxyRes.statusCode >= 400) {
                    console.log('API Error Response:', responseBody);
                }
            });
            
            // 转发响应，添加 CORS 头
            res.writeHead(proxyRes.statusCode, {
                ...CORS_HEADERS,
                'Content-Type': proxyRes.headers['content-type'] || 'application/json'
            });
            proxyRes.pipe(res);
        });

        proxyReq.on('error', e => {
            console.error('Proxy error:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
            res.end(JSON.stringify({ error: e.message }));
        });

        if (body) {
            proxyReq.write(body);
        }
        proxyReq.end();
    });
}

http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    
    // 处理 CORS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        return res.end();
    }

    // API 代理
    if (req.url === '/proxy') {
        return handleProxy(req, res);
    }

    // 静态文件
    let filePath = req.url.split('?')[0];
    if (filePath === '/') filePath = '/index.html';
    
    const file = path.join(DIST, filePath);
    
    if (!fs.existsSync(file)) {
        // SPA 路由：返回 index.html
        const indexFile = path.join(DIST, 'index.html');
        if (fs.existsSync(indexFile)) {
            res.writeHead(200, { 'Content-Type': 'text/html', ...CORS_HEADERS });
            return fs.createReadStream(indexFile).pipe(res);
        }
        res.writeHead(404, CORS_HEADERS);
        return res.end('Not found');
    }
    
    const ext = path.extname(file);
    res.writeHead(200, { 
        'Content-Type': MIME[ext] || 'text/plain',
        ...CORS_HEADERS
    });
    fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`WPS Excel Agent Server running on port ${PORT}`));
