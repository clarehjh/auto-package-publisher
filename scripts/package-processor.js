const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const { execSync } = require("child_process");
const unzipper = require("unzipper");

/**
 * 处理上传的包文件，解压、验证、准备发布
 */
async function processPackage(filePath, uploadId, options) {
  const { packageName, version, githubRepo, npmRegistry } = options;
  const processedPath = path.join(__dirname, "../processed", uploadId);

  await fs.ensureDir(processedPath);

  try {
    // 检测文件类型
    const ext = path.extname(filePath);
    log(`检测到文件类型: ${ext}`);

    let releasePath;

    // 如果已经是.tgz格式，需要验证和重命名
    if (ext === ".tgz" || ext === ".tar.gz") {
      log("检测到.tgz文件");

      // 验证.tgz文件结构
      const isValidTGZ = await validateTGZStructure(filePath);

      // 总是解包并重打包，确保内置 name/version 与参数一致
      const extractedPath = path.join(processedPath, "extracted");
      await fs.ensureDir(extractedPath);

      let needRepack = true;

      if (isValidTGZ) {
        try {
          execSync(`tar -xzf "${filePath}" -C "${extractedPath}"`, {
            stdio: "ignore",
          });
        } catch {
          needRepack = true;
        }

        // 读取解包后的 package.json 做比对
        if (!needRepack) {
          let pkgDir = extractedPath;
          const files = await fs.readdir(extractedPath);
          for (const file of files) {
            const fullPath = path.join(extractedPath, file);
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory() && (file === "package" || true)) {
              const pj = path.join(fullPath, "package.json");
              if (await fs.pathExists(pj)) {
                pkgDir = fullPath;
                break;
              }
            }
          }

          const pjPath = path.join(pkgDir, "package.json");
          if (await fs.pathExists(pjPath)) {
            const pj = await fs.readJson(pjPath);
            if (pj.name !== packageName || pj.version !== version) {
              needRepack = true;
              await updatePackageJson(
                pjPath,
                packageName,
                version,
                options?.npmRegistry ||
                  options?.registry ||
                  options?.npmRegistry,
                options?.githubRepo
              );
            }
          } else {
            needRepack = true;
            await createDefaultPackageJson(
              pkgDir,
              packageName,
              version,
              options
            );
          }
        }
      }

      if (needRepack) {
        if (!(await fs.pathExists(extractedPath))) {
          await fs.ensureDir(extractedPath);
        }
        // 若未成功解包，再次尝试解包；若仍失败，直接抛错让上层感知
        try {
          execSync(`tar -xzf "${filePath}" -C "${extractedPath}"`, {
            stdio: "ignore",
          });
        } catch (e) {
          log(`.tgz 解包失败: ${e.message}`);
        }

        // 查找实际源码目录
        const files2 = await fs.readdir(extractedPath);
        let actualSourceDir = extractedPath;
        for (const f of files2) {
          const fullPath = path.join(extractedPath, f);
          const stats = await fs.stat(fullPath);
          if (stats.isDirectory()) {
            const pj = path.join(fullPath, "package.json");
            if (await fs.pathExists(pj)) {
              actualSourceDir = fullPath;
              break;
            }
          }
        }

        const packageJsonPath = path.join(actualSourceDir, "package.json");
        if (!(await fs.pathExists(packageJsonPath))) {
          await createDefaultPackageJson(
            actualSourceDir,
            packageName,
            version,
            options
          );
        } else {
          await updatePackageJson(
            packageJsonPath,
            packageName,
            version,
            options?.npmRegistry || options?.registry || options?.npmRegistry,
            options?.githubRepo
          );
        }

        releasePath = await createReleasePackage(
          actualSourceDir,
          packageName,
          version
        );
      } else {
        // 版本与名称一致，直接复制重命名
        const destPath = path.join(
          __dirname,
          "../processed",
          `${packageName}-${version}.tgz`
        );
        await fs.copy(filePath, destPath);
        releasePath = destPath;
      }
    } else if (ext === ".zip") {
      log("检测到.zip文件");

      // 解压zip文件
      const extractedPath = path.join(processedPath, "extracted");
      await fs.ensureDir(extractedPath);

      await extractZip(filePath, extractedPath);

      // 查找提取后的文件
      const files = await fs.readdir(extractedPath);
      let actualSourceDir = extractedPath;

      // 如果已经包含了package目录，使用它，否则创建
      for (const file of files) {
        const fullPath = path.join(extractedPath, file);
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          const testPackageJson = path.join(fullPath, "package.json");
          if (await fs.pathExists(testPackageJson)) {
            actualSourceDir = fullPath;
            break;
          }
        }
      }

      // 创建/更新 package.json，确保与参数一致
      const packageJsonPath = path.join(actualSourceDir, "package.json");
      if (!(await fs.pathExists(packageJsonPath))) {
        await createDefaultPackageJson(
          actualSourceDir,
          packageName,
          version,
          options
        );
      } else {
        await updatePackageJson(
          packageJsonPath,
          packageName,
          version,
          options?.npmRegistry || options?.registry || options?.npmRegistry,
          options?.githubRepo
        );
      }

      // 重新打包为.tgz
      releasePath = await createReleasePackage(
        actualSourceDir,
        packageName,
        version
      );
    } else {
      // 对于其他文件，需要创建包结构
      const sourceDir = path.join(processedPath, "package");
      await fs.ensureDir(sourceDir);

      // 如果文件很小，尝试直接复制
      const stats = await fs.stat(filePath);
      if (stats.size < 1024 * 1024) {
        // 小于1MB
        await fs.copy(filePath, path.join(sourceDir, path.basename(filePath)));
      }

      // 创建package.json
      await createDefaultPackageJson(sourceDir, packageName, version, options);

      // 创建发布版本
      releasePath = await createReleasePackage(sourceDir, packageName, version);
    }

    return {
      path: releasePath,
      packageName,
      version,
      uploadId,
    };
  } catch (error) {
    await fs.remove(processedPath);
    throw error;
  }
}

