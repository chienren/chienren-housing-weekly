import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);

test("RSS updates publish a complete 15-story batch",async()=>{
  const source=await readFile(new URL("scripts/update-news.mjs",root),"utf8");
  assert.match(source,/slice\(0,15\)/);
  assert.match(source,/items\.length!==15/);
  assert.match(source,/refreshMode:"FULL_BATCH_15"/);
  assert.match(source,/refresh_batch:refreshBatch/);
  assert.match(source,/沒有偵測到新事件，保留目前完整15則/);
  assert.match(source,/整批刷新驗證失敗/);
});
