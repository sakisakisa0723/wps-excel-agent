<template>
  <div class="agent-container" :class="{ 'settings-open': showSettings }">
    <!-- 主界面 -->
    <div class="main-view" v-show="!showSettings">
      <!-- 顶部栏 -->
      <div class="topbar">
        <div class="logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Excel Agent</span>
        </div>
        <div class="topbar-actions">
          <button class="icon-btn" @click="clearChat" title="清空对话" v-if="messages.length > 0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
          <button class="icon-btn" @click="showSettings = true" title="设置">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 聊天区域 -->
      <div class="chat-area" ref="chatRef">
        <!-- 欢迎界面 -->
        <div v-if="messages.length === 0" class="welcome">
          <div class="welcome-icon">📊</div>
          <h2>Excel AI Agent</h2>
          <p>我可以帮你分析和操作表格数据</p>
          <div class="suggestions">
            <button @click="sendSuggestion('这个表有哪些工作表？')">查看工作表</button>
            <button @click="sendSuggestion('读取前10行数据')">读取数据</button>
            <button @click="sendSuggestion('帮我分析这个表的结构')">分析结构</button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-for="(msg, idx) in messages" :key="idx" class="message-wrapper">
          <!-- 用户消息 -->
          <div v-if="msg.type === 'user'" class="message user-message">
            <div class="avatar user-avatar">你</div>
            <div class="content">{{ msg.content }}</div>
          </div>

          <!-- AI 消息组 -->
          <div v-else-if="msg.type === 'assistant'" class="message ai-message">
            <div class="avatar ai-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div class="content">
              <div class="ai-text" v-html="formatText(msg.content)"></div>
            </div>
          </div>

          <!-- 工具调用 -->
          <div v-else-if="msg.type === 'tool'" class="tool-call">
            <div class="tool-header" @click="msg.expanded = !msg.expanded">
              <span class="tool-indicator" :class="msg.status">
                <span v-if="msg.status === 'running'" class="spinner"></span>
                <span v-else-if="msg.status === 'done'">✓</span>
                <span v-else>✗</span>
              </span>
              <span class="tool-label">{{ msg.name }}</span>
              <span class="tool-toggle">{{ msg.expanded ? '收起' : '展开' }}</span>
            </div>
            <div v-if="msg.expanded" class="tool-detail">
              <pre>{{ JSON.stringify(msg.result || msg.args, null, 2) }}</pre>
            </div>
          </div>

          <!-- 计划 -->
          <div v-else-if="msg.type === 'plan'" class="plan-block">
            <div class="plan-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              执行计划
            </div>
            <div class="plan-text">{{ msg.content }}</div>
          </div>

          <!-- 思考中 -->
          <div v-else-if="msg.type === 'thinking'" class="thinking-indicator">
            <div class="thinking-dots">
              <span></span><span></span><span></span>
            </div>
            <span>思考中...</span>
          </div>

          <!-- 完成 -->
          <div v-else-if="msg.type === 'done'" class="done-indicator">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            任务完成
          </div>

          <!-- 错误 -->
          <div v-else-if="msg.type === 'error'" class="error-block">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {{ msg.content }}
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-wrapper">
          <textarea 
            v-model="input" 
            @keydown.enter.exact.prevent="send"
            :disabled="isRunning"
            placeholder="输入你的问题或指令..."
            rows="1"
            ref="inputRef"
          ></textarea>
          <button 
            v-if="!isRunning" 
            class="send-btn" 
            @click="send" 
            :disabled="!input.trim()"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
          <button v-else class="stop-btn" @click="stop">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 设置页面 -->
    <div class="settings-view" v-show="showSettings">
      <div class="settings-header">
        <button class="back-btn" @click="showSettings = false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2>设置</h2>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <h3>API 配置</h3>
          <p class="section-desc">配置 OpenAI 兼容的 API 接口</p>
          
          <div class="form-field">
            <label>Base URL</label>
            <input 
              v-model="settings.apiUrl" 
              placeholder="https://api.openai.com/v1/chat/completions"
            />
            <span class="hint">API 端点地址</span>
          </div>

          <div class="form-field">
            <label>API Key</label>
            <div class="password-field">
              <input 
                v-model="settings.apiKey" 
                :type="showApiKey ? 'text' : 'password'"
                placeholder="sk-..."
              />
              <button class="toggle-visibility" @click="showApiKey = !showApiKey">
                {{ showApiKey ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>

          <div class="form-field">
            <label>模型名称</label>
            <input
              v-model="settings.model"
              placeholder="gpt-4"
            />
          </div>

          <div class="form-field">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="settings.useProxy"
              />
              <span>使用代理服务器（解决跨域问题）</span>
            </label>
            <span class="hint">部署在服务器上时需要开启</span>
          </div>

          <div class="form-field" v-if="settings.useProxy">
            <label>代理服务器地址</label>
            <input
              v-model="settings.proxyUrl"
              placeholder="https://your-proxy-server.com"
            />
            <span class="hint">你的代理服务器地址，指向部署 proxy-server.js 的服务器</span>
          </div>
        </div>

        <div class="settings-actions">
          <button class="save-btn" @click="saveSettings">保存设置</button>
          <button class="reset-btn" @click="resetSettings">恢复默认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue';
import { runAgent } from '../agent/loop.js';
import { loadConfig, saveConfig, getConfig } from '../agent/llm.js';

const messages = ref([]);
const input = ref('');
const isRunning = ref(false);
const chatRef = ref(null);
const inputRef = ref(null);
const showSettings = ref(false);
const showApiKey = ref(false);

const settings = reactive({
  apiUrl: '',
  apiKey: '',
  model: '',
  useProxy: false,
  proxyUrl: ''
});

const defaultSettings = {
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-3.5-turbo',
  useProxy: false,
  proxyUrl: ''
};

function scrollToBottom() {
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTop = chatRef.value.scrollHeight;
    }
  });
}

