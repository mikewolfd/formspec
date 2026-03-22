/** @filedesc Rewrite /references (and common typo) to the Vite-built SPA entry in public/references/. */
import { defineMiddleware } from "astro:middleware";

const REFERENCES_ALIASES = new Set([
  "/references",
  "/references/",
  "/refrences",
  "/refrences/",
]);

export const onRequest = defineMiddleware((context, next) => {
  if (REFERENCES_ALIASES.has(context.url.pathname)) {
    return next(`/references/index.html${context.url.search}`);
  }
  return next();
});
