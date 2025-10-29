# CI/CD 集成指南

## 🚀 GitHub Actions

### 基本配置

1. **创建工作流文件**

将 `templates/github-actions.yml` 复制到 `.github/workflows/publish.yml`

2. **配置发布文件**

创建 `.github/publish-config.json`：

```json
{
  "packages": [
    {
      "name": "my-package",
      "version": "1.0.0",
      "path": "./dist",
      "registry": "https://registry.npmjs.org/",
      "access": "public"
    }
  ],
  "auth": {
    "npm": {
      "token": "${NPM_TOKEN}"
    }
  }
}
```

3. **设置密钥**

在 GitHub 仓库设置中添加 `NPM_TOKEN` 密钥

4. **触发发布**

```bash
# 创建标签
git tag v1.0.0
git push origin v1.0.0
```

### Monorepo 配置

对于包含多个包的 monorepo 项目，使用 `templates/github-actions-monorepo.yml`：

```yaml
# .github/workflows/publish-monorepo.yml
name: Publish Monorepo Packages

on:
  push:
    tags:
      - "v*"

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.changes.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect changed packages
        id: changes
        run: |
          # 检测变更的包
          CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)
          CHANGED_PACKAGES=""

          for package in packages/*/; do
            package_name=$(basename "$package")
            if echo "$CHANGED_FILES" | grep -q "^packages/$package_name/"; then
              CHANGED_PACKAGES="$CHANGED_PACKAGES $package_name"
            fi
          done

          echo "packages=$CHANGED_PACKAGES" >> $GITHUB_OUTPUT

  publish:
    runs-on: ubuntu-latest
    needs: detect-changes
    if: needs.detect-changes.outputs.packages != ''
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Install npm-config-publisher
        run: npm install -g npm-config-publisher

      - name: Generate publish config
        run: |
          # 根据变更的包生成发布配置
          CHANGED_PACKAGES="${{ needs.detect-changes.outputs.packages }}"
          echo "{" > .github/publish-config.json
          echo '  "packages": [' >> .github/publish-config.json

          first=true
          for package in $CHANGED_PACKAGES; do
            if [ "$first" = true ]; then
              first=false
            else
              echo "," >> .github/publish-config.json
            fi
            
            echo "    {" >> .github/publish-config.json
            echo "      \"name\": \"@myorg/$package\"," >> .github/publish-config.json
            echo "      \"version\": \"$(node -p \"require('./packages/$package/package.json').version\")\"," >> .github/publish-config.json
            echo "      \"path\": \"./packages/$package/dist\"," >> .github/publish-config.json
            echo "      \"registry\": \"https://registry.npmjs.org/\"," >> .github/publish-config.json
            echo "      \"access\": \"public\"" >> .github/publish-config.json
            echo "    }" >> .github/publish-config.json
          done

          echo "  ]," >> .github/publish-config.json
          echo '  "auth": {" >> .github/publish-config.json
          echo '    "npm": {" >> .github/publish-config.json
          echo '      "token": "${NPM_TOKEN}"' >> .github/publish-config.json
          echo '    }' >> .github/publish-config.json
          echo '  }' >> .github/publish-config.json
          echo "}" >> .github/publish-config.json

      - name: Publish to NPM
        run: npm-config-publish publish --config .github/publish-config.json
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🔧 GitLab CI

### 基本配置

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - publish

variables:
  NODE_VERSION: "18"

build:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run test
  dependencies:
    - build

publish:
  stage: publish
  image: node:${NODE_VERSION}
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

### 配置文件

创建 `.gitlab/publish-config.json`：

```json
{
  "packages": [
    {
      "name": "my-package",
      "version": "1.0.0",
      "path": "./dist",
      "registry": "https://registry.npmjs.org/",
      "access": "public"
    }
  ],
  "auth": {
    "npm": {
      "token": "${NPM_TOKEN}"
    }
  }
}
```

## 🐳 Docker 集成

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装npm-config-publisher
RUN npm install -g npm-config-publisher

# 复制项目文件
COPY package*.json ./
RUN npm ci

COPY . .

# 构建项目
RUN npm run build

# 复制发布配置
COPY publish-config.json ./

# 设置入口点
ENTRYPOINT ["npm-config-publish", "publish"]
```

### Docker Compose

```yaml
version: "3.8"

services:
  publisher:
    build: .
    environment:
      - NPM_TOKEN=${NPM_TOKEN}
    volumes:
      - ./publish-config.json:/app/publish-config.json
```

## 🔄 Jenkins 集成

### Jenkinsfile

```groovy
pipeline {
    agent any

    environment {
        NPM_TOKEN = credentials('npm-token')
    }

    stages {
        stage('Build') {
            steps {
                sh 'npm ci'
                sh 'npm run build'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test'
            }
        }

        stage('Publish') {
            when {
                tag pattern: "v\\d+\\.\\d+\\.\\d+", comparator: "REGEXP"
            }
            steps {
                sh 'npm install -g npm-config-publisher'
                sh 'npm-config-publish publish --config publish-config.json'
            }
        }
    }

    post {
        success {
            echo '发布成功!'
        }
        failure {
            echo '发布失败!'
        }
    }
}
```

## 🚀 Azure DevOps

### azure-pipelines.yml

```yaml
trigger:
  tags:
    include:
      - v*

pool:
  vmImage: "ubuntu-latest"

variables:
  nodeVersion: "18.x"

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
            displayName: "Install Node.js"

          - script: |
              npm ci
              npm run build
            displayName: "Build"

          - script: |
              npm run test
            displayName: "Test"

  - stage: Publish
    dependsOn: Build
    condition: startsWith(variables['Build.SourceBranch'], 'refs/tags/')
    jobs:
      - job: PublishJob
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
            displayName: "Install Node.js"

          - script: |
              npm install -g npm-config-publisher
              npm-config-publish publish --config publish-config.json
            displayName: "Publish to NPM"
            env:
              NPM_TOKEN: $(NPM_TOKEN)
```

## 🔐 安全最佳实践

### 1. Token 管理

- 使用最小权限原则
- 定期轮换 token
- 不要在代码中硬编码 token

### 2. 环境隔离

```yaml
# 不同环境使用不同的配置
env:
  NPM_REGISTRY: "https://registry.npmjs.org/" # 生产环境
  # NPM_REGISTRY: "https://npm.pkg.github.com/"  # 私有仓库
```

### 3. 条件发布

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

## 📊 监控和日志

### 发布通知

```yaml
- name: Notify on success
  if: success()
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"✅ Package published successfully!"}' \
      $SLACK_WEBHOOK_URL

- name: Notify on failure
  if: failure()
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"❌ Package publish failed!"}' \
      $SLACK_WEBHOOK_URL
```

### 发布历史

```bash
# 保存发布历史
npm-config-publish publish --config publish-config.json 2>&1 | tee publish-$(date +%Y%m%d-%H%M%S).log
```