function addMessage(msg) {
  messages.value.push(msg);
  scrollToBottom();
}

function removeThinking() {
  const last = messages.value[messages.value.length - 1];
  if (last && last.type === 'thinking') {
    messages.value.pop();
  }
}

function formatText(text) {
  if (!text) return '';
  return text
    .replace(/\n/g, '<br>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function sendSuggestion(text) {
  input.value = text;
  send();
}

async function send() {
  const text = input.value.trim();
  if (!text || isRunning.value) return;
  
  input.value = '';
  isRunning.value = true;
  
  addMessage({ type: 'user', content: text });
  
  await runAgent(text, {
    onThinking: () => {
      removeThinking();
      addMessage({ type: 'thinking' });
    },
    onPlan: (plan) => {
      removeThinking();
      addMessage({ type: 'plan', content: plan });
    },
    onToolStart: (name, args) => {
      removeThinking();
      addMessage({ type: 'tool', name, args, status: 'running', expanded: false });
    },
    onToolResult: (name, result) => {
      const lastTool = [...messages.value].reverse().find(m => m.type === 'tool' && m.name === name);
      if (lastTool) {
        lastTool.status = result.error ? 'error' : 'done';
        lastTool.result = result;
      }
      scrollToBottom();
    },
    onText: (text) => {
      removeThinking();
      addMessage({ type: 'assistant', content: text });
    },
    onDone: () => {
      removeThinking();
      addMessage({ type: 'done' });
    },
    onError: (error) => {
      removeThinking();
      addMessage({ type: 'error', content: error });
    }
  });
  
  isRunning.value = false;
}

function stop() {
  isRunning.value = false;
  removeThinking();
  addMessage({ type: 'error', content: '已停止' });
}

function clearChat() {
  messages.value = [];
}

function loadSettings() {
  const config = loadConfig();
  settings.apiUrl = config.apiUrl;
  settings.apiKey = config.apiKey;
  settings.model = config.model;
  settings.useProxy = config.useProxy || false;
  settings.proxyUrl = config.proxyUrl || '';
}

function saveSettings() {
  saveConfig({
    apiUrl: settings.apiUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    useProxy: settings.useProxy,
    proxyUrl: settings.proxyUrl
  });
  showSettings.value = false;
}

function resetSettings() {
  settings.apiUrl = defaultSettings.apiUrl;
  settings.apiKey = defaultSettings.apiKey;
  settings.model = defaultSettings.model;
  settings.useProxy = defaultSettings.useProxy;
  settings.proxyUrl = defaultSettings.proxyUrl;
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
/* 高级黑白灰 + 毛玻璃效果 */
.agent-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--text-primary);
}

