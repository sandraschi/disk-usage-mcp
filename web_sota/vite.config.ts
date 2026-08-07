import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const BACKEND_PORT = 11114;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 11115,
    proxy: {
      "/api": { target: `http://127.0.0.1:${BACKEND_PORT}`, changeOrigin: true },
      "/health": { target: `http://127.0.0.1:${BACKEND_PORT}`, changeOrigin: true },
      "/mcp": { target: `http://127.0.0.1:${BACKEND_PORT}/mcp`, changeOrigin: true, ws: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
