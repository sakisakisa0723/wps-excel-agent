/**
 * LLM API 代理服务器
 * 解决 WPS Excel 插件的跨域问题
 *
 * 运行: node proxy-server.js
 * 或用 pm2: pm2 start proxy-server.js --name llm-proxy
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3456;

// 允许的来源（可以根据需要修改）
const ALLOWED_ORIGINS = ['*'];

// 从环境变量读取默认目标 API（可选）
const DEFAULT_TARGET_API = process.env.TARGET_API || 'https://api.openai.com';

const server = http.createServer((req, res) => {
    // 设置 CORS 头
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Target-API, X-API-Key');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 只处理 /v1/chat/completions 路径
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
        // 获取目标 API 地址
        const targetApi = req.headers['x-target-api'] || DEFAULT_TARGET_API;
        let targetUrl;

        try {
            targetUrl = new URL(targetApi);
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid target API URL' }));
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const options = {
                hostname: targetUrl.hostname,
                port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || '',
                    'User-Agent': 'WPS-Excel-Agent-Proxy/1.0'
                }
            };

            // 如果目标使用 https
            const httpModule = targetUrl.protocol === 'https:' ? https : http;

            const proxyReq = httpModule.request(options, proxyRes => {
                // 复制响应头
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                    'Transfer-Encoding': proxyRes.headers['transfer-encoding'],
                    'Connection': 'keep-alive'
                });
                proxyRes.pipe(res);
            });

            proxyReq.on('error', e => {
                console.error('Proxy request error:', e.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            });

            proxyReq.write(body);
            proxyReq.end();
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(PORT, () => {
    console.log(`LLM Proxy Server running on http://localhost:${PORT}`);
    console.log(`Default target API: ${DEFAULT_TARGET_API}`);
    console.log('');
    console.log('Usage:');
    console.log('  Set X-Target-API header to specify the target LLM API');
    console.log('  Or set TARGET_API environment variable for default');
});
