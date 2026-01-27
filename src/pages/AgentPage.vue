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
  model: ''
});

const defaultSettings = {
  apiUrl: 'https://api.xiaomimimo.com/v1/chat/completions',
  apiKey: 'sk-csz6jvy1jb75s7mvq67zaac7zoyqhwcglweun9i1f66x679q',
  model: 'mimo-v2-flash'
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
}

function saveSettings() {
  saveConfig({
    apiUrl: settings.apiUrl,
    apiKey: settings.apiKey,
    model: settings.model
  });
  showSettings.value = false;
}

function resetSettings() {
  settings.apiUrl = defaultSettings.apiUrl;
  settings.apiKey = defaultSettings.apiKey;
  settings.model = defaultSettings.model;
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
/* Claude 风格 - 干净、现代、温暖 */
.agent-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1f2937;
}

/* 顶部栏 */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #d97706;
}

.topbar-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: #f3f4f6;
  color: #374151;
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
}

.welcome h2 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px;
}

.welcome p {
  color: #6b7280;
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
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.suggestions button:hover {
  background: #f9fafb;
  border-color: #d97706;
  color: #d97706;
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
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-avatar {
  background: #dbeafe;
  color: #1d4ed8;
}

.ai-avatar {
  background: #fef3c7;
  color: #d97706;
}

.content {
  flex: 1;
  min-width: 0;
}

.user-message .content {
  background: #fff;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  line-height: 1.5;
}

.ai-message .content {
  padding-top: 4px;
}

.ai-text {
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
}

.ai-text :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
}

/* 工具调用 */
.tool-call {
  margin-left: 40px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.tool-header:hover {
  background: #f9fafb;
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
  background: #fef3c7;
  color: #d97706;
}

.tool-indicator.done {
  background: #d1fae5;
  color: #059669;
}

.tool-indicator.error {
  background: #fee2e2;
  color: #dc2626;
}

.spinner {
  width: 10px;
  height: 10px;
  border: 2px solid #d97706;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tool-label {
  color: #6b7280;
  font-family: 'SF Mono', Monaco, monospace;
}

.tool-toggle {
  margin-left: auto;
  color: #9ca3af;
  font-size: 12px;
}

.tool-detail {
  padding: 12px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.tool-detail pre {
  margin: 0;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, monospace;
  color: #6b7280;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
}

/* 计划 */
.plan-block {
  margin-left: 40px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px;
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #d97706;
  margin-bottom: 8px;
}

.plan-text {
  font-size: 13px;
  line-height: 1.5;
  color: #92400e;
  white-space: pre-wrap;
}

/* 思考中 */
.thinking-indicator {
  margin-left: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
  font-size: 13px;
}

.thinking-dots {
  display: flex;
  gap: 3px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  background: #d1d5db;
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
  color: #059669;
  font-size: 13px;
  font-weight: 500;
}

/* 错误 */
.error-block {
  margin-left: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #dc2626;
  font-size: 13px;
}

/* 输入区域 */
.input-area {
  padding: 12px 16px 16px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 8px 8px 8px 14px;
  transition: border-color 0.15s;
}

.input-wrapper:focus-within {
  border-color: #d97706;
}

.input-wrapper textarea {
  flex: 1;
  border: none;
  background: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
  font-family: inherit;
  max-height: 120px;
}

.input-wrapper textarea:focus {
  outline: none;
}

.input-wrapper textarea::placeholder {
  color: #9ca3af;
}

.send-btn, .stop-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.send-btn {
  background: #d97706;
  color: #fff;
}

.send-btn:hover:not(:disabled) {
  background: #b45309;
}

.send-btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.stop-btn {
  background: #dc2626;
  color: #fff;
}

.stop-btn:hover {
  background: #b91c1c;
}

/* 设置页面 */
.settings-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
}

.back-btn:hover {
  background: #f3f4f6;
}

.settings-header h2 {
  font-size: 16px;
  font-weight: 600;
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
  color: #111827;
  margin: 0 0 4px;
}

.section-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 16px;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: #f9fafb;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.form-field input:focus {
  outline: none;
  border-color: #d97706;
  background: #fff;
}

.hint {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
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
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
}

.toggle-visibility:hover {
  background: #e5e7eb;
}

.settings-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
}

.save-btn {
  flex: 1;
  padding: 12px;
  background: #d97706;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover {
  background: #b45309;
}

.reset-btn {
  padding: 12px 16px;
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.reset-btn:hover {
  background: #e5e7eb;
}

/* 主视图 */
.main-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
