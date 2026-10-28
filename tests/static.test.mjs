import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {existsSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../src/ui.mjs",import.meta.url),"utf8");
test("HTML references a real ES module entrypoint",()=>{
  assert.match(html,/<script type="module" src="\.\/src\/ui\.mjs"><\/script>/);
  for(const path of ["../src/ui.mjs","../src/core.mjs","../src/domains.mjs"]){
    assert.ok(existsSync(new URL(path,import.meta.url)),path);
  }
});
test("all direct DOM IDs used by the UI exist in static HTML",()=>{
  const ids=[...ui.matchAll(/\$\("([A-Za-z][A-Za-z0-9-]*)"\)/g)].map(x=>x[1]);
  for(const id of new Set(ids))assert.ok(html.includes('id="'+id+'"'),"HTML missing #"+id);
});
test("the scientific disclaimer is visible without JavaScript",()=>{
  assert.match(html,/DATA SINTETIS/);
  assert.match(html,/Scientific honesty by design/);
});

test("responsive UI includes mobile cards and semantic inspector controls",()=>{
  const mobile=readFileSync(new URL("../mobile.css",import.meta.url),"utf8");
  assert.match(html,/href="\.\/mobile\.css"/);
  assert.match(html,/id="inspector-close"/);
  assert.match(html,/id="inspector-backdrop"/);
  assert.match(html,/id="mobile-step-progress"/);
  assert.match(ui,/variable-cards/);
  assert.match(ui,/class="chart-scroll"/);
  assert.match(mobile,/max-width:850px/);
  assert.match(mobile,/max-width:580px/);
  assert.match(mobile,/max-width:360px/);
  assert.match(mobile,/\.inspector\.mobile-open/);
  assert.match(mobile,/\.variable-table\{display:none\}/);
});
test("mobile interaction guards include focus, reset/undo and draft persistence",()=>{
  assert.match(ui,/function closeInspector\(/);
  assert.match(ui,/e\.key==="Escape"/);
  assert.match(ui,/e\.key!=="Tab"/);
  assert.match(ui,/window\.confirm\(/);
  assert.match(ui,/undo-reset/);
  assert.match(ui,/function persistDraft\(/);
  assert.match(ui,/localStorage\.setItem/);
  assert.match(ui,/prefers-reduced-motion/);
});
