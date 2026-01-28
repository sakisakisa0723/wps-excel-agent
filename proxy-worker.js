/**
 * Cloudflare Workers 代理脚本
 * 用于解决 WPS Excel 插件的跨域问题
 *
 * 部署步骤:
 * 1. 登录 Cloudflare Dashboard
 * 2. 进入 Workers & Pages
 * 3. 创建新 Worker
 * 4. 粘贴此代码
 * 5. 保存并部署
 * 6. 复制 Worker URL 作为代理地址使用
 */

// 允许的来源（可选：限制特定域名）
const ALLOWED_ORIGINS = ['*'];

// 默认目标 API（可选）
const DEFAULT_TARGET_API = 'https://api.openai.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    // 构建 CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes('*') ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-API, X-API-Key',
      'Access-Control-Expose-Headers': 'Content-Type, Content-Length',
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // 只处理 /v1/chat/completions 路径
    if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
      // 获取目标 API 地址
      const targetApi = request.headers.get('X-Target-API') || DEFAULT_TARGET_API;
      const targetUrl = `${targetApi}/v1/chat/completions`;

      try {
        // 克隆请求头
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('Authorization', request.headers.get('Authorization') || '');
        headers.set('User-Agent', 'WPS-Excel-Agent-Proxy/1.0');

        // 转发请求
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: headers,
          body: request.body
        });

        // 创建新的响应，添加 CORS 头
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newHeaders.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });

      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    // 其他路径返回 404
    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
