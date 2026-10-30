import test from "node:test";
import assert from "node:assert/strict";
import {curatedStudies,dimensions,noveltyClaims,filterStudies,dimensionCoverage,reviewProtocol} from "../src/literature-data.mjs";
test("bibliography has verified-style DOI identifiers and unique records",()=>{
 assert.ok(curatedStudies.length>=12);
 assert.equal(new Set(curatedStudies.map(s=>s.id)).size,curatedStudies.length);
 assert.equal(new Set(curatedStudies.map(s=>s.doi.toLowerCase())).size,curatedStudies.length);
 for(const paper of curatedStudies){
  assert.match(paper.doi,/^10\.\d{4,9}\/\S+$/);
  assert.equal(paper.link,"https://doi.org/"+paper.doi);
  assert.ok(paper.summary&&paper.overlap&&paper.caveat);
  assert.ok(["dsr","systems","implementation","adaptive","decision"].includes(paper.family));
  for(const dim of dimensions)assert.ok([0,1,2].includes(paper.coverage[dim.id]));
 }
});
test("novelty workbench acknowledges closest prior methods and falsifiability",()=>{
 assert.equal(noveltyClaims.length,3);
 for(const claim of noveltyClaims){
   assert.ok(claim.hypothesis&&claim.risk&&claim.test);
   assert.ok(claim.near.length>=3);
   for(const id of claim.near)assert.ok(curatedStudies.find(p=>p.id===id),"missing comparator "+id);
 }
 assert.match(reviewProtocol.warning,/Ketiadaan.*tidak membuktikan novelty/);
});
test("search and discipline filters work and never mutate original sources",()=>{
 const matching=filterStudies(curatedStudies,{search:"Implementation Mapping"});
 assert.equal(matching.length,1);
 assert.equal(matching[0].id,"fernandez2019");
 const dynamic=filterStudies(curatedStudies,{dimension:"sim",minLevel:2});
 assert.ok(dynamic.some(s=>s.id==="homer2006"));
 assert.ok(dynamic.every(s=>s.coverage.sim===2));
 const adaptive=filterStudies(curatedStudies,{family:"adaptive"});
 assert.ok(adaptive.length>=3);
 const c=dimensionCoverage(curatedStudies,"select");
 assert.ok(c.central>=5&&c.reviewed===curatedStudies.length);
});
test("a missing dimension classification never implies literature absence",()=>{
 assert.match(reviewProtocol.legend[0],/bukan bukti/);
 assert.match(reviewProtocol.kind,/not a systematic/);
});
