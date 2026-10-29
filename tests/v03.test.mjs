import test from "node:test";
import assert from "node:assert/strict";
import {getDomain,domainIds} from "../src/domains.mjs";
import {diagnose,assessInterventions} from "../src/decision.mjs";
import {simulate} from "../src/core.mjs";
import {assessFeedback,proposeCalibration} from "../src/adaptive.mjs";

test("all example domains provide readable diagnostic rules",()=>{
  for(const id of domainIds){
    const m=getDomain(id),d=diagnose(m);
    assert.ok(d.length>=2,id);
    assert.ok(d.some(x=>x.status==="GAP"),id);
    assert.ok(d.every(x=>x.variable&&x.status!=="UNDEFINED"),id);
  }
});
test("SATUSEHAT status is investigative with synthetic-only evidence",()=>{
  const m=getDomain("satusehat"),r=assessInterventions(m,{budget:5,maxRisk:3,minGainPp:0});
  assert.equal(r.options.length,3);
  assert.ok(r.options.every(x=>x.status==="INVESTIGATE"));
  assert.ok(r.options.some(x=>x.matched.includes("p")));
  assert.ok(r.options.every(x=>x.gainPp>=0));
});
test("budget and risk gate prevent false endorsements",()=>{
  const m=getDomain("satusehat");
  const x=assessInterventions(m,{budget:1,maxRisk:0,minGainPp:1});
  assert.ok(x.options.every(v=>v.status==="HOLD"));
});
test("declared external evidence only makes a pilot-review candidate, not verified recommendation",()=>{
  const m=getDomain("satusehat"),a=m.interventions[0];
  a.source="observational";a.reference="User-declared pilot dataset: evidence still requires independent review.";
  const r=assessInterventions(m,{budget:5,maxRisk:3,minGainPp:0});
  assert.equal(r.options.find(x=>x.id===a.id).status,"REVIEW_PILOT");
});
test("observation gap is calculated in percentage points",()=>{
  const m=getDomain("satusehat");
  const rec={week:3,scenarioId:"baseline",observedRate:0.5};
  const x=assessFeedback(m,rec,3);
  assert.equal(x.status,"REVIEW");
  assert.ok(x.deviationPp<0);
  assert.throws(()=>assessFeedback(m,{...rec,observedRate:2}),/0 sampai 1/);
});
test("fitting yields preview only; original model remains unchanged",()=>{
  const m=getDomain("satusehat"),p=m.variables.find(v=>v.id==="p");
  const actual=getDomain("satusehat");actual.variables.find(v=>v.id==="p").value=0.40;
  const observed=simulate(actual,"baseline",5).points.at(-1).value;
  const proposal=proposeCalibration(m,{scenarioId:"baseline",week:5,observedRate:observed},"p");
  assert.ok(proposal.errorPp<0.25);
  assert.ok(Math.abs(proposal.value-0.4)<0.02);
  assert.equal(p.value,0.3);
  assert.throws(()=>proposeCalibration(m,{scenarioId:"mapping",week:5,observedRate:observed},"p"),/ditetapkan langsung/);
});
