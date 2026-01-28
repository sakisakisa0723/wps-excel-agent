<template>
  <div class="container">
    <div class="main" v-show="!showSettings">
      <div class="header">
        <div class="title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <span>Excel Agent</span>
        </div>
        <div class="actions">
          <button class="icon-btn" @click="clearChat" v-if="messages.length">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
          <button class="icon-btn" @click="showSettings = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4m-9-9h4m14 0h4m-3.3-6.3l-2.8 2.8m-9.8 9.8l-2.8 2.8m0-15.4l2.8 2.8m9.8 9.8l2.8 2.8"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="chat" ref="chatRef">
        <div v-if="!messages.length" class="welcome">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
          <h2>Excel AI Agent</h2>
          <p>帮你分析和操作表格数据</p>
          <div class="suggestions">
            <button @click="sendSuggestion('这个表有哪些工作表?')">查看工作表</button>
            <button @click="sendSuggestion('读取前10行数据')">读取数据</button>
            <button @click="sendSuggestion('帮我分析这个表的结构')">分析结构</button>
          </div>
        </div>

        <div v-for="(msg, i) in messages" :key="i" class="msg-wrap">
          <div v-if="msg.type === 'user'" class="msg user">
            <div class="avatar">U</div>
            <div class="bubble">{{ msg.content }}</div>
          </div>

          <div v-else-if="msg.type === 'assistant'" class="msg ai">
            <div class="avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <div class="bubble" v-html="formatText(msg.content)"></div>
          </div>

          <div v-else-if="msg.type === 'tool'" class="tool">
            <div class="tool-head" @click="msg.expanded = !msg.expanded">
              <span class="tool-status" :class="msg.status">
                <span v-if="msg.status === 'running'" class="spin"></span>
                <svg v-else-if="msg.status === 'done'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </span>
              <span class="tool-name">{{ msg.name }}</span>
              <span class="tool-arrow">{{ msg.expanded ? '-' : '+' }}</span>
            </div>
            <pre v-if="msg.expanded" class="tool-body">{{ JSON.stringify(msg.result || msg.args, null, 2) }}</pre>
          </div>

          <div v-else-if="msg.type === 'plan'" class="plan">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <span>{{ msg.content }}</span>
          </div>

          <div v-else-if="msg.type === 'thinking'" class="thinking">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>

          <div v-else-if="msg.type === 'done'" class="done">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            完成
          </div>

          <div v-else-if="msg.type === 'error'" class="error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            {{ msg.content }}
          </div>
        </div>
      </div>

      <div class="input-area">
        <div class="input-box">
          <textarea v-model="input" @keydown.enter.exact.prevent="send" :disabled="isRunning" placeholder="输入消息..." rows="1" ref="inputRef"></textarea>
          <button v-if="!isRunning" class="send" @click="send" :disabled="!input.trim()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
          <button v-else class="stop" @click="stop">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div class="settings" v-show="showSettings">
      <div class="settings-head">
        <button class="icon-btn" @click="showSettings = false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
        </button>
        <h2>设置</h2>
      </div>
      <div class="settings-body">
        <div class="field">
          <label>Base URL</label>
          <input v-model="settings.apiUrl" placeholder="https://api.openai.com/v1/chat/completions"/>
        </div>
        <div class="field">
          <label>API Key</label>
          <div class="pwd">
            <input v-model="settings.apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="sk-..."/>
            <button @click="showApiKey = !showApiKey">{{ showApiKey ? '隐藏' : '显示' }}</button>
          </div>
        </div>
        <div class="field">
          <label>模型</label>
          <input v-model="settings.model" placeholder="gpt-4"/>
        </div>
        <div class="field">
          <label class="check"><input type="checkbox" v-model="settings.useProxy"/><span>使用代理</span></label>
        </div>
        <div class="field" v-if="settings.useProxy">
          <label>代理地址</label>
          <input v-model="settings.proxyUrl" placeholder="https://your-proxy.com"/>
        </div>
        <div class="btns">
          <button class="primary" @click="saveSettings">保存</button>
          <button @click="resetSettings">重置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue';
import { runAgent } from '../agent/loop.js';
import { loadConfig, saveConfig } from '../agent/llm.js';

const messages = ref([]);
const input = ref('');
const isRunning = ref(false);
const chatRef = ref(null);
const inputRef = ref(null);
const showSettings = ref(false);
const showApiKey = ref(false);

const settings = reactive({ apiUrl: '', apiKey: '', model: '', useProxy: false, proxyUrl: '' });
const defaults = { apiUrl: 'https://api.openai.com/v1/chat/completions', apiKey: '', model: 'gpt-3.5-turbo', useProxy: false, proxyUrl: '' };

const scroll = () => nextTick(() => chatRef.value && (chatRef.value.scrollTop = chatRef.value.scrollHeight));
const add = m => { messages.value.push(m); scroll(); };
const rmThink = () => { const l = messages.value.at(-1); l?.type === 'thinking' && messages.value.pop(); };
const formatText = t => t?.replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code>$1</code>') || '';
const sendSuggestion = t => { input.value = t; send(); };

