import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import vueDevTools from "vite-plugin-vue-devtools";

// 定义node_modules绝对路径（避免依赖解析错误）
const nodeModulesPath = resolve(__dirname, "node_modules");

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // Node原生模块polyfill（绝对路径配置）
      buffer: resolve(nodeModulesPath, "buffer/"),
      crypto: resolve(nodeModulesPath, "crypto-browserify/"),
      stream: resolve(nodeModulesPath, "stream-browserify/"),
      assert: resolve(nodeModulesPath, "assert/"),
      util: resolve(nodeModulesPath, "util/"),
    },
  },
  define: {
    "process.env": {},
    global: "window",
    "process.browser": true, // 告知依赖当前是浏览器环境
  },
  server: {
    port: undefined, // 不指定具体端口，让系统自动分配
    strictPort: false, // 允许自动切换端口
    open: true,
    cors: true,
    host: "0.0.0.0", // 尝试仅绑定到localhost而非所有接口
    watch: {
      enabled: true,
      ignored: ["!**/node_modules/**"],
    },
    hmr: {
      overlay: true,
    },
  },
  optimizeDeps: {
    include: [
      "buffer",
      "crypto-browserify",
      "stream-browserify",
      "assert",
      "util",
      "ethers",
      "tronweb",
      "@walletconnect/sign-client",
      "@walletconnect/modal",
    ],
    exclude: [
      "readable-stream/lib/internal/streams/end-of-stream.js",
      "readable-stream/lib/internal/streams/pipeline.js"
    ],
    force: true, // 强制重新预构建（清除旧缓存）
    esbuildOptions: {
      define: {
        global: "window",
      },
      external: [
        "readable-stream/lib/internal/streams/end-of-stream.js",
        "readable-stream/lib/internal/streams/pipeline.js"
      ],
      // 手动处理stream模块解析（兜底）
      plugins: [
        {
          name: "fix-stream",
          setup(build) {
            build.onResolve({ filter: /^stream$/ }, () => ({
              path: resolve(nodeModulesPath, "stream-browserify/index.js"),
            }));
            // 处理readable-stream内部模块
            build.onResolve({ filter: /readable-stream\/lib\/internal/ }, () => ({
              path: resolve(nodeModulesPath, "stream-browserify/index.js"),
              external: true
            }));
          },
        },
      ],
    },
  },
});
