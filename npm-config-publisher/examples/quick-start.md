# 快速开始示例

## 📦 单包发布

### 1. 创建项目结构

```
my-package/
├── src/
│   └── index.js
├── dist/
│   ├── index.js
│   └── package.json
├── package.json
└── publish-config.json
```

### 2. 初始化配置

```bash
cd my-package
npm-config-publish init
```

### 3. 编辑配置

`publish-config.json`:

```json
{
  "packages": [
    {
      "name": "my-awesome-package",
      "version": "1.0.0",
      "path": "./dist",
      "registry": "https://registry.npmjs.org/",
      "access": "public",
      "tag": "latest"
    }
  ],
  "auth": {
    "npm": {
      "token": "${NPM_TOKEN}"
    }
  },
  "options": {
    "dryRun": false,
    "skipExisting": true
  }
}
```

### 4. 设置环境变量

```bash
export NPM_TOKEN=your_npm_token_here
```

### 5. 发布

```bash
npm-config-publish publish
```

## 🏢 Monorepo 发布

### 1. 项目结构

```
monorepo/
├── packages/
│   ├── ui/
│   │   ├── src/
│   │   ├── dist/
│   │   └── package.json
│   ├── utils/
│   │   ├── src/
│   │   ├── dist/
│   │   └── package.json
│   └── core/
│       ├── src/
│       ├── dist/
│       └── package.json
├── package.json
└── publish-config.json
```

### 2. 配置多包发布

`publish-config.json`:

```json
{
  "packages": [
    {
      "name": "@myorg/ui",
      "version": "1.2.3",
      "path": "./packages/ui/dist",
      "registry": "https://registry.npmjs.org/",
      "access": "public",
      "tag": "latest"
    },
    {
      "name": "@myorg/utils",
      "version": "2.0.1",
      "path": "./packages/utils/dist",
      "registry": "https://registry.npmjs.org/",
      "access": "public",
      "tag": "latest"
    },
    {
      "name": "@myorg/core",
      "version": "3.1.0",
      "path": "./packages/core/dist",
      "registry": "https://registry.npmjs.org/",
      "access": "restricted",
      "tag": "latest"
    }
  ],
  "auth": {
    "npm": {
      "token": "${NPM_TOKEN}"
    }
  },
  "options": {
    "dryRun": false,
    "skipExisting": true,
    "parallel": false
  }
}
```

### 3. 批量发布

```bash
# 发布所有包
npm-config-publish publish

# 试运行
npm-config-publish publish --dry-run
```

## 🔄 CI/CD 示例

### GitHub Actions

`.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Install npm-config-publisher
        run: npm install -g npm-config-publisher

      - name: Publish
        run: npm-config-publish publish --config .github/publish-config.json
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### GitLab CI

`.gitlab-ci.yml`:

```yaml
stages:
  - build
  - publish

build:
  stage: build
  image: node:18
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

publish:
  stage: publish
  image: node:18
  script:
    - npm install -g npm-config-publisher
    - npm-config-publish publish --config .gitlab/publish-config.json
  dependencies:
    - build
  only:
    - tags
  variables:
    NPM_TOKEN: $NPM_TOKEN
```

## 🎯 高级用法

### 1. 条件发布

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

### 2. 自定义钩子

```json
{
  "packages": [
    {
      "name": "my-package",
      "version": "1.0.0",
      "path": "./dist"
    }
  ],
  "hooks": {
    "prePublish": "npm run build && npm run test",
    "postPublish": "npm run deploy"
  }
}
```

### 3. 版本自动递增

```bash
# 自动递增版本
npm-config-publish version --type patch
npm-config-publish version --type minor
npm-config-publish version --type major
```

### 4. 私有仓库发布

```json
{
  "packages": [
    {
      "name": "@myorg/private-package",
      "version": "1.0.0",
      "path": "./dist",
      "registry": "https://npm.pkg.github.com/",
      "access": "restricted"
    }
  ],
  "auth": {
    "npm": {
      "token": "${GITHUB_TOKEN}"
    }
  }
}
```

## 🔧 自定义脚本

### 1. 发布脚本

`scripts/publish.js`:

```javascript
const ConfigPublisher = require("npm-config-publisher");

async function publish() {
  const publisher = new ConfigPublisher("publish-config.json");

  try {
    const results = await publisher.publish();

    // 自定义后处理
    const successful = results.filter((r) => r.success);
    console.log(`成功发布 ${successful.length} 个包`);

    // 发送通知
    if (process.env.SLACK_WEBHOOK) {
      await sendSlackNotification(successful);
    }
  } catch (error) {
    console.error("发布失败:", error.message);
    process.exit(1);
  } finally {
    await publisher.cleanup();
  }
}

async function sendSlackNotification(packages) {
  const message = packages.map((p) => `✅ ${p.name}@${p.version}`).join("\n");
  // 发送Slack通知的逻辑
}

publish();
```

### 2. 构建和发布

`package.json`:

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "publish": "npm run build && npm-config-publish publish",
    "publish:dry": "npm run build && npm-config-publish publish --dry-run"
  }
}
```

## 📊 监控和日志

### 1. 发布日志

```bash
# 保存发布日志
npm-config-publish publish 2>&1 | tee publish-$(date +%Y%m%d-%H%M%S).log
```

### 2. 发布状态检查

```bash
# 检查包是否已发布
npm view my-package@1.0.0 version
```

### 3. 发布历史

```bash
# 查看发布历史
npm view my-package versions --json
```

## 🚀 最佳实践

### 1. 版本管理

- 使用语义化版本号
- 在发布前更新版本号
- 使用标签区分不同版本

### 2. 安全

- 使用环境变量存储敏感信息
- 定期轮换 NPM token
- 使用最小权限原则

### 3. 测试

- 发布前进行充分测试
- 使用试运行模式验证
- 在测试环境先验证

### 4. 监控

- 监控发布状态
- 记录发布日志
- 设置失败通知
