#!/bin/bash

# npm-config-publisher 安装和设置脚本

set -e

echo "🚀 npm-config-publisher 安装脚本"
echo "=================================="

# 检查Node.js版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装 Node.js 16+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -lt 16 ]; then
        echo "❌ Node.js 版本过低 ($NODE_VERSION)，需要 16+ 版本"
        exit 1
    fi
    
    echo "✅ Node.js 版本检查通过: $NODE_VERSION"
}

# 安装依赖
install_dependencies() {
    echo "📦 安装依赖..."
    npm install
    echo "✅ 依赖安装完成"
}

# 创建示例配置
create_example_config() {
    echo "📝 创建示例配置..."
    
    if [ ! -f "publish-config.json" ]; then
        cp examples/basic-config.json publish-config.json
        echo "✅ 已创建 publish-config.json"
    else
        echo "⚠️  publish-config.json 已存在，跳过创建"
    fi
}

# 设置环境变量
setup_environment() {
    echo "🔧 设置环境变量..."
    
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# NPM配置
NPM_TOKEN=your_npm_token_here
NPM_REGISTRY=https://registry.npmjs.org/

# GitHub配置（可选）
GITHUB_TOKEN=your_github_token_here

# CI配置（可选）
CI_BRANCH=main
EOF
        echo "✅ 已创建 .env 文件"
        echo "⚠️  请编辑 .env 文件，填入你的真实token"
    else
        echo "⚠️  .env 文件已存在，跳过创建"
    fi
}

# 创建启动脚本
create_startup_scripts() {
    echo "📜 创建启动脚本..."
    
    # Windows批处理文件
    cat > start.bat << 'EOF'
@echo off
echo 🚀 启动 npm-config-publisher
echo ==========================

if not exist .env (
    echo ❌ .env 文件不存在，请先运行安装脚本
    pause
    exit /b 1
)

echo 📝 当前配置:
type publish-config.json

echo.
echo 🔧 可用命令:
echo   npm-config-publish init          - 初始化配置
echo   npm-config-publish publish       - 发布包
echo   npm-config-publish validate       - 验证配置
echo   npm-config-publish version        - 版本管理

echo.
echo 按任意键继续...
pause > nul
EOF

    # Linux/Mac shell脚本
    cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 启动 npm-config-publisher"
echo "=========================="

if [ ! -f ".env" ]; then
    echo "❌ .env 文件不存在，请先运行安装脚本"
    exit 1
fi

echo "📝 当前配置:"
cat publish-config.json

echo ""
echo "🔧 可用命令:"
echo "  npm-config-publish init          - 初始化配置"
echo "  npm-config-publish publish       - 发布包"
echo "  npm-config-publish validate       - 验证配置"
echo "  npm-config-publish version        - 版本管理"

echo ""
echo "按任意键继续..."
read -n 1
EOF

    chmod +x start.sh
    echo "✅ 启动脚本创建完成"
}

# 验证安装
verify_installation() {
    echo "🔍 验证安装..."
    
    if [ -f "src/index.js" ] && [ -f "bin/cli.js" ]; then
        echo "✅ 核心文件检查通过"
    else
        echo "❌ 核心文件缺失"
        exit 1
    fi
    
    if [ -f "package.json" ]; then
        echo "✅ package.json 存在"
    else
        echo "❌ package.json 缺失"
        exit 1
    fi
}

# 显示使用说明
show_usage() {
    echo ""
    echo "🎉 安装完成！"
    echo "============="
    echo ""
    echo "📝 下一步操作:"
    echo "1. 编辑 .env 文件，填入你的 NPM token"
    echo "2. 编辑 publish-config.json，配置你的包信息"
    echo "3. 运行: npm-config-publish publish"
    echo ""
    echo "🔧 常用命令:"
    echo "  npm-config-publish init          - 重新初始化配置"
    echo "  npm-config-publish publish       - 发布包"
    echo "  npm-config-publish validate      - 验证配置"
    echo "  npm-config-publish version       - 版本管理"
    echo "  npm-config-publish publish --dry-run  - 试运行"
    echo ""
    echo "📚 文档:"
    echo "  README.md                        - 基本说明"
    echo "  docs/usage.md                    - 详细使用指南"
    echo "  docs/ci-cd.md                    - CI/CD集成"
    echo "  examples/quick-start.md          - 快速开始"
    echo ""
    echo "🆘 获取帮助:"
    echo "  npm-config-publish --help        - 查看帮助"
    echo "  docs/troubleshooting.md          - 故障排除"
    echo ""
}

# 主函数
main() {
    echo "开始安装 npm-config-publisher..."
    echo ""
    
    check_node_version
    install_dependencies
    create_example_config
    setup_environment
    create_startup_scripts
    verify_installation
    show_usage
}

# 运行主函数
main "$@"