/**
 * 解压zip文件
 */
async function extractZip(filePath, extractTo) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(unzipper.Extract({ path: extractTo }))
      .on("close", resolve)
      .on("error", reject);
  });
}

/**
 * 验证.tgz文件结构是否正确
 */
async function validateTGZStructure(filePath) {
  try {
    const tempDir = path.join(__dirname, "../processed", "temp_validation");
    await fs.ensureDir(tempDir);
    await fs.emptyDir(tempDir);

    // 尝试解压
    execSync(`tar -xzf "${filePath}" -C "${tempDir}"`, { stdio: "ignore" });

    // 检查是否有package目录和package.json
    const files = await fs.readdir(tempDir);
    let hasValidStructure = false;

    for (const file of files) {
      const fullPath = path.join(tempDir, file);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory() && file === "package") {
        const packageJsonPath = path.join(fullPath, "package.json");
        if (await fs.pathExists(packageJsonPath)) {
          hasValidStructure = true;
          break;
        }
      }
    }

    await fs.remove(tempDir);
    return hasValidStructure;
  } catch (error) {
    log(`验证.tgz结构失败: ${error.message}`);
    return false;
  }
}

/**
 * 查找package.json文件
 */
async function findPackageJson(dir) {
  if (!(await fs.pathExists(dir))) {
    return null;
  }

  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      const found = await findPackageJson(fullPath);
      if (found) return found;
    } else if (file.name === "package.json") {
      return fullPath;
    }
  }
  return null;
}

/**
 * 创建默认的package.json
 */
async function createDefaultPackageJson(dir, packageName, version, options) {
  const packageJson = {
    name: packageName,
    version: version,
    description: `Auto-published package - ${packageName}`,
    main: "index.js",
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
    },
    keywords: [],
    author: "",
    license: "MIT",
  };

  if (options.githubRepo) {
    packageJson.repository = {
      type: "git",
      url: `git+https://github.com/${options.githubRepo}.git`,
    };
  }

  const packagePath = path.join(dir, "package.json");
  await fs.writeJson(packagePath, packageJson, { spaces: 2 });
  log(`已创建package.json`);
  return packagePath;
}

/**
 * 更新package.json
 */
async function updatePackageJson(
  packagePath,
  packageName,
  version,
  npmRegistry,
  githubRepo
) {
  const packageJson = await fs.readJson(packagePath);

  // 更新基本信息
  packageJson.name = packageName;
  packageJson.version = version;

  // 确保有publishConfig
  if (!packageJson.publishConfig) {
    packageJson.publishConfig = {};
  }
  packageJson.publishConfig.registry = npmRegistry;

  // 更新 repository（若有提供）
  if (githubRepo) {
    packageJson.repository = {
      type: "git",
      url: `git+https://github.com/${githubRepo}.git`,
    };
    packageJson.bugs = {
      url: `https://github.com/${githubRepo}/issues`,
    };
    packageJson.homepage = `https://github.com/${githubRepo}#readme`;
  }

  await fs.writeJson(packagePath, packageJson, { spaces: 2 });
  log(`已更新package.json: ${packageName}@${version}`);
}

/**
 * 验证包结构
 */
async function validatePackage(dir) {
  const packageJsonPath = path.join(dir, "package.json");

  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error("缺少package.json文件");
  }

  const packageJson = await fs.readJson(packageJsonPath);

  if (!packageJson.name) {
    throw new Error("package.json缺少name字段");
  }

  if (!packageJson.version) {
    throw new Error("package.json缺少version字段");
  }

  log("包结构验证通过");
}

/**
 * 创建发布包（.tgz格式）
 */
async function createReleasePackage(sourceDir, packageName, version) {
  const outputPath = path.join(
    __dirname,
    "../processed",
    `${packageName}-${version}.tgz`
  );

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("tar", {
      gzip: true,
      gzipOptions: { level: 9 },
    });

    output.on("close", () => {
      log(`发布包创建成功: ${outputPath} (${archive.pointer()} bytes)`);
      resolve(outputPath);
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);
    // 将sourceDir的内容打包到archive中的'package'目录
    archive.directory(sourceDir, "package");
    archive.finalize();
  });
}

function log(message) {
  console.log(`[PackageProcessor] ${new Date().toISOString()} - ${message}`);
}

module.exports = { processPackage };
