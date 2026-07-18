import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // Capacitor WebView에서 상대경로로 로드
  publicDir: "www", // public/ → www/ 이전: React 앱 전환 기간 동안 에셋 공존용 (Task 14에서 vite 제거 시 삭제)
  server: { host: true },
});