async function send() {
  const t = input.value.trim();
  if (!t || isRunning.value) return;
  input.value = ''; isRunning.value = true;
  add({ type: 'user', content: t });
  await runAgent(t, {
    onThinking: () => { rmThink(); add({ type: 'thinking' }); },
    onPlan: p => { rmThink(); add({ type: 'plan', content: p }); },
    onToolStart: (n, a) => { rmThink(); add({ type: 'tool', name: n, args: a, status: 'running', expanded: false }); },
    onToolResult: (n, r) => { const m = [...messages.value].reverse().find(x => x.type === 'tool' && x.name === n); if (m) { m.status = r.error ? 'error' : 'done'; m.result = r; } scroll(); },
    onText: t => { rmThink(); add({ type: 'assistant', content: t }); },
    onDone: () => { rmThink(); add({ type: 'done' }); },
    onError: e => { rmThink(); add({ type: 'error', content: e }); }
  });
  isRunning.value = false;
}

const stop = () => { isRunning.value = false; rmThink(); add({ type: 'error', content: '已停止' }); };
const clearChat = () => messages.value = [];
const loadSettings = () => { const c = loadConfig(); Object.assign(settings, c); };
const saveSettings = () => { saveConfig({ ...settings }); showSettings.value = false; };
const resetSettings = () => Object.assign(settings, defaults);
onMounted(loadSettings);
</script>

<style scoped>
.container { height: 100vh; display: flex; flex-direction: column; background: var(--bg-primary); }
.main, .settings { display: flex; flex-direction: column; height: 100%; }

.header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-primary); }
.title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-primary); }
.actions { display: flex; gap: 4px; }
.icon-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--border-primary); border-radius: 8px; color: var(--text-secondary); cursor: pointer; }
.icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.chat { flex: 1; overflow-y: auto; padding: 16px; }
.welcome { text-align: center; padding: 60px 20px; color: var(--text-secondary); }
.welcome svg { margin-bottom: 16px; opacity: 0.5; }
.welcome h2 { font-size: 20px; color: var(--text-primary); margin-bottom: 8px; }
.welcome p { margin-bottom: 24px; }
.suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.suggestions button { padding: 8px 16px; background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 20px; color: var(--text-secondary); cursor: pointer; font-size: 14px; }
.suggestions button:hover { background: var(--bg-hover); color: var(--text-primary); }

.msg-wrap { margin-bottom: 16px; }
.msg { display: flex; gap: 12px; }
.avatar { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.user .avatar { background: var(--bg-tertiary); color: var(--text-primary); }
.ai .avatar { background: var(--bg-secondary); color: var(--text-secondary); }
.bubble { padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.6; max-width: 85%; }
.user .bubble { background: var(--bg-secondary); color: var(--text-primary); }
.ai .bubble { background: transparent; color: var(--text-secondary); padding-left: 0; }
.ai .bubble :deep(code) { background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-size: 13px; }

.tool { margin-left: 40px; background: var(--bg-secondary); border-radius: 8px; overflow: hidden; }
.tool-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; font-size: 13px; }
.tool-head:hover { background: var(--bg-hover); }
.tool-status { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.tool-status.running { color: var(--warning); }
.tool-status.done { color: var(--success); }
.tool-status.error { color: var(--error); }
.spin { width: 10px; height: 10px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.tool-name { color: var(--text-tertiary); font-family: monospace; }
.tool-arrow { margin-left: auto; color: var(--text-tertiary); }
.tool-body { margin: 0; padding: 12px; background: var(--bg-tertiary); font-size: 12px; color: var(--text-tertiary); white-space: pre-wrap; word-break: break-all; max-height: 150px; overflow-y: auto; }

.plan { margin-left: 40px; display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; font-size: 13px; color: var(--warning); }
.thinking { margin-left: 40px; display: flex; gap: 4px; }
.dot { width: 6px; height: 6px; background: var(--text-tertiary); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
.done { margin-left: 40px; display: flex; align-items: center; gap: 6px; color: var(--success); font-size: 13px; }
.error { margin-left: 40px; display: flex; align-items: center; gap: 6px; color: var(--error); font-size: 13px; }

.input-area { padding: 12px 16px 16px; border-top: 1px solid var(--border-primary); }
.input-box { display: flex; align-items: flex-end; gap: 8px; background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 8px 8px 8px 14px; }
.input-box:focus-within { border-color: var(--border-focus); }
.input-box textarea { flex: 1; border: none; background: none; resize: none; font-size: 14px; color: var(--text-primary); font-family: inherit; max-height: 120px; }
.input-box textarea:focus { outline: none; }
.input-box textarea::placeholder { color: var(--text-tertiary); }
.send, .stop { width: 36px; height: 36px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.send { background: var(--text-primary); color: var(--bg-primary); }
.send:disabled { background: var(--bg-tertiary); color: var(--text-tertiary); cursor: not-allowed; }
.stop { background: rgba(239, 68, 68, 0.2); color: var(--error); }

.settings-head { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-primary); }
.settings-head h2 { font-size: 16px; margin: 0; }
.settings-body { flex: 1; overflow-y: auto; padding: 20px 16px; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.field input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-primary); border-radius: 8px; font-size: 14px; color: var(--text-primary); background: var(--bg-secondary); }
.field input:focus { outline: none; border-color: var(--border-focus); }
.pwd { display: flex; gap: 8px; }
.pwd input { flex: 1; }
.pwd button { padding: 0 12px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: 8px; font-size: 12px; color: var(--text-secondary); cursor: pointer; }
.check { display: flex !important; align-items: center; gap: 8px; cursor: pointer; }
.check input { width: auto; }
.btns { display: flex; gap: 12px; margin-top: 24px; }
.btns button { flex: 1; padding: 12px; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btns .primary { background: var(--text-primary); color: var(--bg-primary); border: none; }
.btns button:not(.primary) { background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border-primary); }
</style>
