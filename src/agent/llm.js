/**
 * LLM API 调用
 * 支持 OpenAI 和 Anthropic (Claude) 兼容接口
 */

const STORAGE_KEY = 'wps_excel_agent_config';

// 默认配置
const DEFAULT_CONFIG = {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    apiType: 'openai'  // 'openai' 或 'anthropic'
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

// 检测 API 类型
function detectApiType(url) {
    if (url.includes('kimi.com/coding') || 
        url.includes('anthropic') ||
        url.includes('api.anthropic.com')) {
        return 'anthropic';
    }
    return config.apiType || 'openai';
}

// 转换为 Anthropic 格式消息
function convertToAnthropicMessages(messages) {
    // 找到 system 消息
    const systemMsg = messages.find(m => m.role === 'system');
    const system = systemMsg ? systemMsg.content : '';
    
    // 其他消息（user/assistant）
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    return { system, messages: otherMessages };
}

// 调用 LLM API
export async function callLLM(messages, options = {}) {
    const { signal, onChunk } = options;

    try {
        // 自动检测 API 类型并修正 URL
        const apiType = detectApiType(config.apiUrl);
        const isAnthropic = apiType === 'anthropic';
        
        // 使用同域代理，避免跨域
        const url = '/proxy';
        
        // 修正目标 URL：Anthropic 格式用 /v1/messages
        let targetUrl = config.apiUrl;
        if (isAnthropic) {
            // 提取基础路径（到 /v1 为止）
            const baseMatch = targetUrl.match(/^(https?:\/\/[^\/]+\/[^\/]+\/v1)/);
            if (baseMatch) {
                targetUrl = baseMatch[1] + '/messages';
            } else if (targetUrl.includes('/chat/completions')) {
                targetUrl = targetUrl.replace('/chat/completions', '/messages');
            }
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Target-URL': targetUrl
        };
        
        // 如果配置了 API Key，通过自定义头传递
        if (config.apiKey) {
            headers['X-API-Key'] = config.apiKey;
            // 某些服务需要 Anthropic 格式的 auth 头
            if (isAnthropic) {
                headers['X-Auth-Format'] = 'anthropic';
            }
        }

        let requestBody;
        
        if (isAnthropic) {
            // Anthropic/Claude 格式
            const { system, messages: anthropicMessages } = convertToAnthropicMessages(messages);
            requestBody = {
                model: config.model,
                max_tokens: 8192,
                messages: anthropicMessages
            };
            if (system) {
                requestBody.system = system;
            }
            // Claude 格式不支持 stream 参数放在 body 里，需要头控制
            if (onChunk) {
                headers['X-Stream'] = 'true';
            }
        } else {
            // OpenAI 格式
            requestBody = {
                model: config.model,
                messages,
                max_tokens: 2000,
                stream: !!onChunk
            };
            // kimi-k2.5 不支持 temperature
            if (!config.model.includes('kimi-k2.5')) {
                requestBody.temperature = 0.3;
            }
        }
        
        console.log('Request:', { url: config.apiUrl, apiType, model: config.model });

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`API 错误 ${response.status}: ${errorText}`);
        }
        
        // 流式响应处理
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
                    if (!line.trim() || line === 'data: [DONE]') continue;
                    
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            // Anthropic 格式
                            if (data.type === 'content_block_delta' && data.delta?.text) {
                                const content = data.delta.text;
                                fullContent += content;
                                onChunk(content, fullContent);
                            }
                            // OpenAI 格式
                            else if (data.choices?.[0]?.delta?.content) {
                                const content = data.choices[0].delta.content;
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
        
        // Anthropic 格式
        if (data.content && Array.isArray(data.content)) {
            return data.content.map(c => c.text).join('');
        }
        // OpenAI 格式
        return data.choices?.[0]?.message?.content || '';
        
    } catch (e) {
        if (e.name === 'AbortError') {
            throw e;
        }
        throw new Error(`LLM 调用失败: ${e.message}`);
    }
}
