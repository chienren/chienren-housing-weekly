import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);

test("GitHub Pages workflow builds and deploys a static index",async()=>{
  const [workflow,builder,pkg,styles]=await Promise.all([
    readFile(new URL(".github/workflows/update-news.yml",root),"utf8"),
    readFile(new URL("scripts/build-github-pages.mjs",root),"utf8"),
    readFile(new URL("package.json",root),"utf8"),
    readFile(new URL("app/brand-adjustments.css",root),"utf8"),
  ]);
  assert.match(workflow,/actions\/configure-pages@v5/);
  assert.match(workflow,/actions\/deploy-pages@v4/);
  assert.match(workflow,/path: github-pages-dist/);
  assert.match(builder,/index\.html/);
  assert.match(builder,/LINE 分享/);
  assert.match(pkg,/build:pages/);
  assert.match(styles,/\.phone-link\{[^}]*white-space:nowrap/);
  assert.match(styles,/\.store-links\{flex-wrap:nowrap\}/);
});
