# Blueprint Plan - 跨平台规划与协作平台

Blueprint Plan 是一个现代化的、跨平台的规划与协作应用程序。它旨在帮助团队和个人创建、管理和同步他们的计划与任务，并支持实时协作。

该项目基于 Web 技术构建，并使用 Electron 和 Capacitor 将其打包为桌面和移动应用程序，实现了真正的“一次编写，到处运行”。

## ✨ 主要功能

*   **跨平台支持**: 可在 Web、桌面 (Windows, macOS, Linux) 和移动端 (Android, iOS) 上运行。
*   **丰富的仪表盘**: 提供一个集中的仪表盘 (`Dashboard`) 来概览所有项目和任务。
*   **计划与任务管理**: 强大的计划 (`PlanManager`) 和任务 (`TaskManager`) 管理功能。
*   **数据可视化**: 内置的分析图表 (`Analytics`, `AdvancedCharts`)，帮助用户洞察数据。
*   **本地存储**: 数据安全地存储在本地，保护您的隐私。

## 🛠️ 技术栈

*   **前端**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
*   **桌面端**: [Electron](https://www.electronjs.org/)
*   **移动端**: [Capacitor](https://capacitorjs.com/)
*   **UI/UX**: 自定义组件，CSS

## 🚀 快速开始

### 1. 环境准备

确保你的开发环境中安装了 [Node.js](https://nodejs.org/) (建议 v18 或更高版本) 和 `npm`。

### 2. 安装依赖

克隆项目仓库，然后在项目根目录下运行以下命令来安装所有依赖项：

```bash
npm install
```

### 3. 运行项目

你可以根据目标平台选择不同的启动方式：

#### 🌐 Web (浏览器)

在浏览器中以开发模式运行应用：

```bash
npm run dev
```

该命令会启动一个本地开发服务器，你可以在浏览器中访问 `http://localhost:5173` 查看。

#### 🖥️ 桌面端 (Electron)

要运行 Electron 桌面应用，请执行：

```bash
npm run electron:dev
```

这会启动一个带有热重载功能的 Electron 窗口。

#### 📱 移动端 (Capacitor)

在移动设备或模拟器上运行应用需要额外的设置。

1.  **构建 Web 资源**:
    ```bash
    npm run build
    ```

2.  **同步 Capacitor 资源**:
    ```bash
    npx cap sync
    ```

3.  **在 Android Studio 中运行**:
    ```bash
    npx cap open android
    ```
    此命令将在 Android Studio 中打开项目，你可以在其中构建、运行和调试你的 Android 应用。

## 📜 主要脚本命令

项目 `package.json` 中定义了以下常用脚本：

*   `npm run dev`: 在浏览器中以开发模式启动应用。
*   `npm run build`: 构建生产版本的 Web 应用。
*   `npm run preview`: 在本地预览生产构建的应用。
*   `npm run electron:dev`: 以开发模式启动 Electron 应用。
*   `npm run electron:build`: 构建 Electron 应用安装包。

## 🤝 贡献

欢迎任何形式的贡献！如果您发现了 bug 或有新的功能建议，请提交 Issue 或 Pull Request。

## 📄 许可证