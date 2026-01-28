# WPS Excel AI Agent

用自然语言操作 WPS 表格的 AI 助手插件。

## 功能

- 🤖 自然语言交互，自动执行表格操作
- 📊 读取/写入单元格、搜索数据、插入公式
- 🎯 Agent 模式：自动规划并执行多步任务
- ⚙️ 支持自定义 OpenAI 兼容 API

## 截图

Claude 风格的简洁 UI，工具调用可折叠显示。

## 安装

### 开发调试

```bash
npm install
npm run dev
wpsjs debug
```

### 生产部署

1. 构建：
```bash
npm run build
```

2. 将 `dist/` 文件夹上传到你的服务器

3. 在 Windows 上配置 `%appdata%\kingsoft\wps\jsaddons\publish.xml`：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jsplugins>
    <jspluginonline name="Excel AI Agent" url="https://你的域名/" type="et" enable="enable_dev"/>
</jsplugins>
```

4. 重启 WPS 表格

### 解决跨域问题

WPS Excel 插件在 Windows 上直接调用外部 API 会遇到跨域问题。提供三种解决方案：

**方案1: Node.js 代理服务器（推荐自建服务器使用）**

在服务器上运行：
```bash
node proxy-server.js
# 或用 pm2
pm2 start proxy-server.js --name llm-proxy
```

然后在插件设置中：
- 开启「使用代理服务器」
- 填写代理地址，如 `https://your-server.com:3456`

**方案2: Cloudflare Workers（推荐无服务器部署）**

1. 将 `proxy-worker.js` 部署到 Cloudflare Workers
2. 在插件设置中开启代理，填写 Worker URL

**方案3: 使用支持 CORS 的 API 提供商**

某些 API 提供商（如 OpenRouter）支持 CORS，可直接使用。

## 配置

点击插件右上角设置按钮，可配置：

- Base URL：API 端点地址
- API Key：你的 API 密钥
- Model：模型名称

支持任何 OpenAI 兼容的 API。

## 技术栈

- Vue 3 + Vite
- WPS JS Add-in API
- OpenAI 兼容 API

## License

MIT
