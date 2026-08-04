import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("build emits a deployable vinext worker", async () => {
  await access(new URL("dist/server/index.js", root));
  await access(new URL("dist/client/", root));
  const hosting = JSON.parse(await readFile(new URL("dist/.openai/hosting.json", root), "utf8"));
  assert.equal(hosting.project_id, "appgprj_6a70b61a640c8191bd7826490a173e7d");
  assert.equal(hosting.d1, "DB");
});

test("weekly report UI contains required editorial interactions", async () => {
  const [dashboard, css, layout] = await Promise.all([
    readFile(new URL("app/dashboard.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.match(layout, /謙仁房市週報/);
  assert.match(dashboard, /政策／房市監管/);
  assert.match(dashboard, /市場行情/);
  assert.match(dashboard, /台中房市／重大建設/);
  assert.match(dashboard, /國際財經／利率通膨/);
  assert.match(dashboard, /買方觀點/);
  assert.match(dashboard, /賣方觀點/);
  assert.match(dashboard, /複製 LINE 訊息/);
  assert.match(css, /@media\(max-width:680px\)/);
});
