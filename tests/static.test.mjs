import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const lite=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const legacy=readFileSync(new URL("../legacy.html",import.meta.url),"utf8");
const liteScript=readFileSync(new URL("../simple.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../src/ui.mjs",import.meta.url),"utf8");
const literature=readFileSync(new URL("../literature.html",import.meta.url),"utf8");

test("AISM Lite is the default homepage with a working static entrypoint",()=>{
  assert.match(lite,/<script src="\.\/simple\.js" defer><\/script>/);
  assert.match(lite,/href="\.\/simple\.css"/);
  assert.match(lite,/id="stage-data"/);
  assert.match(lite,/id="stage-assessment"/);
  assert.match(lite,/id="stage-results"/);
  assert.match(lite,/href="\.\/samples\/contoh-data-pengiriman-rme\.csv"/);
  for(const path of ["../simple.js","../simple.css","../samples/contoh-data-pengiriman-rme.csv"]) {
    assert.ok(existsSync(new URL(path,import.meta.url)),path);
  }
  assert.match(liteScript,/function renderRecommendations\(/);
  assert.match(liteScript,/function parseData\(/);
});

test("legacy research lab keeps the six-stage ES module builder",()=>{
  assert.match(legacy,/<script type="module" src="\.\/src\/ui\.mjs"><\/script>/);
  for(const path of ["../src/ui.mjs","../src/core.mjs","../src/domains.mjs","../src/decision.mjs","../src/adaptive.mjs","../src/literature-data.mjs","../src/literature-ui.mjs"]) {
    assert.ok(existsSync(new URL(path,import.meta.url)),path);
  }
});

test("literature workbench remains a separate navigable page",()=>{
  assert.match(lite,/href="\.\/literature\.html"/);
  assert.match(lite,/href="\.\/legacy\.html"/);
  assert.doesNotMatch(lite,/id="literature"/);
  assert.doesNotMatch(lite,/src="\.\/src\/literature-ui\.mjs"/);
  assert.match(literature,/id="literature"/);
  assert.match(literature,/src="\.\/src\/literature-ui\.mjs"/);
  assert.doesNotMatch(literature,/src="\.\/src\/ui\.mjs"/);
  assert.match(literature,/class="page-tab" href="\.\/"/);
  assert.match(literature,/aria-current="page" href="\.\/literature\.html"/);
  assert.match(literature,/lit-detail/);
  assert.match(literature,/Novelty workbench/);
});

test("all direct legacy DOM IDs exist in legacy shell or explicitly rendered templates",()=>{
  const ids=[...ui.matchAll(/\$\("([A-Za-z][A-Za-z0-9-]*)"\)/g)].map(x=>x[1]);
  for(const id of new Set(ids))assert.ok(legacy.includes('id="'+id+'"')||ui.includes('id="'+id+'"'),"Neither static nor dynamic legacy markup defines #"+id);
});

test("all direct Lite DOM IDs exist in the Lite document",()=>{
  const ids=[...liteScript.matchAll(/el\("([A-Za-z][A-Za-z0-9-]*)"\)/g)].map(x=>x[1]);
  for(const id of new Set(ids))assert.ok(lite.includes('id="'+id+'"'),"Missing Lite element #"+id);
});

test("scientific disclaimers are available without JavaScript",()=>{
  assert.match(lite,/ATURAN PRIORITAS &amp; CLD BELUM TERVALIDASI/);
  assert.match(lite,/bukan keputusan otomatis/);
  assert.match(legacy,/DATA SINTETIS/);
  assert.match(legacy,/Scientific honesty by design/);
});

test("both the Lite workflow and old model builder have mobile styles",()=>{
  const mobile=readFileSync(new URL("../mobile.css",import.meta.url),"utf8");
  const simple=readFileSync(new URL("../simple.css",import.meta.url),"utf8");
  assert.match(legacy,/href="\.\/mobile\.css"/);
  assert.match(legacy,/id="inspector-close"/);
  assert.match(legacy,/id="inspector-backdrop"/);
  assert.match(legacy,/id="mobile-step-progress"/);
  assert.match(ui,/variable-cards/);
  assert.match(ui,/class="chart-scroll"/);
  assert.match(mobile,/max-width:850px/);
  assert.match(mobile,/max-width:580px/);
  assert.match(mobile,/max-width:360px/);
  assert.match(mobile,/\.inspector\.mobile-open/);
  assert.match(mobile,/\.variable-table\{display:none\}/);
  assert.match(simple,/max-width:800px/);
  assert.match(simple,/max-width:560px/);
});

test("legacy mobile interaction guards include focus, reset/undo and draft persistence",()=>{
  assert.match(ui,/function closeInspector\(/);
  assert.match(ui,/e\.key==="Escape"/);
  assert.match(ui,/e\.key!=="Tab"/);
  assert.match(ui,/window\.confirm\(/);
  assert.match(ui,/undo-reset/);
  assert.match(ui,/function persistDraft\(/);
  assert.match(ui,/localStorage\.setItem/);
  assert.match(ui,/prefers-reduced-motion/);
});
