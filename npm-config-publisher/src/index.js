const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const { execSync } = require("child_process");
const semver = require("semver");

/**
 * 配置化NPM发布器主类
 */
class ConfigPublisher {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
    this.results = [];
  }

  /**
   * 加载配置文件
   */
  async loadConfig() {
    try {
      if (!(await fs.pathExists(this.configPath))) {
        throw new Error(`配置文件不存在: ${this.configPath}`);
      }

      const configContent = await fs.readFile(this.configPath, "utf8");
      this.config = JSON.parse(configContent);

      // 处理环境变量替换
      this.config = this.replaceEnvVars(this.config);

      this.log("配置加载成功", "green");
      return this.config;
    } catch (error) {
      this.log(`配置加载失败: ${error.message}`, "red");
      throw error;
    }
  }

  /**
   * 替换配置中的环境变量
   */
  replaceEnvVars(obj) {
    if (typeof obj === "string") {
      return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return process.env[varName] || match;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceEnvVars(item));
    }

    if (obj && typeof obj === "object") {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceEnvVars(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * 验证配置
   */
  validateConfig() {
    if (!this.config) {
      throw new Error("配置未加载");
    }

    if (!this.config.packages || !Array.isArray(this.config.packages)) {
      throw new Error("配置中缺少packages数组");
    }

    for (const pkg of this.config.packages) {
      if (!pkg.name) {
        throw new Error("包配置中缺少name字段");
      }
      if (!pkg.version) {
        throw new Error("包配置中缺少version字段");
      }
      if (!pkg.path) {
        throw new Error("包配置中缺少path字段");
      }
    }

    this.log("配置验证通过", "green");
  }

  /**
   * 执行发布流程
   */
  async publish() {
    try {
      await this.loadConfig();
      this.validateConfig();

      this.log(`开始发布 ${this.config.packages.length} 个包`, "blue");

      for (const pkg of this.config.packages) {
        await this.publishPackage(pkg);
      }

      this.printSummary();
      return this.results;
    } catch (error) {
      this.log(`发布失败: ${error.message}`, "red");
      throw error;
    }
  }

  /**
   * 发布单个包
   */
  async publishPackage(pkgConfig) {
    const startTime = Date.now();
    this.log(`\n📦 发布包: ${pkgConfig.name}@${pkgConfig.version}`, "cyan");

    try {
      // 检查包路径
      const packagePath = path.resolve(pkgConfig.path);
      if (!(await fs.pathExists(packagePath))) {
        throw new Error(`包路径不存在: ${packagePath}`);
      }

      // 检查package.json
      const packageJsonPath = path.join(packagePath, "package.json");
      if (!(await fs.pathExists(packageJsonPath))) {
        throw new Error("包路径中缺少package.json文件");
      }

      // 读取并验证package.json
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.name !== pkgConfig.name) {
        this.log(
          `警告: package.json中的name (${packageJson.name}) 与配置中的name (${pkgConfig.name}) 不匹配`,
          "yellow"
        );
      }

      // 更新版本号
      if (packageJson.version !== pkgConfig.version) {
        packageJson.version = pkgConfig.version;
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        this.log(`已更新package.json版本为: ${pkgConfig.version}`, "green");
      }

      // 设置NPM认证
      await this.setupNpmAuth(pkgConfig);

      // 执行发布
      const publishResult = await this.executePublish(packagePath, pkgConfig);

      const duration = Date.now() - startTime;
      const result = {
        name: pkgConfig.name,
        version: pkgConfig.version,
        success: true,
        duration,
        registry: pkgConfig.registry || "https://registry.npmjs.org/",
        ...publishResult,
      };

      this.results.push(result);
      this.log(
        `✅ ${pkgConfig.name}@${pkgConfig.version} 发布成功 (${duration}ms)`,
        "green"
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        name: pkgConfig.name,
        version: pkgConfig.version,
        success: false,
        error: error.message,
        duration,
      };

      this.results.push(result);
      this.log(
        `❌ ${pkgConfig.name}@${pkgConfig.version} 发布失败: ${error.message}`,
        "red"
      );
    }
  }

  /**
   * 设置NPM认证
   */
  async setupNpmAuth(pkgConfig) {
    const registry = pkgConfig.registry || "https://registry.npmjs.org/";
    const token = this.config.auth?.npm?.token;

    if (!token) {
      throw new Error("NPM token未配置");
    }

    // 创建.npmrc文件
    const npmrcPath = path.join(process.cwd(), ".npmrc");
    const npmrcContent = `//${new URL(registry).hostname}/:_authToken=${token}`;

    await fs.writeFile(npmrcPath, npmrcContent);

    // 设置环境变量
    process.env.npm_config_registry = registry;

    this.log(`已设置NPM认证 (registry: ${registry})`, "green");
  }

  /**
   * 执行NPM发布
   */
  async executePublish(packagePath, pkgConfig) {
    const registry = pkgConfig.registry || "https://registry.npmjs.org/";
    const access = pkgConfig.access || "public";
    const tag = pkgConfig.tag || "latest";

    const command = `npm publish "${packagePath}" --registry="${registry}" --access="${access}" --tag="${tag}"`;

    this.log(`执行命令: ${command}`, "gray");

    try {
      const output = execSync(command, {
        encoding: "utf-8",
        stdio: "pipe",
        cwd: process.cwd(),
      });

      return {
        output: output.trim(),
        command,
      };
    } catch (error) {
      // 检查是否是版本已存在的错误
      if (error.message.includes("cannot be republished until 24 hours")) {
        throw new Error(
          "该版本已在24小时内发布过，请等待24小时后重试或发布新版本"
        );
      }

      if (error.message.includes("version already exists")) {
        if (this.config.options?.skipExisting) {
          this.log(`版本 ${pkgConfig.version} 已存在，跳过发布`, "yellow");
          return { skipped: true, reason: "version_exists" };
        }
        throw new Error(`版本 ${pkgConfig.version} 已存在`);
      }

      throw error;
    }
  }

  /**
   * 打印发布摘要
   */
  printSummary() {
    this.log("\n📊 发布摘要", "blue");
    this.log("=".repeat(50), "gray");

    const successful = this.results.filter((r) => r.success);
    const failed = this.results.filter((r) => !r.success);
    const skipped = this.results.filter((r) => r.skipped);

    this.log(`✅ 成功: ${successful.length}`, "green");
    this.log(`❌ 失败: ${failed.length}`, "red");
    this.log(`⏭️  跳过: ${skipped.length}`, "yellow");

    if (successful.length > 0) {
      this.log("\n成功发布的包:", "green");
      successful.forEach((result) => {
        this.log(
          `  • ${result.name}@${result.version} (${result.duration}ms)`,
          "green"
        );
      });
    }

    if (failed.length > 0) {
      this.log("\n失败的包:", "red");
      failed.forEach((result) => {
        this.log(
          `  • ${result.name}@${result.version}: ${result.error}`,
          "red"
        );
      });
    }

    if (skipped.length > 0) {
      this.log("\n跳过的包:", "yellow");
      skipped.forEach((result) => {
        this.log(
          `  • ${result.name}@${result.version}: ${result.reason}`,
          "yellow"
        );
      });
    }

    this.log("=".repeat(50), "gray");
  }

  /**
   * 清理临时文件
   */
  async cleanup() {
    const npmrcPath = path.join(process.cwd(), ".npmrc");
    if (await fs.pathExists(npmrcPath)) {
      await fs.remove(npmrcPath);
      this.log("已清理临时文件", "gray");
    }
  }

  /**
   * 日志输出
   */
  log(message, color = "white") {
    const timestamp = new Date().toISOString();
    console.log(chalk[color](`[${timestamp}] ${message}`));
  }
}

module.exports = ConfigPublisher;
