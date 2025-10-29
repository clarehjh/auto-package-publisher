# 故障排除指南

## 🐛 常见问题

### 1. 发布失败

#### 问题：版本已存在

```
Error: version 1.0.0 already exists
```

**解决方案：**

- 更新版本号：`npm-config-publish version --type patch`
- 或启用跳过选项：`"skipExisting": true`

#### 问题：Token 认证失败

```
Error: 401 Unauthorized
```

**解决方案：**

- 检查 NPM token 是否有效
- 确认 token 有发布权限
- 验证 registry 地址是否正确

#### 问题：包路径不存在

```
Error: Package path does not exist
```

**解决方案：**

- 检查配置文件中的 path 字段
- 确保构建步骤已执行
- 验证相对路径是否正确

### 2. 配置问题

#### 问题：配置文件格式错误

```
Error: Unexpected token in JSON
```

**解决方案：**

- 使用 JSON 验证器检查格式
- 确保所有字符串都有引号
- 检查是否有多余的逗号

#### 问题：环境变量未替换

```
Token: ${NPM_TOKEN}
```

**解决方案：**

- 确认环境变量已设置
- 检查变量名拼写
- 使用 `echo $NPM_TOKEN` 验证

### 3. CI/CD 问题

#### 问题：GitHub Actions 发布失败

```
Error: Process completed with exit code 1
```

**解决方案：**

- 检查 secrets 设置
- 确认工作流权限
- 查看详细日志

#### 问题：权限不足

```
Error: 403 Forbidden
```

**解决方案：**

- 检查 NPM token 权限
- 确认包名符合规范
- 验证 scope 权限

## 🔍 调试技巧

### 1. 启用详细日志

```bash
# 设置调试环境变量
export DEBUG=npm-config-publisher
npm-config-publish publish
```

### 2. 试运行模式

```bash
# 不实际发布，只验证配置
npm-config-publish publish --dry-run
```

### 3. 验证配置

```bash
# 检查配置文件格式
npm-config-publish validate --config publish-config.json
```

### 4. 检查包结构

```bash
# 验证包目录结构
ls -la ./dist/
cat ./dist/package.json
```

## 🛠️ 诊断工具

### 1. 环境检查脚本

创建 `scripts/check-env.js`：

```javascript
const fs = require("fs-extra");
const path = require("path");

async function checkEnvironment() {
  console.log("🔍 环境检查");

  // 检查Node.js版本
  console.log(`Node.js版本: ${process.version}`);

  // 检查NPM版本
  const { execSync } = require("child_process");
  try {
    const npmVersion = execSync("npm --version", { encoding: "utf8" });
    console.log(`NPM版本: ${npmVersion.trim()}`);
  } catch (error) {
    console.log("❌ NPM未安装");
  }

  // 检查环境变量
  console.log(`NPM_TOKEN: ${process.env.NPM_TOKEN ? "已设置" : "未设置"}`);

  // 检查配置文件
  const configPath = "publish-config.json";
  if (await fs.pathExists(configPath)) {
    console.log(`✅ 配置文件存在: ${configPath}`);
    const config = await fs.readJson(configPath);
    console.log(`包数量: ${config.packages?.length || 0}`);
  } else {
    console.log(`❌ 配置文件不存在: ${configPath}`);
  }
}

checkEnvironment().catch(console.error);
```

### 2. 网络连接测试

```bash
# 测试NPM仓库连接
curl -I https://registry.npmjs.org/

# 测试认证
npm whoami --registry https://registry.npmjs.org/
```

### 3. 包验证脚本

创建 `scripts/validate-package.js`：

```javascript
const fs = require("fs-extra");
const path = require("path");

async function validatePackage(packagePath) {
  console.log(`🔍 验证包: ${packagePath}`);

  // 检查路径存在
  if (!(await fs.pathExists(packagePath))) {
    throw new Error(`包路径不存在: ${packagePath}`);
  }

  // 检查package.json
  const packageJsonPath = path.join(packagePath, "package.json");
  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error("缺少package.json文件");
  }

  // 读取package.json
  const packageJson = await fs.readJson(packageJsonPath);

  // 验证必需字段
  const requiredFields = ["name", "version"];
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      throw new Error(`package.json缺少${field}字段`);
    }
  }

  console.log(`✅ 包验证通过: ${packageJson.name}@${packageJson.version}`);
}

// 使用示例
const packagePath = process.argv[2] || "./dist";
validatePackage(packagePath).catch(console.error);
```

## 📋 检查清单

### 发布前检查

- [ ] 配置文件格式正确
- [ ] 所有包路径存在
- [ ] package.json 文件完整
- [ ] NPM token 有效
- [ ] 版本号符合语义化版本
- [ ] 包名符合 NPM 规范
- [ ] 构建产物完整

### CI/CD 检查

- [ ] 工作流文件语法正确
- [ ] Secrets 已配置
- [ ] 触发条件设置正确
- [ ] 环境变量已设置
- [ ] 权限配置正确

## 🆘 获取帮助

### 1. 查看日志

```bash
# 保存详细日志
npm-config-publish publish 2>&1 | tee publish.log
```

### 2. 社区支持

- GitHub Issues: 报告 bug 和功能请求
- 文档: 查看完整的使用指南
- 示例: 参考 examples 目录中的配置

### 3. 常见错误码

| 错误码 | 说明         | 解决方案         |
| ------ | ------------ | ---------------- |
| 400    | 请求格式错误 | 检查配置文件格式 |
| 401    | 认证失败     | 检查 NPM token   |
| 403    | 权限不足     | 检查包权限设置   |
| 409    | 版本冲突     | 更新版本号或跳过 |

## 🔧 高级调试

### 1. 自定义日志

```javascript
const ConfigPublisher = require("npm-config-publisher");

class CustomPublisher extends ConfigPublisher {
  log(message, color = "white") {
    const timestamp = new Date().toISOString();
    const logMessage = `[CUSTOM] [${timestamp}] ${message}`;
    console.log(logMessage);

    // 写入日志文件
    require("fs").appendFileSync("custom.log", logMessage + "\n");
  }
}

const publisher = new CustomPublisher("publish-config.json");
publisher.publish();
```

### 2. 网络代理设置

```bash
# 设置代理
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# 或使用npm配置
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

### 3. 自定义 registry

```json
{
  "packages": [
    {
      "name": "my-package",
      "version": "1.0.0",
      "path": "./dist",
      "registry": "https://npm.pkg.github.com/"
    }
  ],
  "auth": {
    "npm": {
      "token": "${GITHUB_TOKEN}"
    }
  }
}
```
