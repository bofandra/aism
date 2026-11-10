import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  FIELDS,parseAggregateCsv,summarize,activeDeepQuestions,decisionOptions
} from "../src/episode-lite.mjs";

const sample=readFileSync(new URL("../samples/contoh-data-pengiriman-rme.csv",import.meta.url),"utf8");
const data=parseAggregateCsv(sample);
const profile=summarize(data);
const one=(vals)=>[FIELDS.join(","),vals.join(",")].join("\n");
const validRow=["2026-08","radiologi",120,10,5,0,105,80,70,15,5,5];

test("new CSV uses episode maturity, status partition, and strict subset",()=>{
  assert.equal(data.length,6);
  assert.equal(profile.gate,"READY");
  assert.equal(profile.aggregate.eligible_mature,5585);
  assert.equal(profile.aggregate.complete_core,4305);
  assert.equal(profile.aggregate.complete_strict,3930);
  assert.equal(profile.aggregate.unverified_linkage,0);
  assert.ok(profile.aggregate.strictRate<=profile.aggregate.coreRate);
});

test("statuses add to eligible; non-eligible never inflated as incomplete",()=>{
  const s=summarize(parseAggregateCsv(one(validRow)));
  assert.equal(s.aggregate.total_order,120);
  assert.equal(s.aggregate.eligible_mature,105);
  assert.equal(s.aggregate.not_yet_eligible,10);
  assert.equal(s.aggregate.excluded_order,5);
  assert.equal(s.aggregate.coreRate,80/105);
  assert.equal(s.aggregate.no_downstream_evidence,5);
});

test("invalid partition and invalid strict subset are rejected",()=>{
  const badPartition=[...validRow];badPartition[6]=106;
  assert.throws(()=>parseAggregateCsv(one(badPartition)),/total_order/);
  const badStatuses=[...validRow];badStatuses[9]=14;
  assert.throws(()=>parseAggregateCsv(one(badStatuses)),/status episode eligible/);
  const badStrict=[...validRow];badStrict[8]=81;
  assert.throws(()=>parseAggregateCsv(one(badStrict)),/complete_strict/);
});

test("no extra columns or patient identifiers are accepted",()=>{
  const str=one(validRow);
  assert.throws(()=>parseAggregateCsv(str.replace(FIELDS.join(","),FIELDS.join(",")+",nik").replace("80,70,15,5,5","80,70,15,5,5,123")),/kolom agregat/);
  assert.throws(()=>parseAggregateCsv(str.replace(FIELDS.join(","),FIELDS.join(",")+",nomor_rekam_medis").replace("80,70,15,5,5","80,70,15,5,5,123")),/kolom agregat/);
});

test("partial linkage causes HOLD and suspends technical recommendations",()=>{
  const row=[...validRow];row[5]=2;row[6]=103;row[7]=78;row[8]=68;
  // 78 + 15 + 5 + 5 = 103; totals 10 + 5 + 2 + 103 = 120.
  const p=summarize(parseAggregateCsv(one(row)));
  assert.equal(p.gate,"HOLD");
  const decisions=decisionOptions(p,{dicom_received:"tidak",semantic_error:"ya",approval:"ya"});
  assert.equal(decisions.length,1);
  assert.equal(decisions[0].status,"HOLD");
});

test("3-month trends capture declining laboratory series but insufficient single month",()=>{
  assert.equal(profile.trajectories.find(t=>t.service==="laboratorium").label,"menurun");
  assert.equal(summarize(parseAggregateCsv(one(validRow))).trajectories[0].label,"data belum cukup");
});

test("radiology missing downstream asks for source evidence, not automatic retry",()=>{
  const ids=activeDeepQuestions(profile,{}).map(x=>x.id);
  assert.ok(ids.includes("dicom_received"));
  const results=decisionOptions(profile,{dicom_received:"tidak_tahu",retryable:"tidak_tahu",semantic_error:"tidak_tahu",approval:"ya"});
  assert.equal(results.find(o=>o.scope==="Radiologi").status,"INVESTIGATE");
  assert.ok(results.every(o=>!o.title.includes("Tangani exception middleware")));
});

test("source-not-received and source-received-retryable lead to different paths",()=>{
  const missing=decisionOptions(profile,{dicom_received:"tidak",approval:"ya"});
  assert.ok(missing.some(o=>o.title.includes("penerimaan DICOM")&&o.status==="RECOMMEND"));
  assert.ok(missing.every(o=>!o.title.includes("Tangani exception middleware")));
  const retry=decisionOptions(profile,{dicom_received:"ya",retryable:"ya",approval:"ya"});
  assert.ok(retry.some(o=>o.title.includes("middleware")&&o.status==="RECOMMEND"));
});

test("mapping changes require explicit error evidence",()=>{
  const absent=decisionOptions(profile,{semantic_error:"tidak_tahu",approval:"ya"});
  assert.ok(absent.every(o=>!o.title.startsWith("Perbaiki error terminologi")));
  const evidenced=decisionOptions(profile,{semantic_error:"ya",approval:"ya"});
  assert.ok(evidenced.some(o=>o.title.startsWith("Perbaiki error terminologi")));
});

test("without human approval candidates are REVIEW not automatic change",()=>{
  const results=decisionOptions(profile,{dicom_received:"tidak",semantic_error:"ya"});
  assert.ok(results.some(o=>o.status==="REVIEW"));
  assert.ok(results.every(o=>o.status!=="RECOMMEND"));
});

test("CSV parser permits quoted values and semicolon delimiter",()=>{
  const header=FIELDS.join(";");
  const line=validRow.join(";");
  assert.equal(parseAggregateCsv(header+"\n"+line).length,1);
});

test("no eligible matured episodes triggers HOLD without dividing by zero",()=>{
  const row=["2026-08","laboratorium",10,10,0,0,0,0,0,0,0,0];
  const p=summarize(parseAggregateCsv(one(row)));
  assert.equal(p.aggregate.coreRate,null);
  assert.equal(p.gate,"HOLD");
});
