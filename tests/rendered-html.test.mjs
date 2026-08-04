import assert from "node:assert/strict";
import { access,readFile } from "node:fs/promises";
import test from "node:test";
const root=new URL("../",import.meta.url);
test("build emits deployable worker",async()=>{await access(new URL("dist/server/index.js",root));await access(new URL("dist/client/",root));const h=JSON.parse(await readFile(new URL("dist/.openai/hosting.json",root),"utf8"));assert.equal(h.project_id,"appgprj_6a70b61a640c8191bd7826490a173e7d")});
test("weekly UI includes editorial interactions",async()=>{const [d,c,l]=await Promise.all([readFile(new URL("app/dashboard.tsx",root),"utf8"),readFile(new URL("app/globals.css",root),"utf8"),readFile(new URL("app/layout.tsx",root),"utf8")]);for(const text of ["謙仁房市週報","政策／房市監管","市場行情","國際財經／通膨","台中建設／區域動態","買方觀點","賣方觀點","生成 LINE 訊息"])assert.match(d+ l,new RegExp(text));assert.match(c,/@media\(max-width:680px\)/)});
