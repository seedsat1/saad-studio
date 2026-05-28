import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome89",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        draw: resolve(__dirname, "draw.html"),
      },
    },
  },
  server: {
    port: 5180,
    strictPort: true,
  },
});
