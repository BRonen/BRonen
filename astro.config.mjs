import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  site: "https://bronen.com.br",

  markdown: {
    syntaxHighlight: "shiki",
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
          ignored: ["**/.direnv/**", "**/.terraform/**"],
      },
    },
  },

  integrations: [sitemap()],
  adapter: cloudflare(),
});
