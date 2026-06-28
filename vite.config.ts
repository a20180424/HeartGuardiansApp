import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // Capacitor WebView에서 상대경로로 로드
  server: { host: true },
});
