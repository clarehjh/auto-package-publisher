@echo off
echo 正在安装依赖...
call npm install

if %errorlevel% neq 0 (
    echo 安装依赖失败！
    pause
    exit /b 1
)

echo.
echo 正在启动服务器...
call npm start

pause

