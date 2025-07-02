#!/bin/bash

#================================================================
# Blueprint Plan - 统一编译与启动脚本 (v2)
#
# 这个脚本提供了一个菜单，用于简化在不同平台上
# 启动 Blueprint Plan 应用的过程。
#
# 新增功能:
# - 如果自动打开 Android Studio 失败，会提示用户输入路径。
# - 增强的安卓构建和部署功能
#
# 使用方法:
# 1. 将此文件保存为 build.sh 并在项目根目录下。
# 2. 赋予执行权限: chmod +x build.sh
# 3. 运行脚本: ./build.sh
#================================================================

# 函数：打印漂亮的标题
print_header() {
    echo "=========================================="
    echo "    🚀 Blueprint Plan - 启动器 🚀"
    echo "=========================================="
    echo
}

# 函数：检查依赖项
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        echo "⚠️  未检测到 node_modules 目录。"
        read -p "是否现在运行 'npm install' 来安装依赖? (y/n) " choice
        case "$choice" in
            y|Y )
                echo "📦 正在安装依赖..."
                npm install
                ;;
            * )
                echo "❌ 操作已取消。请在运行此脚本前手动安装依赖。"
                exit 1
                ;;
        esac
    fi
}

# 函数：启动 Web 开发服务器
start_web() {
    echo "🌐 正在启动 Web 开发服务器..."
    echo "在浏览器中访问 http://localhost:5173"
    npm run dev
}

# 函数：启动 Electron 开发模式
start_electron() {
    echo "🖥️  正在以开发模式启动 Electron 应用..."
    npm run electron-dev
}

# 函数：打开 Android Studio (带错误处理)
open_android_studio() {
    echo "🔌 正在尝试在 Android Studio 中打开项目..."
    if ! npx cap open android; then
        echo "----------------------------------------------------------------"
        echo "⚠️  自动打开 Android Studio 失败。"
        echo "这通常是因为 Capacitor 找不到您的 Android Studio 安装路径。"
        echo
        echo "👉 请输入您 Android Studio 'studio.sh' (Linux) 或 'studio' (macOS) 脚本的完整路径。"
        echo "   Linux 示例: /home/user/android-studio/bin/studio.sh"
        echo "   macOS 示例: /Applications/Android Studio.app/Contents/MacOS/studio"
        read -p "路径 (留空则跳过): " studio_path

        if [ -n "$studio_path" ]; then
            if [ -f "$studio_path" ]; then
                echo "🔧 正在使用您提供的路径重试..."
                # 将路径导出为环境变量，以便 Capacitor CLI 可以使用它
                export CAPACITOR_ANDROID_STUDIO_PATH="$studio_path"
                if ! npx cap open android; then
                     echo "❌ 使用指定路径仍然失败。请检查路径是否正确并确保 Android Studio 可以正常启动。"
                fi
            else
                echo "❌ 错误: 文件不存在于 '$studio_path'。请提供正确的路径。"
            fi
        else
            echo "👍 操作已跳过。请手动在 Android Studio 中打开项目。"
            echo "   您的 Android 项目位于: $(pwd)/android"
        fi
        echo "----------------------------------------------------------------"
    fi
}

# 函数：为移动端构建和同步
build_mobile() {
    echo "===== 开始构建移动应用 ====="

    # 检查是否安装了必要的工具
    if ! command -v npm &> /dev/null; then
        echo "错误: npm 未安装，请先安装 Node.js 和 npm"
        exit 1
    fi

    if ! command -v npx &> /dev/null; then
        echo "错误: npx 未安装，请先安装最新版本的 npm"
        exit 1
    fi

    # 安装依赖
    echo "📦 正在安装依赖..."
    npm install

    echo "1. 正在构建 Web 资源..."
    if ! npm run build; then
        echo "❌ Web 资源构建失败。请检查错误信息。"
        exit 1
    fi
    echo "✅ Web 资源构建完成。"
    echo

    echo "2. 正在同步 Capacitor 资源..."
    if ! npx cap sync; then
        echo "❌ Capacitor 同步失败。请确保 Capacitor 已正确配置。"
        exit 1
    fi
    echo "✅ Capacitor 同步完成。"
    echo

    echo "3. 正在复制资源到安卓项目..."
    npx cap copy android
    echo "✅ 资源复制完成。"
    echo

    # 询问是否要打开 Android Studio
    read -p "是否要打开 Android Studio? (y/n): " open_studio
    if [[ $open_studio == "y" || $open_studio == "Y" ]]; then
        open_android_studio
    fi

    # 询问是否要在设备上运行
    read -p "是否要在连接的设备上运行? (y/n): " run_device
    if [[ $run_device == "y" || $run_device == "Y" ]]; then
        echo "正在运行应用到设备..."
        npx cap run android
    fi

    echo "===== 构建完成 ====="
}

# --- 主程序 ---
clear
print_header
check_dependencies

# 主菜单
echo "请选择一个启动选项:"
echo "  1. 🌐 Web (在浏览器中运行)"
echo "  2. 🖥️  桌面 (启动 Electron 应用)"
echo "  3. 📱 移动端 (构建并准备安卓应用)"
echo "  4. 退出"
echo

read -p "请输入你的选择 [1-4]: " menu_choice

case $menu_choice in
    1)
        start_web
        ;;
    2)
        start_electron
        ;;
    3)
        build_mobile
        ;;
    4)
        echo "👋 告辞!"
        exit 0
        ;;
    *)
        echo "❌ 无效的选择。请输入 1 到 4 之间的数字。"
        exit 1
        ;;
esac