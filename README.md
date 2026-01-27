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

生产环境需要代理 LLM API。可以：

1. 使用 `proxy-server.js`（需要 Node.js 服务器）：
```bash
node proxy-server.js
# 或用 pm2
pm2 start proxy-server.js --name llm-proxy
```

2. 或使用 Cloudflare Workers / 阿里云函数计算搭建代理

然后在插件设置里修改 API URL 为你的代理地址。

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
