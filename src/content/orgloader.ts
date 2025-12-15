import type { Loader } from "astro/loaders";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHighlighter } from "shiki";

const exec = promisify(execFile);

const highlighter = await createHighlighter({
  themes: ["github-dark"],
  langs: ["typescript", "javascript", "php", "elisp", "mermaid"],
});

export function orgLoader(): Loader {
  return {
    name: "org-emacs-loader",

    async load({ store, config }) {
      const contentDir = path.join(
        config.root.pathname,
        "src/content/article"
      );

      const files = await fs.readdir(contentDir);

      for (const file of files) {
        if (!file.endsWith(".org")) continue;
        if (file.startsWith(".")) continue;

        const fullPath = path.join(contentDir, file);
          
        const { stdout } = await exec("emacs", [
          "-Q",
          "--batch",
          "-l", "src/content/export.el",
          fullPath,
        ]);

        const result = JSON.parse(JSON.parse(stdout));
        const slug = file.replace(/\.org$/, "");

        const body = result.body.replace(
          /<pre class="src src-([a-zA-Z0-9_-]+)">([\s\S]*?)<\/pre>/g,
          (_: string, lang: string, code: string) =>
            highlighter.codeToHtml(code, { theme: "github-dark", lang }));

        store.set({
          id: slug,
          data: { slug, ...result.data },
          body,
        });
      }
    },
  };
}
