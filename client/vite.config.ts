import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_TARGET = process.env.VITE_API_PROXY ?? "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
      "/photos.json": { target: API_TARGET, changeOrigin: true },
      "/photos": {
        target: process.env.VITE_PHOTO_PROXY ?? API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
