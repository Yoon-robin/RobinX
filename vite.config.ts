import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import process from "node:process";
import pkg from "./package.json";
const host = process.env.TAURI_DEV_HOST;
// 시작 화면(index.html의 %VITE_APP_VERSION%, 앱의 import.meta.env)에 보이는 버전
process.env.VITE_APP_VERSION = pkg.version;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      // Rust 빌드 폴더(target)와 앱 화면이 아닌 폴더도 보지 않는다. 파일이 아주 많아 개발 서버가 응답하지 못한 적이 있다
      ignored: ["**/src-tauri/**", "**/target/**", "**/crates/**", "**/website/**", "**/ios/**", "**/docs/**"],
    },
  },
  // 의존성을 찾을 때 저장소 전체의 html(website/dist, target 등)을 훑지 않고 앱의 입구만 본다
  optimizeDeps: {
    entries: ["index.html"],
  },
}));
