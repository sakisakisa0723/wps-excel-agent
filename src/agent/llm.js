/**
 * LLM API 调用
 * 支持 OpenAI 兼容接口
 */

const STORAGE_KEY = 'wps_excel_agent_config';

// 默认配置
const DEFAULT_CONFIG = {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    useProxy: true,  // 默认启用代理以解决跨域
    proxyUrl: ''     // 空表示使用同域代理 /proxy
};

// 当前配置（内存缓存）
let config = { ...DEFAULT_CONFIG };

// 从 localStorage 加载配置
function loadFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            config = { ...DEFAULT_CONFIG, ...parsed };
        }
    } catch (e) {
        console.error('加载配置失败:', e);
        config = { ...DEFAULT_CONFIG };
    }
}

// 初始化加载
loadFromStorage();

// 加载配置（供外部调用，返回配置副本）
export function loadConfig() {
    loadFromStorage();
    return { ...config };
}

// 保存配置
export function saveConfig(newConfig) {
    config = { ...config, ...newConfig };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('保存配置失败:', e);
    }
}

// 获取当前配置（实时）
export function getConfig() {
    return { ...config };
}

// 获取实际请求 URL
function getApiUrl() {
    // 如果启用代理，使用同域代理端点
    if (config.useProxy) {
        // 代理服务器会将请求转发到 config.apiUrl
        return '/proxy';
    }
    // 不使用代理时直接访问（会有跨域问题）
    return config.apiUrl;
}

// 调用 LLM API
export async function callLLM(messages, options = {}) {
    const { signal, onChunk } = options;

    try {
        const headers = {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Target-URL': config.apiUrl  // 告诉代理服务器目标地址
        };

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
