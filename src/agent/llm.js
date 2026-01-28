/**
 * LLM API 调用
 * 支持 OpenAI 兼容接口
 */

// 默认配置（可在设置中修改）
let config = {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    // 代理服务器配置（解决跨域问题）
    useProxy: false,
    proxyUrl: ''
};

// 加载配置
export function loadConfig() {
    try {
        const saved = localStorage.getItem('agent_llm_config');
        if (saved) {
            config = { ...config, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('加载配置失败:', e);
    }
    return config;
}

// 保存配置
export function saveConfig(newConfig) {
    config = { ...config, ...newConfig };
    localStorage.setItem('agent_llm_config', JSON.stringify(config));
}

// 获取当前配置
export function getConfig() {
    return { ...config };
}

// 获取实际请求 URL
function getApiUrl() {
    // 开发环境使用 Vite 代理
    if (import.meta.env.DEV) {
        return '/api/llm/v1/chat/completions';
    }
    // 如果启用了代理服务器，使用代理地址
    if (config.useProxy && config.proxyUrl) {
        return config.proxyUrl.replace(/\/$/, '') + '/v1/chat/completions';
    }
    // 生产环境直连（可能会有跨域问题）
    return config.apiUrl;
}

// 调用 LLM API
export async function callLLM(messages, options = {}) {
    const { signal, onChunk } = options;

    try {
        // 构建请求头
        const headers = {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        };

        // 如果使用代理服务器，添加目标 API 地址到头
        if (config.useProxy && config.proxyUrl) {
            headers['X-Target-API'] = config.apiUrl.replace('/v1/chat/completions', '');
        }

        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model,
                messages,
                max_tokens: 2000,
                temperature: 0.3,
                stream: !!onChunk
            }),
            signal
        });
        
        if (!response.ok) {
            throw new Error(`API 错误: ${response.status}`);
        }
        
        // 流式响应
        if (onChunk) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices?.[0]?.delta?.content || '';
                            if (content) {
                                fullContent += content;
                                onChunk(content, fullContent);
                            }
                        } catch (e) {}
                    }
                }
            }
            
            return fullContent;
        }
        
        // 非流式响应
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
        
    } catch (e) {
        if (e.name === 'AbortError') {
            throw e;
        }
        throw new Error(`LLM 调用失败: ${e.message}`);
    }
}
