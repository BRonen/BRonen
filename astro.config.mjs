import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import critters from "astro-critters";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  site: "https://bronen.com.br",
  integrations: [tailwind(), critters(), sitemap()],
});
