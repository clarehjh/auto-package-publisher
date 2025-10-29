const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs-extra");

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
    // 设置NPM token
    const npmrcPath = path.join(__dirname, "../.npmrc");
    const npmrcContent = `//${
      new URL(registry).hostname
    }/:_authToken=${npmToken}`;
    await fs.writeFile(npmrcPath, npmrcContent);

    // 设置NPM registry
    process.env.npm_config_registry = registry;

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
      },
      stdio: "pipe",
    });

    log(`NPM发布成功: ${output}`);

    // 清理.npmrc
    await fs.remove(npmrcPath);

    return {
      success: true,
      message: "成功发布到NPM",
      registry,
      output: output.trim(),
    };
  } catch (error) {
    log(`NPM发布失败: ${error.message}`);

    // 清理.npmrc
    const npmrcPath = path.join(__dirname, "../.npmrc");
    if (await fs.pathExists(npmrcPath)) {
      await fs.remove(npmrcPath);
    }

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
