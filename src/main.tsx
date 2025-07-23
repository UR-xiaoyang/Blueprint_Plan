import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// 初始化Capacitor插件
const initializeCapacitor = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // 隐藏启动屏幕
      await SplashScreen.hide();
      
      // 设置状态栏
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#2563eb' });
    }
  } catch (error) {
    console.error('Capacitor初始化错误:', error);
  }
};

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initializeCapacitor();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
