/** @filedesc Astro configuration for the formspec.org marketing/docs site. */
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://formspec.org",
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: "directory",
  },
  outDir: "./dist",
  redirects: {
    "/references": "/references/index.html",
  },
  markdown: {
    shikiConfig: {
      theme: "github-light",
      wrap: true,
    },
  },
});
