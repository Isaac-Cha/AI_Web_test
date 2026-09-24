const path = require("path");

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src/"),
    },
    configure: (webpackConfig) => {
      // 允许从父目录 node_modules 解析（如果 game/frontend 没 yarn install，
      // 可以借用网站主工程的依赖）
      webpackConfig.resolve.modules = [
        "node_modules",
        path.resolve(__dirname, "../../Emergent/frontend/node_modules"),
      ];
      return webpackConfig;
    },
  },
  devServer: {
    port: 3002,
    // 开发期把 /game/api 和 /game/ws 反代到游戏后端
    proxy: {
      "/game/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
      "/game/ws": {
        target: "ws://127.0.0.1:8001",
        ws: true,
        changeOrigin: true,
        timeout: 3600 * 1000,
        proxyTimeout: 3600 * 1000,
      },
    },
    // 让浏览器端 WS 不要因为 dev proxy 空闲而断开
    webSocketServer: {
      options: {
        path: "/ws",
        maxPayload: 1024 * 1024 * 4,
      },
    },
    historyApiFallback: {
      // 支持 BrowserRouter basename="/game"
      index: "/game/index.html",
    },
  },
};
