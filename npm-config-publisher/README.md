# NPM 配置化发布工具

一个强大的配置化 NPM 包发布工具，支持 CI/CD 集成和自动化发布流程。

## 🚀 特性

- 📝 **配置化发布** - 通过 JSON 配置文件管理发布流程
- 🔄 **CI/CD 集成** - 支持 GitHub Actions、GitLab CI 等
- 📦 **多包管理** - 支持批量发布多个包
- 🎯 **版本管理** - 自动版本递增和语义化版本
- 🔐 **安全认证** - 支持多种认证方式
- 📊 **发布日志** - 详细的发布历史和状态跟踪

## 📁 项目结构

```
npm-config-publisher/
├── src/                    # 源代码
│   ├── index.js           # 主入口文件
│   ├── config/            # 配置相关
│   ├── publisher/         # 发布逻辑
│   ├── utils/             # 工具函数
│   └── validators/        # 验证器
├── bin/                   # 命令行工具
├── examples/              # 示例配置
├── templates/             # 模板文件
├── docs/                  # 文档
└── tests/                 # 测试文件
```

## 🛠️ 安装

```bash
npm install -g npm-config-publisher
```

或本地安装：

```bash
npm install
```

## 📖 快速开始

### 1. 创建配置文件

```bash
npm-config-publish init
```

### 2. 编辑配置

编辑生成的 `publish-config.json` 文件：

```json
{
  "packages": [
    {
      "name": "my-package",
      "version": "1.0.0",
      "path": "./dist",
      "registry": "https://registry.npmjs.org/"
    }
  ],
  "auth": {
    "npm": {
      "token": "${NPM_TOKEN}"
    }
  }
}
```

### 3. 发布

```bash
npm-config-publish --config publish-config.json
```

## 🔧 配置选项

### 基本配置

```json
{
  "packages": [
    {
      "name": "包名",
      "version": "版本号",
      "path": "包路径",
      "registry": "NPM仓库地址",
      "access": "public|restricted",
      "tag": "发布标签"
    }
  ],
  "auth": {
    "npm": {
      "token": "NPM Token"
    }
  },
  "options": {
    "dryRun": false,
    "skipExisting": true,
    "autoVersion": false
  }
}
```

## 🔄 CI/CD 集成

### GitHub Actions

```yaml
name: Publish to NPM
on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install
      - run: npm run build
      - run: npm-config-publish --config .github/publish-config.json
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 📚 更多文档

- [详细配置说明](docs/configuration.md)
- [CI/CD 集成指南](docs/ci-cd.md)
- [故障排除](docs/troubleshooting.md)
- [API 文档](docs/api.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
