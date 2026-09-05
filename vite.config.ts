import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative URLs so the build works from any host or subpath (e.g. an R2 bucket).
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
