const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");

/**
 * 发布包到NPM
 */
async function publishToNPM(
  packagePath,
  npmToken,
  registry = "https://registry.npmjs.org/",
  options = {}
) {
  log("开始发布到NPM...");

  try {
    // 在临时目录创建隔离的 npmrc，避免触发 nodemon 重启
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "npm-pub-"));
    const npmrcPath = path.join(tmpDir, ".npmrc");
    const npmrcContent = `//${
      new URL(registry).hostname
    }/:_authToken=${npmToken}`;
    await fs.writeFile(npmrcPath, npmrcContent);

    // 处理选项
    const access = options.access || "public";
    const tag = options.tag ? ` --tag ${options.tag}` : "";
    const dryRun = options.dryRun ? " --dry-run" : "";

    // 执行npm publish
    const command = `npm publish "${packagePath}" --access ${access}${tag}${dryRun}`;
    log(`执行命令: ${command}`);

    const output = execSync(command, {
      encoding: "utf-8",
      env: {
        ...process.env,
        npm_config_loglevel: "error",
        NPM_CONFIG_USERCONFIG: npmrcPath,
        npm_config_registry: registry,
      },
      stdio: "pipe",
    });

    log(`NPM发布成功: ${output}`);

    // 清理临时 npmrc
    await fs.remove(tmpDir);

    return {
      success: true,
      message: "成功发布到NPM",
      registry,
      output: output.trim(),
    };
  } catch (error) {
    log(`NPM发布失败: ${error.message}`);
    // 清理临时目录（若已创建）
    try {
      if (typeof tmpDir === "string") {
        await fs.remove(tmpDir);
      }
    } catch {}

    return {
      success: false,
      message: error.message,
      registry,
    };
  }
}

/**
 * 检查包版本是否已存在于NPM
 */
async function checkVersionExists(packageName, version, registry) {
  try {
    const command = `npm view ${packageName}@${version} version --registry=${registry}`;
    const result = execSync(command, { encoding: "utf-8", stdio: "pipe" });
    return result.trim() === version;
  } catch (error) {
    return false;
  }
}

function log(message) {
  console.log(`[NPMPublisher] ${new Date().toISOString()} - ${message}`);
}

module.exports = { publishToNPM, checkVersionExists };
