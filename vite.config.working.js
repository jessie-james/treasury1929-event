import { defineConfig } from "vite";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [],
  esbuild: {
    jsx: 'automatic', // Use automatic JSX transform - no React import needed
    jsxImportSource: 'react'
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  css: {
    postcss: {
      plugins: [], // Empty plugins array to bypass PostCSS issues
    },
  },
  define: {
    global: 'globalThis',
  }
});