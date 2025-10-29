// DOM元素
const uploadForm = document.getElementById("uploadForm");
const packageFileInput = document.getElementById("packageFile");
const submitBtn = document.getElementById("submitBtn");
const resultSection = document.getElementById("resultSection");
const statusSection = document.getElementById("statusSection");
const resultContent = document.getElementById("resultContent");
const statusContent = document.getElementById("statusContent");

// 文件选择显示
const fileInputDisplay = document.querySelector(".file-input-display");
const fileName = document.querySelector(".file-name");
const btnSelect = document.querySelector(".btn-select");

// 监听文件选择
packageFileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    fileName.textContent = e.target.files[0].name;
  } else {
    fileName.textContent = "未选择文件";
  }
});

btnSelect.addEventListener("click", () => {
  packageFileInput.click();
});

// 表单提交
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 重置状态
  resultSection.classList.add("hidden");
  statusSection.classList.remove("hidden");

  // 显示加载状态
  submitBtn.classList.add("loading");
  submitBtn.disabled = true;

  // 构建FormData
  const formData = new FormData();
  formData.append("package", packageFileInput.files[0]);
  formData.append("packageName", document.getElementById("packageName").value);
  formData.append("version", document.getElementById("version").value);

  // GitHub仓库信息（用于package.json的repository字段）
  const githubRepo = document.getElementById("githubRepo").value;
  if (githubRepo) formData.append("githubRepo", githubRepo);

  // NPM配置
  const npmRegistry = document.getElementById("npmRegistry").value;
  const npmToken = document.getElementById("npmToken").value;
  const access = document.getElementById("access").value || "public";
  const tag = document.getElementById("tag").value || "";
  const dryRun = document.getElementById("dryRun").checked ? "true" : "false";
  const skipExisting = document.getElementById("skipExisting").checked
    ? "true"
    : "false";
  formData.append("npmRegistry", npmRegistry);
  if (npmToken) formData.append("npmToken", npmToken);
  formData.append("access", access);
  if (tag) formData.append("tag", tag);
  formData.append("dryRun", dryRun);
  formData.append("skipExisting", skipExisting);

  // 显示状态
  showStatus("准备上传文件...");

  try {
    // 发送请求
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    // 隐藏状态
    statusSection.classList.add("hidden");
    resultSection.classList.remove("hidden");

    // 显示结果
    displayResult(result);
  } catch (error) {
    // 隐藏状态
    statusSection.classList.add("hidden");
    resultSection.classList.remove("hidden");

    // 显示错误
    resultContent.innerHTML = `
            <div class="result-item error">
                <span class="icon">❌</span>
                <div class="content">
                    <strong>上传失败</strong>
                    <div>${error.message}</div>
                </div>
            </div>
        `;

    console.error("Error:", error);
  } finally {
    // 恢复按钮状态
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
  }
});

// 显示发布状态
function showStatus(message) {
  statusContent.innerHTML = `
        <div class="status-item">
            <span>⏳</span> ${message}
        </div>
    `;
}

// 显示发布结果
function displayResult(result) {
  const { success, npm, message, packageInfo } = result;

  let html = "";

  if (success) {
    html += `
            <div class="result-item success">
                <span class="icon">✅</span>
                <div class="content">
                    <strong>发布成功！</strong>
                    <div>${message}</div>
                </div>
            </div>
        `;
  } else {
    html += `
            <div class="result-item error">
                <span class="icon">❌</span>
                <div class="content">
                    <strong>发布失败</strong>
                    <div>${message}</div>
                </div>
            </div>
        `;
  }

  // 显示包信息
  if (packageInfo) {
    html += `
            <div class="result-item info">
                <span class="icon">📦</span>
                <div class="content">
                    <strong>包信息</strong>
                    <div>名称: ${packageInfo.name}</div>
                    <div>版本: ${packageInfo.version}</div>
                    <div>文件: ${packageInfo.filename}</div>
                </div>
            </div>
        `;
  }

  // 显示NPM结果
  if (npm) {
    const itemClass = npm.success ? "success" : "error";
    const icon = npm.success ? "✅" : "❌";
    html += `
            <div class="result-item ${itemClass}">
                <span class="icon">${icon}</span>
                <div class="content">
                    <strong>NPM 发布</strong>
                    <div>${npm.message}</div>
                    ${
                      npm.output
                        ? `<div style="font-size: 0.9rem; margin-top: 5px;">${npm.output}</div>`
                        : ""
                    }
                    ${
                      npm.registry
                        ? `<div style="font-size: 0.85rem; margin-top: 5px; color: #666;">Registry: ${npm.registry}</div>`
                        : ""
                    }
                </div>
            </div>
        `;
  }

  // 显示GitHub仓库信息
  if (packageInfo && packageInfo.githubRepo) {
    html += `
            <div class="result-item info">
                <span class="icon">🔗</span>
                <div class="content">
                    <strong>GitHub 仓库</strong>
                    <div><a href="https://github.com/${packageInfo.githubRepo}" target="_blank">https://github.com/${packageInfo.githubRepo}</a></div>
                    <div style="font-size: 0.9rem; margin-top: 5px; color: #666;">已在package.json中配置</div>
                </div>
            </div>
        `;
  }

  resultContent.innerHTML = html;
}

// 重置表单
function resetForm() {
  uploadForm.reset();
  fileName.textContent = "未选择文件";
  resultSection.classList.add("hidden");
  statusSection.classList.add("hidden");

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  console.log("自动化包发布工具已加载");

  // 恢复上次输入
  try {
    const last = JSON.parse(localStorage.getItem("publisher:last") || "null");
    if (last) {
      if (last.packageName)
        document.getElementById("packageName").value = last.packageName;
      if (last.version) document.getElementById("version").value = last.version;
      if (last.githubRepo)
        document.getElementById("githubRepo").value = last.githubRepo;
      if (last.npmRegistry)
        document.getElementById("npmRegistry").value = last.npmRegistry;
      if (last.access) document.getElementById("access").value = last.access;
      if (typeof last.dryRun === "boolean")
        document.getElementById("dryRun").checked = last.dryRun;
      if (typeof last.skipExisting === "boolean")
        document.getElementById("skipExisting").checked = last.skipExisting;
      if (last.tag) document.getElementById("tag").value = last.tag;
    }
  } catch {}

  // 监听输入并保存
  const persist = () => {
    const data = {
      packageName: document.getElementById("packageName").value,
      version: document.getElementById("version").value,
      githubRepo: document.getElementById("githubRepo").value,
      npmRegistry: document.getElementById("npmRegistry").value,
      access: document.getElementById("access").value,
      dryRun: document.getElementById("dryRun").checked,
      skipExisting: document.getElementById("skipExisting").checked,
      tag: document.getElementById("tag").value,
    };
    localStorage.setItem("publisher:last", JSON.stringify(data));
  };

  [
    "packageName",
    "version",
    "githubRepo",
    "npmRegistry",
    "access",
    "dryRun",
    "skipExisting",
    "tag",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", persist);
    if (el && (el.type === "checkbox" || el.tagName === "SELECT")) {
      el.addEventListener("change", persist);
    }
  });

  // 检查健康状态
  fetch("/api/health")
    .then((res) => res.json())
    .then((data) => {
      console.log("服务状态:", data);
    })
    .catch((err) => {
      console.error("服务连接失败:", err);
    });
});
