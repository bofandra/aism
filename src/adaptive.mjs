// AISM v0.3 — observed-versus-simulated feedback with optional single-parameter fitting.
// Fitting ONE observation never identifies the causal mechanism.
import {simulate,parse,references} from "./core.mjs";

export function assessFeedback(model,record,tolerancePp=3){
  if(!Number.isInteger(Number(record.week))||Number(record.week)<1||Number(record.week)>(model.horizon||12))
    throw Error("Minggu pengamatan di luar horizon.");
  const observed=Number(record.observedRate);
  if(!Number.isFinite(observed)||observed<0||observed>1)throw Error("Outcome teramati harus 0 sampai 1.");
  const scenario=record.scenarioId||"baseline";
  const prediction=simulate(model,scenario,Number(record.week)).points.at(-1).value;
  const deviationPp=100*(observed-prediction);
  return {predictedRate:prediction,observedRate:observed,deviationPp,absDeviationPp:Math.abs(deviationPp),
    status:Math.abs(deviationPp)>tolerancePp?"REVIEW":"WITHIN_TOLERANCE",tolerancePp};
}

export function proposeCalibration(model,record,parameterId){
  const variable=model.variables.find(v=>v.id===parameterId);
  if(!variable||!["flow","parameter"].includes(variable.kind))throw Error("Pilih satu parameter/flow yang dapat diubah, bukan stok.");
  const scenario=record.scenarioId||"baseline";
  const intervention=(model.interventions||[]).find(x=>x.id===scenario);
  if(scenario!=="baseline"&&!intervention)throw Error("Skenario tidak dikenal.");
  if(intervention&&Object.prototype.hasOwnProperty.call(intervention.changes||{},parameterId))
    throw Error("Parameter ini ditetapkan langsung oleh intervensi sehingga tidak dapat diidentifikasi dari skenario tersebut.");
  if(!model.formulas.some(f=>references(parse(f.expr)).includes(parameterId)))
    throw Error("Parameter tidak digunakan dalam persamaan.");
  const original=Number(variable.value), min=Number(variable.min??0), max=Number(variable.max??Infinity);
  if(!Number.isFinite(original))throw Error("Nilai parameter awal tidak valid.");
  const lower=Math.max(min,original>0?original*0.5:0);
  const upper=Math.min(max,original>0?original*1.5:(Number.isFinite(max)?Math.min(1,max):1));
  if(!(upper>lower))throw Error("Rentang pencarian kalibrasi kosong.");
  const originalAssessment=assessFeedback(model,record);
  let best=null;
  const clone=JSON.parse(JSON.stringify(model));
  const candidate=clone.variables.find(v=>v.id===parameterId);
  // Coarse deterministic bounded local search: transparent, deliberately not an optimizer for policy.
  for(let i=0;i<=80;i++){
    const value=lower+(upper-lower)*i/80;
    candidate.value=value;
    try{
      const predictedRate=simulate(clone,scenario,Number(record.week)).points.at(-1).value;
      const errorPp=Math.abs(100*(Number(record.observedRate)-predictedRate));
      if(!best||errorPp<best.errorPp)best={value,predictedRate,errorPp};
    }catch{/* infeasible candidate: do not adopt */}
  }
  if(!best)throw Error("Tidak ada kandidat parameter yang valid.");
  return {parameterId,previousValue:original,...best,
    originalErrorPp:originalAssessment.absDeviationPp,range:[lower,upper],
    boundary:Math.abs(best.value-lower)<1e-9||Math.abs(best.value-upper)<1e-9,
    warning:"Fitting lokal satu parameter, bukan identifikasi kausal. Data tambahan, validasi dan persetujuan manual diperlukan."};
}
