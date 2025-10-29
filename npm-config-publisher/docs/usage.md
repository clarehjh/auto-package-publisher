# 配置化 NPM 发布工具 - 使用指南

## 📖 概述

`npm-config-publisher` 是一个强大的配置化 NPM 包发布工具，支持通过 JSON 配置文件管理发布流程，特别适合 CI/CD 环境和多包项目管理。

## 🚀 快速开始

### 1. 安装

```bash
# 全局安装
npm install -g npm-config-publisher

# 或本地安装
npm install npm-config-publisher
```

### 2. 初始化配置

```bash
npm-config-publish init
```

这将创建一个交互式向导，帮助你生成 `publish-config.json` 配置文件。

### 3. 发布包

```bash
npm-config-publish publish
```

## 📝 配置文件详解

### 基本结构

```json
{
  "packages": [
    {
      "name": "包名",
      "version": "版本号",
      "path": "包路径",
      "registry": "NPM仓库地址",
      "access": "发布权限",
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

### 字段说明

#### packages 数组

| 字段       | 类型   | 必需 | 说明                               |
| ---------- | ------ | ---- | ---------------------------------- |
| `name`     | string | ✅   | 包名称                             |
| `version`  | string | ✅   | 版本号                             |
| `path`     | string | ✅   | 包文件路径                         |
| `registry` | string | ❌   | NPM 仓库地址，默认官方仓库         |
| `access`   | string | ❌   | 发布权限：`public` 或 `restricted` |
| `tag`      | string | ❌   | 发布标签，默认 `latest`            |

#### auth 对象

| 字段        | 类型   | 必需 | 说明         |
| ----------- | ------ | ---- | ------------ |
| `npm.token` | string | ✅   | NPM 访问令牌 |

#### options 对象

| 字段           | 类型    | 默认值 | 说明                   |
| -------------- | ------- | ------ | ---------------------- |
| `dryRun`       | boolean | false  | 试运行模式，不实际发布 |
| `skipExisting` | boolean | true   | 跳过已存在的版本       |
| `autoVersion`  | boolean | false  | 自动版本递增           |
| `cleanup`      | boolean | true   | 清理临时文件           |

## 🛠️ 命令行工具

### 基本命令

```bash
# 初始化配置文件
npm-config-publish init [--file <config-file>]

# 发布包
npm-config-publish publish [--config <config-file>] [--dry-run]

# 验证配置
npm-config-publish validate [--config <config-file>]

# 版本管理
npm-config-publish version [--config <config-file>] [--type <patch|minor|major>]
```

### 选项说明

- `--config, -c`: 指定配置文件路径（默认：`publish-config.json`）
- `--dry-run`: 试运行模式，不实际发布
- `--type, -t`: 版本类型（patch/minor/major）

## 🔄 CI/CD 集成

### GitHub Actions

1. 将模板文件复制到 `.github/workflows/` 目录：

```bash
cp templates/github-actions.yml .github/workflows/publish.yml
```

2. 创建发布配置文件：

```bash
cp examples/basic-config.json .github/publish-config.json
```

3. 在 GitHub 仓库设置中添加 `NPM_TOKEN` 密钥

4. 推送标签触发发布：

```bash
git tag v1.0.0
git push origin v1.0.0
```

### GitLab CI

```yaml
publish:
  stage: deploy
  image: node:18
  script:
    - npm install -g npm-config-publisher
    - npm-config-publish publish --config .gitlab/publish-config.json
  only:
    - tags
  variables:
    NPM_TOKEN: $NPM_TOKEN
```

## 📦 多包管理

### Monorepo 配置

对于包含多个包的 monorepo 项目：

```json
{
  "packages": [
    {
      "name": "@myorg/ui-components",
      "version": "1.2.3",
      "path": "./packages/ui/dist"
    },
    {
      "name": "@myorg/utils",
      "version": "2.0.1",
      "path": "./packages/utils/dist"
    }
  ],
  "auth": {
    "npm": {
      "token": "${NPM_TOKEN}"
    }
  },
  "options": {
    "skipExisting": true,
    "parallel": false
  }
}
```

### 批量发布

```bash
# 发布所有包
npm-config-publish publish

# 试运行查看将要发布的包
npm-config-publish publish --dry-run
```

## 🔐 安全配置

### 环境变量

推荐使用环境变量存储敏感信息：

```json
{
  "auth": {
    "npm": {
      "token": "${NPM_TOKEN}"
    }
  }
}
```

### Token 获取

1. 访问 [NPM 设置页面](https://www.npmjs.com/settings)
2. 进入 "Access Tokens"
3. 创建 "Automation" 或 "Publish" token
4. 复制 token 到环境变量

## 🐛 故障排除

### 常见问题

**Q: 发布失败，提示版本已存在**
A: 检查 `skipExisting` 选项，或更新版本号

**Q: Token 认证失败**
A: 确认 NPM token 有效且有发布权限

**Q: 包路径不存在**
A: 检查 `path` 字段指向的目录是否存在

**Q: package.json 验证失败**
A: 确保包目录包含有效的 `package.json` 文件

### 调试模式

```bash
# 启用详细日志
DEBUG=npm-config-publisher npm-config-publish publish

# 试运行模式
npm-config-publish publish --dry-run
```

## 📚 高级用法

### 自定义钩子

```json
{
  "hooks": {
    "prePublish": "npm run build",
    "postPublish": "npm run test"
  }
}
```

### 条件发布

```json
{
  "packages": [
    {
      "name": "my-package",
      "version": "1.0.0",
      "path": "./dist",
      "condition": "${CI_BRANCH} === 'main'"
    }
  ]
}
```

### 自定义发布脚本

```javascript
const ConfigPublisher = require("npm-config-publisher");

const publisher = new ConfigPublisher("custom-config.json");

// 自定义发布逻辑
publisher.publish().then((results) => {
  console.log("发布完成:", results);
});
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个工具！

## 📄 许可证

MIT License
