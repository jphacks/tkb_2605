import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In docker compose the API is the `backend` service; outside docker set VITE_API_PROXY=http://localhost:8000.
const apiTarget = process.env.VITE_API_PROXY ?? "http://backend:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Docker Desktop on Windows may not deliver file events into the container; set CHOKIDAR_USEPOLLING=true then.
    watch: process.env.CHOKIDAR_USEPOLLING === "true" ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
});
