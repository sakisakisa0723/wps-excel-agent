# WPS Excel AI Agent

用自然语言操作 WPS 表格的 AI 助手插件。

## 功能

- 🤖 自然语言交互，自动执行表格操作
- 📊 读取/写入单元格、搜索数据、插入公式
- 🎯 Agent 模式：自动规划并执行多步任务
- ⚙️ 支持自定义 OpenAI 兼容 API（如 Kimi、DeepSeek 等）

## 安装

### 1. 服务器部署

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动服务器（端口 3890）
node server.js
```

或使用 PM2 守护进程：
```bash
pm2 start server.js --name wps-excel-agent
```

### 2. WPS 插件配置

在 Windows 上配置 `%appdata%\kingsoft\wps\jsaddons\publish.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jsplugins>
    <jspluginonline name="Excel AI Agent" url="http://你的服务器IP:3890/" type="et" enable="enable_dev"/>
</jsplugins>
```

重启 WPS 表格即可使用。

## 配置

点击插件右上角设置按钮，可配置：

- **Base URL**: API 端点地址，例如：
  - Kimi: `https://api.moonshot.cn/v1/chat/completions`
  - DeepSeek: `https://api.deepseek.com/v1/chat/completions`
  - OpenAI: `https://api.openai.com/v1/chat/completions`
- **API Key**: 你的 API 密钥
- **模型**: 模型名称，例如 `moonshot-v1-8k`、`deepseek-chat`

配置会自动保存到浏览器 localStorage。

## 技术栈

- Vue 3 + Vite
- WPS JS Add-in API
- OpenAI 兼容 API

## License

MIT
