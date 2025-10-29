# 环境变量配置

## 🔐 必需的环境变量

### NPM_TOKEN

NPM 访问令牌，用于发布包到 NPM 仓库。

```bash
export NPM_TOKEN=your_npm_token_here
```

**获取方式：**

1. 访问 [NPM 设置页面](https://www.npmjs.com/settings)
2. 进入 "Access Tokens"
3. 创建 "Automation" 或 "Publish" token
4. 复制生成的 token

## 🌐 可选的环境变量

### NPM_REGISTRY

NPM 仓库地址，默认为官方仓库。

```bash
export NPM_REGISTRY=https://registry.npmjs.org/
```

**常用仓库：**

- 官方仓库：`https://registry.npmjs.org/`
- GitHub Packages：`https://npm.pkg.github.com/`
- 私有仓库：`https://your-private-registry.com/`

### GITHUB_TOKEN

GitHub 访问令牌，用于发布到 GitHub Packages。

```bash
export GITHUB_TOKEN=your_github_token_here
```

### CI_BRANCH

CI 环境中的分支名称，用于条件发布。

```bash
export CI_BRANCH=main
```

### CI_TAG

CI 环境中的标签名称，用于版本发布。

```bash
export CI_TAG=v1.0.0
```

## 🔧 配置文件示例

### 使用环境变量

```json
{
  "packages": [
    {
      "name": "my-package",
      "version": "1.0.0",
      "path": "./dist",
      "registry": "${NPM_REGISTRY}",
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

## 🐳 Docker 环境变量

### Dockerfile

```dockerfile
FROM node:18-alpine

# 设置环境变量
ENV NPM_REGISTRY=https://registry.npmjs.org/

# 安装npm-config-publisher
RUN npm install -g npm-config-publisher

WORKDIR /app
COPY . .

# 使用环境变量
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
      - NPM_REGISTRY=${NPM_REGISTRY}
    volumes:
      - ./publish-config.json:/app/publish-config.json
```

## 🔄 CI/CD 环境变量

### GitHub Actions

```yaml
env:
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  NPM_REGISTRY: ${{ secrets.NPM_REGISTRY }}
```

### GitLab CI

```yaml
variables:
  NPM_TOKEN: $NPM_TOKEN
  NPM_REGISTRY: $NPM_REGISTRY
```

### Jenkins

```groovy
environment {
    NPM_TOKEN = credentials('npm-token')
    NPM_REGISTRY = 'https://registry.npmjs.org/'
}
```

## 🛡️ 安全最佳实践

### 1. 不要硬编码敏感信息

❌ **错误做法：**

```json
{
  "auth": {
    "npm": {
      "token": "npm_xxxxxxxxxxxxxxxxxxxxxxxx"
    }
  }
}
```

✅ **正确做法：**

```json
{
  "auth": {
    "npm": {
      "token": "${NPM_TOKEN}"
    }
  }
}
```

### 2. 使用最小权限

- 使用 "Automation" token 而不是 "Publish" token
- 限制 token 的访问范围
- 定期轮换 token

### 3. 环境隔离

```bash
# 开发环境
export NPM_REGISTRY=https://registry.npmjs.org/
export NPM_TOKEN=dev_token_here

# 生产环境
export NPM_REGISTRY=https://registry.npmjs.org/
export NPM_TOKEN=prod_token_here
```

## 🔍 调试环境变量

### 1. 检查环境变量

```bash
# 检查所有环境变量
env | grep NPM

# 检查特定变量
echo $NPM_TOKEN
echo $NPM_REGISTRY
```

### 2. 验证 token

```bash
# 验证NPM token
npm whoami --registry https://registry.npmjs.org/

# 验证GitHub token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### 3. 测试连接

```bash
# 测试NPM仓库连接
curl -I $NPM_REGISTRY

# 测试认证
npm ping --registry $NPM_REGISTRY
```

## 📝 .env 文件

### 创建 .env 文件

```bash
# .env
NPM_TOKEN=your_npm_token_here
NPM_REGISTRY=https://registry.npmjs.org/
GITHUB_TOKEN=your_github_token_here
CI_BRANCH=main
```

### 加载 .env 文件

```javascript
require("dotenv").config();

// 现在可以使用环境变量
console.log(process.env.NPM_TOKEN);
```

### .env 文件安全

```bash
# .gitignore
.env
.env.local
.env.production
```

## 🔧 高级配置

### 1. 多环境配置

```bash
# .env.development
NPM_REGISTRY=https://registry.npmjs.org/
NPM_TOKEN=dev_token_here

# .env.production
NPM_REGISTRY=https://registry.npmjs.org/
NPM_TOKEN=prod_token_here
```

### 2. 动态配置

```javascript
const config = {
  packages: [
    {
      name: "my-package",
      version: process.env.PACKAGE_VERSION || "1.0.0",
      path: "./dist",
      registry: process.env.NPM_REGISTRY || "https://registry.npmjs.org/",
    },
  ],
  auth: {
    npm: {
      token: process.env.NPM_TOKEN,
    },
  },
};
```

### 3. 条件环境变量

```bash
# 根据分支设置不同的registry
if [ "$CI_BRANCH" = "main" ]; then
  export NPM_REGISTRY=https://registry.npmjs.org/
else
  export NPM_REGISTRY=https://npm.pkg.github.com/
fi
```
