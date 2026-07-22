import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND_PORT = 11114;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 11115,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
