#!/bin/bash

echo "正在安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "安装依赖失败！"
    exit 1
fi

echo ""
echo "正在启动服务器..."
npm start

