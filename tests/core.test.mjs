import test from "node:test";
import assert from "node:assert/strict";
import {getDomain,domainIds} from "../src/domains.mjs";
import {parse,evaluate,inferUnit,references,validateModel,simulate,compare,getLineage} from "../src/core.mjs";
test("parser only accepts safe expressions; no eval or property access",()=>{
  assert.equal(evaluate(parse("min(20,150+50*0.3)"),{}),20);
  assert.deepEqual(references(parse("U+N*p*dt")).sort(),["N","U","dt","p"]);
  assert.throws(()=>parse("process.exit(1)"),/Karakter|Token/);
  assert.throws(()=>parse("Math.random()"),/Karakter|Token/);
  assert.throws(()=>evaluate(parse("5/0"),{}),/nol/);
});
test("unit checker rejects adding tickets to episodes",()=>{
  assert.throws(()=>inferUnit(parse("E+Q"),{E:"episode",Q:"ticket"}),/Satuan/);
  assert.deepEqual(inferUnit(parse("N*p*dt"),{N:"episode/week",p:"ratio",dt:"week"}),{episode:1});
});
test("SATUSEHAT baseline one week matches documented arithmetic",()=>{
  const model=getDomain("satusehat");
  assert.deepEqual(validateModel(model).filter(i=>i.severity==="BLOCK"),[]);
  const s=simulate(model,"baseline",1);
  assert.equal(s.points[1].E,550);assert.equal(s.points[1].U,145);
  assert.equal(s.points[1].Q,95);
  assert.ok(Math.abs(s.points[1].value-405/550)<1e-10);
  assert.equal(s.snapshots[0].terms.K_eff,20);
});
test("scenario effects use transparent explicit assumptions",()=>{
  const m=getDomain("satusehat");
  const results=compare(m,1);
  const values=results.map(x=>x.points[1].value);
  assert.ok(Math.abs(values[0]-405/550)<1e-10);
  assert.ok(Math.abs(values[1]-410/550)<1e-10);
  assert.ok(Math.abs(values[2]-410/550)<1e-10);
  assert.ok(Math.abs(values[3]-415/550)<1e-10);
});
test("denominator zero, invalid range and missing formula are blocked",()=>{
  const m=getDomain("satusehat");m.variables.find(v=>v.id==="E").value=0;
  assert.ok(validateModel(m).some(x=>x.code==="DENOMINATOR"));
  const n=getDomain("satusehat");n.variables.find(v=>v.id==="p").value=1.4;
  assert.ok(validateModel(n).some(x=>x.code==="VAR_RANGE"));
  const o=getDomain("satusehat");o.formulas.find(f=>f.id==="U_next").expr="U+Q";
  assert.ok(validateModel(o).some(x=>x.code==="FORMULA"));
});
test("capacity clipping and stock conservation",()=>{
  const m=getDomain("satusehat");
  m.variables.find(v=>v.id==="K").value=1000;
  const x=simulate(m,"baseline",1);
  assert.equal(x.points[1].U,0);assert.equal(x.points[1].value,1);
});
test("lineage includes upstream parameters and intermediate formulas",()=>{
  const x=getLineage(getDomain("satusehat"),"R_next");
  assert.ok(x.some(z=>z.id==="N"&&z.type==="variable"));
  assert.ok(x.some(z=>z.id==="p"&&z.type==="variable"));
  assert.equal(x.at(-1).id,"R_next");
});
test("all three case configurations run through the same engine",()=>{
  for(const id of domainIds){
    const m=getDomain(id);
    assert.deepEqual(validateModel(m).filter(i=>i.severity==="BLOCK"),[],id);
    const sims=compare(m,12);
    assert.equal(sims.length,4);
    for(const x of sims){
      assert.equal(x.points.length,13);
      assert.ok(x.points.every(p=>p.value>=0&&p.value<=1),id);
    }
  }
});
test("deterministic replay",()=>{
  const m=getDomain("logistics");
  assert.deepEqual(simulate(m,"routing",12),simulate(m,"routing",12));
});
