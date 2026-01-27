/**
 * Agent 循环逻辑
 * 参考 OpenCode 的设计
 */

import { callLLM } from './llm.js';
import { executeTool, TOOLS, get_sheet_info } from './tools.js';

// 构建系统提示词
function buildSystemPrompt() {
    let prompt = `你是 Excel AI Agent，可以自主操作表格完成用户任务。

## 当前工作簿信息
`;
    
    try {
        const info = get_sheet_info();
        if (!info.error) {
            prompt += `- 工作表: ${info.name}\n`;
            prompt += `- 数据范围: ${info.rows}行 x ${info.cols}列\n`;
            if (info.headers.length > 0) {
                prompt += `- 表头: ${info.headers.join(', ')}\n`;
            }
        } else {
            prompt += `（${info.error}）\n`;
        }
    } catch (e) {
        prompt += `（无法获取工作簿信息）\n`;
    }
    
    prompt += `
## 可用工具
使用格式: [TOOL: 工具名(参数)]

`;
    
    // 列出所有工具
    for (const [name, tool] of Object.entries(TOOLS)) {
        const args = tool.args ? tool.args.map(a => `${a}="..."`).join(', ') : '';
        prompt += `- [TOOL: ${name}(${args})] - ${tool.desc}\n`;
    }
    
    prompt += `
## 工作模式
1. 收到任务后，先输出 [PLAN] 简短计划（1-3步）
2. 每次只调用一个工具
3. 工具返回结果后继续下一步
4. 完成后输出 [DONE] 和简短总结

## 规则
- 写公式时：先 insert_formula 写第一行，再 fill_formula 填充
- 批量数据用 write_range，不要逐个 write_cell
- 遇到错误尝试修复，不要停下来问用户
`;
    
    return prompt;
}

// 解析工具调用
function parseToolCalls(text) {
    const pattern = /\[TOOL:\s*(\w+)\((.*?)\)\]/g;
    const calls = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
        const name = match[1];
        const argsStr = match[2].trim();
        
        // 解析参数
        const args = {};
        if (argsStr) {
            // 尝试解析 key="value" 格式
            const argPattern = /(\w+)=("[^"]*"|'[^']*'|\[[^\]]*\]|[^,]+)/g;
            let argMatch;
            while ((argMatch = argPattern.exec(argsStr)) !== null) {
                let value = argMatch[2].trim();
                // 去掉引号
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                // 尝试解析 JSON
                try {
                    value = JSON.parse(value);
                } catch (e) {}
                args[argMatch[1]] = value;
            }
        }
        
        calls.push({ name, args });
    }
    
    return calls;
}

// 运行 Agent
export async function runAgent(userMessage, callbacks = {}) {
    const { onThinking, onPlan, onToolStart, onToolResult, onText, onDone, onError } = callbacks;
    
    const systemPrompt = buildSystemPrompt();
    const history = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];
    
    try {
        for (let step = 0; step < 15; step++) {
            onThinking?.();
            
            // 调用 LLM
            const response = await callLLM(history);
            
            // 检查 [PLAN]
            if (response.includes('[PLAN]')) {
                const planMatch = response.match(/\[PLAN\]([\s\S]*?)(?=\[|$)/);
                if (planMatch) {
                    onPlan?.(planMatch[1].trim());
                }
            }
            
            // 解析工具调用
            const toolCalls = parseToolCalls(response);
            
            if (toolCalls.length > 0) {
                const { name, args } = toolCalls[0];
                
                onToolStart?.(name, args);
                
                // 执行工具
                const result = executeTool(name, args);
                
                onToolResult?.(name, result);
                
                // 更新历史
                history.push({ role: 'assistant', content: response });
                history.push({ role: 'user', content: `[工具结果] ${JSON.stringify(result)}` });
                
            } else {
                // 没有工具调用，输出文本
                const cleanText = response
                    .replace(/\[PLAN\][\s\S]*?(?=\[|$)/, '')
                    .replace(/\[TOOL:.*?\]/g, '')
                    .trim();
                
                if (cleanText) {
                    onText?.(cleanText);
                }
                
                history.push({ role: 'assistant', content: response });
                
                // 检查是否完成
                if (response.includes('[DONE]')) {
                    onDone?.();
                    break;
                }
            }
        }
    } catch (e) {
        onError?.(e.message);
    }
}
