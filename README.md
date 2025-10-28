# 🚀 自动化包发布工具

一个功能强大的 Web 应用，用于自动化发布组件包和插件包到 NPM 平台。

## ✨ 主要功能

- 🌐 **Web 界面** - 简洁美观的上传界面
- 📦 **NPM 发布** - 自动发布到 NPM 官方仓库或私有仓库
- ⚙️ **灵活配置** - 支持环境变量和手动配置
- 📝 **自动打包** - 自动处理 package.json 和版本管理
- ✅ **发布日志** - 实时显示发布状态和结果

## 📋 前置要求

- Node.js >= 16.0.0
- NPM 或 Yarn
- NPM 账号（可选）

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3000
NPM_TOKEN=your_npm_token
```

### 3. 启动服务

开发模式（自动重启）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

### 4. 访问界面

打开浏览器访问：`http://localhost:3000`

## 📖 使用指南

### 获取 NPM Token

1. 登录 https://www.npmjs.com
2. 进入 Settings → Access Tokens
3. 创建新的 "Automation" 或 "Publish" token
4. 复制 token 到 `.env` 文件

### 上传包文件

支持的文件格式：

- `.zip` - ZIP 压缩包
- `.tgz` 或 `.tar.gz` - TAR 压缩包

推荐包含的内容：

- `package.json` - 包信息
- `README.md` - 说明文档
- 源代码文件

## 🔧 部署到服务器

### 使用 PM2

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "package-publisher"

# 设置开机自启
pm2 startup
pm2 save
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 使用 Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

构建和运行：

```bash
docker build -t package-publisher .
docker run -d -p 3000:3000 --env-file .env package-publisher
```

## 🎯 功能说明

### NPM 发布

- 自动设置 NPM registry
- 支持公开发布和私有一键切换
- 自动检测版本冲突
- 发布前验证包结构

## 📁 项目结构

```
自动化打包/
├── public/              # 前端文件
│   ├── index.html      # 主页面
│   ├── style.css       # 样式文件
│   └── app.js          # 前端逻辑
├── scripts/            # 发布脚本
│   ├── npm-publisher.js
│   └── package-processor.js
├── uploads/            # 临时上传目录
├── processed/          # 处理后的包文件
├── server.js           # 主服务器文件
├── package.json        # 项目配置
├── .env.example        # 环境变量示例
└── README.md           # 说明文档
```

## ⚠️ 安全注意事项

1. **不要提交 `.env` 文件到 Git 仓库**
2. **使用环境变量而不是硬编码 token**
3. **定期轮换访问 token**
4. **使用 HTTPS 部署生产环境**
5. **设置 gaap 限流防止滥用**

## 🐛 常见问题

### NPM 发布失败

- 检查 NPM token 是否有效
- 确认包名符合 NPM 命名规范
- 检查版本号是否已存在

### 文件上传失败

- 检查文件大小是否超过 100MB 限制
- 确认文件格式是否支持
- 检查磁盘空间是否充足

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 支持

如有问题，请创建 Issue 或联系维护者。

---

**祝你发布愉快！** 🎉