/* 顶部栏 - 毛玻璃 */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: var(--accent-primary);
}

.topbar-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-primary);
  color: var(--text-primary);
}

/* 聊天区域 */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
}

/* 欢迎界面 */
.welcome {
  text-align: center;
  padding: 40px 20px;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.welcome h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.welcome p {
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.suggestions button {
  padding: 8px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: 18px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestions button:hover {
  background: var(--bg-hover);
  border-color: var(--accent-secondary);
  color: var(--text-primary);
}

/* 消息 */
.message-wrapper {
  margin-bottom: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 100%;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-avatar {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.ai-avatar {
  background: rgba(255, 255, 255, 0.08);
  color: var(--accent-primary);
  border: 1px solid var(--border-primary);
}

.content {
  flex: 1;
  min-width: 0;
}

.user-message .content {
  background: var(--bg-elevated);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-primary);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}

.ai-message .content {
  padding-top: 4px;
}

.ai-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.ai-text :deep(code) {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  color: var(--accent-primary);
}

/* 工具调用 */
.tool-call {
  margin-left: 40px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s ease;
}

.tool-header:hover {
  background: var(--bg-hover);
}

.tool-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.tool-indicator.running {
  background: rgba(251, 191, 36, 0.15);
  color: var(--warning);
}

.tool-indicator.done {
  background: rgba(74, 222, 128, 0.15);
  color: var(--success);
}

.tool-indicator.error {
  background: rgba(248, 113, 113, 0.15);
  color: var(--error);
}

.spinner {
  width: 10px;
  height: 10px;
  border: 2px solid var(--warning);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tool-label {
  color: var(--text-tertiary);
  font-family: 'SF Mono', Monaco, monospace;
}

.tool-toggle {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 12px;
}

.tool-detail {
  padding: 12px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
}

.tool-detail pre {
  margin: 0;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-tertiary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
}

/* 计划 */
.plan-block {
  margin-left: 40px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: var(--radius-md);
  padding: 12px;
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--warning);
  margin-bottom: 8px;
}

.plan-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

/* 思考中 */
.thinking-indicator {
  margin-left: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.thinking-dots {
  display: flex;
  gap: 3px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  background: var(--text-tertiary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 完成 */
.done-indicator {
  margin-left: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--success);
  font-size: 13px;
  font-weight: 500;
}

/* 错误 */
.error-block {
  margin-left: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--error);
  font-size: 13px;
}

/* 输入区域 */
.input-area {
  padding: 12px 16px 16px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--glass-border);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 8px 8px 8px 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
}

.input-wrapper textarea {
  flex: 1;
  border: none;
  background: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  font-family: inherit;
  max-height: 120px;
}

.input-wrapper textarea:focus {
  outline: none;
}

.input-wrapper textarea::placeholder {
  color: var(--text-tertiary);
}

.send-btn, .stop-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn {
  background: var(--text-primary);
  color: var(--bg-primary);
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-btn:disabled {
  background: var(--bg-elevated);
  color: var(--text-disabled);
  cursor: not-allowed;
}

.stop-btn {
  background: rgba(248, 113, 113, 0.2);
  color: var(--error);
}

.stop-btn:hover {
  background: rgba(248, 113, 113, 0.3);
}

/* 设置页面 */
.settings-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-border);
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-primary);
  color: var(--text-primary);
}

.settings-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  transition: border-color 0.2s ease, background 0.2s ease;
  box-sizing: border-box;
}

.form-field input:focus {
  outline: none;
  border-color: var(--border-focus);
  background: var(--bg-elevated);
}

.hint {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-primary) !important;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  accent-color: var(--text-primary);
}

.password-field {
  display: flex;
  gap: 8px;
}

.password-field input {
  flex: 1;
}

.toggle-visibility {
  padding: 0 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-visibility:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.settings-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
}

.save-btn {
  flex: 1;
  padding: 12px;
  background: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn:hover {
  background: var(--accent-hover);
}

.reset-btn {
  padding: 12px 16px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-primary);
}

/* 主视图 */
.main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
