// AISM v0.2.1 responsive browser smoke tests.
// This test intentionally exercises actual browser rendering, not just CSS text.
import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import assert from "node:assert/strict";

const root=process.cwd();
const mime={".html":"text/html;charset=utf-8",".css":"text/css;charset=utf-8",".mjs":"text/javascript;charset=utf-8",".js":"text/javascript;charset=utf-8"};
const server=createServer(async(req,res)=>{
  const name=decodeURIComponent((req.url||"/").split("?")[0]);
  const path=resolve(root,"."+ (name==="/"?"/index.html":name));
  if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{const data=await readFile(path);res.writeHead(200,{"Content-Type":mime[extname(path)]||"application/octet-stream"});res.end(data);}
  catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const address="http://127.0.0.1:"+server.address().port+"/";
const browser=await chromium.launch({headless:true});
let failures=0;
try{
  await mkdir("tests/screenshots",{recursive:true});
  for(const width of [320,360,390,430,768,1280]){
    const page=await browser.newPage({viewport:{width,height:860},deviceScaleFactor:1,isMobile:width<850,hasTouch:width<850});
    page.on("pageerror",e=>{console.error("PAGE ERROR",width,e.message);failures++;});
    await page.goto(address,{waitUntil:"networkidle"});
    await page.locator("#work-area").waitFor();
    await page.screenshot({path:"tests/screenshots/aism-"+width+".png",fullPage:true});
    const dimensions=await page.evaluate(()=>({viewport:innerWidth,body:document.body.scrollWidth,root:document.documentElement.scrollWidth}));
    assert.ok(dimensions.root<=dimensions.viewport+2,"Horizontal page overflow "+width+": "+JSON.stringify(dimensions));
    if(width<=768){
      assert.equal(await page.locator(".variable-cards").isVisible(),true,"Variable cards hidden at "+width);
      assert.equal(await page.locator(".variable-table").isVisible(),false,"Desktop table visible at "+width);
      const cardButton=page.locator('.variable-card [data-inspect]').first();
      const size=await cardButton.boundingBox();
      assert.ok(size.height>=43,"Touch target too small "+width+": "+size.height);
      await cardButton.click();
      assert.equal(await page.locator("#inspector").isVisible(),true,"Inspector not visible on "+width);
      assert.equal(await page.locator("#inspector").getAttribute("role"),"dialog");
      assert.equal(await page.locator("body").evaluate(e=>e.classList.contains("sheet-open")),true);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#inspector").isVisible(),false,"Inspector did not close on Escape "+width);
      await page.locator('[data-step="formulas"]').click();
      assert.ok(await page.locator(".formula-card").count()>0);
      await page.locator("#advanced").click();
      assert.ok(await page.locator("textarea.formula-input").count()>0);
      await page.locator('[data-step="interventions"]').click();
      const chart=page.locator(".chart-scroll");
      assert.equal(await chart.isVisible(),true);
      const max=await chart.evaluate(e=>e.scrollWidth-e.clientWidth);
      if(width<=430)assert.ok(max>0,"Chart did not scroll at "+width);
      if(max>0){await chart.evaluate(e=>e.scrollLeft=125);assert.ok((await chart.evaluate(e=>e.scrollLeft))>0);}
      await page.locator('[data-step="variables"]').click();
      const value=page.locator('.variable-card [data-value="E"]').first();
      await value.fill("640");
      await value.press("Tab");
      assert.equal(await page.locator('.variable-card [data-value="E"]').inputValue(),"640");
      await page.reload({waitUntil:"networkidle"});
      assert.equal(await page.locator('.variable-card [data-value="E"]').inputValue(),"640","Autosave not restored on "+width);
      page.once("dialog",async dialog=>await dialog.accept());
      await page.locator("#reset").click();
      assert.equal(await page.locator('.variable-card [data-value="E"]').inputValue(),"500");
      await page.locator("#undo-reset").click();
      assert.equal(await page.locator('.variable-card [data-value="E"]').inputValue(),"640","Undo reset failed");
    }else{
      assert.equal(await page.locator(".variable-table").isVisible(),true);
      assert.equal(await page.locator("#inspector").isVisible(),true);
      assert.equal(await page.locator(".variable-cards").isVisible(),false);
    }
    console.log("PASS responsive viewport",width);
    await page.close();
  }
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
assert.equal(failures,0,"Browser JavaScript errors detected");
console.log("PASS mobile/tablet/desktop browser smoke suite");
