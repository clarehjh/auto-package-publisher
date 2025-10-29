const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const { publishToNPM, checkVersionExists } = require("./scripts/npm-publisher");
const { processPackage } = require("./scripts/package-processor");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, "uploads");
const processedDir = path.join(__dirname, "processed");
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(processedDir);

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB限制
});

// 日志函数
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  // 可以在这里添加文件日志记录
};

// 主上传接口
app.post("/api/upload", upload.single("package"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "没有上传文件" });
  }

  const {
    packageName,
    version,
    npmToken,
    githubRepo,
    npmRegistry = "https://registry.npmjs.org/",
    access = "public",
    tag = "",
    dryRun = "false",
    skipExisting = "true",
  } = req.body;

  if (!packageName || !version) {
    return res.status(400).json({
      success: false,
      message: "缺少必要参数：packageName 和 version 是必需的",
    });
  }

  log(
    `收到上传请求: ${req.file.originalname} - 包名: ${packageName} - 版本: ${version}`
  );

  const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 处理包（解压、验证、准备发布文件）
    log("开始处理包...");
    const packageInfo = await processPackage(req.file.path, uploadId, {
      packageName,
      version,
      githubRepo,
      npmRegistry,
    });

    let npmResult = { success: false, message: "" };

    // 发布到NPM
    try {
      log("开始发布到NPM...");

      // 尝试从环境变量或请求中获取 token
      const token =
        npmToken && npmToken !== "环境变量配置"
          ? npmToken
          : process.env.NPM_TOKEN;

      if (!token) {
        throw new Error(
          "NPM token未配置，请在 .env 文件中设置 NPM_TOKEN 或手动提供"
        );
      }

      // 版本存在则可选择跳过
      if (String(skipExisting).toLowerCase() === "true") {
        const exists = await checkVersionExists(
          packageName,
          version,
          npmRegistry
        );
        if (exists) {
          npmResult = {
            success: true,
            message: `版本已存在，已跳过发布: ${packageName}@${version}`,
            skipped: true,
          };
          throw new Error("__skip_publish__");
        }
      }

      npmResult = await publishToNPM(packageInfo.path, token, npmRegistry, {
        access,
        tag,
        dryRun: String(dryRun).toLowerCase() === "true",
      });
      log(`NPM发布结果: ${JSON.stringify(npmResult)}`);
    } catch (error) {
      let errorMessage = error.message;
      if (errorMessage === "__skip_publish__") {
        // 已在上面设置 npmResult
        errorMessage = npmResult.message;
      }

      // 检查是否是24小时重复发布限制
      if (errorMessage.includes("cannot be republished until 24 hours")) {
        errorMessage =
          "该版本已在24小时内发布过，请等待24小时后重试或发布新版本";
      }

      if (!npmResult || !npmResult.success) {
        npmResult = { success: false, message: errorMessage };
      }
      log(`NPM发布失败: ${errorMessage}`);
    }

    // 清理临时文件
    try {
      await fs.remove(req.file.path);
      await fs.remove(packageInfo.path);
      log("临时文件已清理");
    } catch (cleanupError) {
      log(`清理临时文件失败: ${cleanupError.message}`);
    }

    // 记录历史
    try {
      const historyPath = path.join(processedDir, "history.json");
      const item = {
        time: new Date().toISOString(),
        uploadId,
        packageName,
        version,
        filename: req.file.originalname,
        registry: npmRegistry,
        tag: tag || "latest",
        access,
        success: npmResult.success,
        message: npmResult.message || "",
      };
      let history = [];
      if (await fs.pathExists(historyPath)) {
        history = await fs.readJson(historyPath).catch(() => []);
      }
      history.unshift(item);
      if (history.length > 100) history = history.slice(0, 100);
      await fs.writeJson(historyPath, history, { spaces: 2 });
    } catch (e) {
      log(`写入历史失败: ${e.message}`);
    }

    res.json({
      success: npmResult.success,
      uploadId,
      npm: npmResult,
      message: npmResult.success ? "发布成功" : "发布失败",
      packageInfo: {
        name: packageName,
        version,
        filename: req.file.originalname,
        githubRepo,
      },
    });
  } catch (error) {
    log(`处理失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
      uploadId,
    });
  }
});

// 获取历史记录
app.get("/api/history", async (req, res) => {
  try {
    const historyPath = path.join(processedDir, "history.json");
    let history = [];
    if (await fs.pathExists(historyPath)) {
      history = await fs.readJson(historyPath).catch(() => []);
    }
    res.json({ success: true, history });
  } catch (e) {
    res.json({ success: false, history: [], message: e.message });
  }
});

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 启动服务器
app.listen(PORT, () => {
  log(`服务器启动成功，端口: ${PORT}`);
  log(`访问地址: http://localhost:${PORT}`);
  log(`API文档: http://localhost:${PORT}/api/health`);
});
