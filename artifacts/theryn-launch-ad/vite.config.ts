import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  resolve: { alias: { "@": "/src" } },
  server: { port: Number(process.env.PORT || 25042), host: "0.0.0.0" },
  build: { outDir: "dist/public", emptyOutDir: true },
});