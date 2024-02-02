import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import critters from "astro-critters";
import sitemap from "@astrojs/sitemap";

import prefetch from "@astrojs/prefetch";

// https://astro.build/config
export default defineConfig({
  site: "https://bronen.com.br",
  integrations: [tailwind(), critters(), sitemap(), prefetch()],
});
