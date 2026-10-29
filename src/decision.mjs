// AISM v0.3 — auditable, non-clinical decision support.
// Scores are NOT inferred from causal claims; gates and assumptions stay visible.
import {compare} from "./core.mjs";

export function diagnose(model){
  const byId=Object.fromEntries((model.variables||[]).map(v=>[v.id,v]));
  return (model.diagnosticRules||[]).map(rule=>{
    const variable=byId[rule.variableId];
    if(!variable||!Number.isFinite(Number(rule.threshold))||!["min","max"].includes(rule.comparator)){
      return {...rule,status:"UNDEFINED",gap:null,variable};
    }
    const gap=rule.comparator==="max"?Number(variable.value)-Number(rule.threshold):Number(rule.threshold)-Number(variable.value);
    const relatedEdges=(model.edges||[]).filter(e=>e.from===rule.variableId||e.to===rule.variableId).map(e=>e.id);
    return {...rule,variable,gap:Math.max(0,gap),status:gap>1e-10?"GAP":"WITHIN_TARGET",relatedEdges};
  });
}

export function assessInterventions(model,provided={}){
  const config={budget:4,maxRisk:3,minGainPp:1,...(model.decisionConfig||{}),...provided};
  for(const key of ["budget","maxRisk","minGainPp"])
    if(!Number.isFinite(Number(config[key]))||Number(config[key])<0)throw Error("Batas keputusan tidak valid: "+key);
  const runs=compare(model,model.horizon||12);
  const baseline=runs[0].points.at(-1).value;
  const gaps=new Set(diagnose(model).filter(x=>x.status==="GAP").map(x=>x.variableId));
  const options=(model.interventions||[]).map(inter=>{
    const sim=runs.find(r=>r.id===inter.id);
    const final=sim.points.at(-1).value;
    const gainPp=100*(final-baseline);
    const matched=(inter.targets||[]).filter(x=>gaps.has(x));
    const reasons=[];
    // Financial values are ordinal demo indicators, not monetary costs.
    if(Number(inter.cost)>Number(config.budget))reasons.push("Biaya relatif melebihi batas ("+inter.cost+" > "+config.budget+").");
    if(Number(inter.risk)>Number(config.maxRisk))reasons.push("Risiko relatif melebihi batas ("+inter.risk+" > "+config.maxRisk+").");
    if(gainPp<Number(config.minGainPp)-1e-8)reasons.push("Kenaikan outcome di bawah ambang "+config.minGainPp+" poin persentase.");
    const barred=reasons.length>0;
    if(!matched.length)reasons.push("Tidak ada gap diagnosis yang dipetakan secara eksplisit ke intervensi.");
    const source=(inter.source||"synthetic").toLowerCase();
    const supported=["expert","observational","quasi_experimental","experimental"].includes(source)
      && Boolean(inter.reference)&&!/^asumsi/i.test(inter.reference);
    if(!supported)reasons.push("Efek intervensi belum memiliki bukti empiris/ahli yang dicatat; bukan estimasi kausal.");
    // Even evidence declared by a user does not constitute independent verification.
    const status=barred?"HOLD":!supported||!matched.length?"INVESTIGATE":"REVIEW_PILOT";
    if(status==="REVIEW_PILOT")reasons.push("Kandidat kajian pilot saja; sumber yang diinput pengguna belum diverifikasi dan keputusan tetap memerlukan persetujuan manusia.");
    return {id:inter.id,label:inter.label,status,gainPp,final,matched,source,cost:inter.cost,risk:inter.risk,reasons,delay:inter.delay||0};
  });
  const rank={REVIEW_PILOT:0,INVESTIGATE:1,HOLD:2};
  options.sort((a,b)=>rank[a.status]-rank[b.status]||b.gainPp-a.gainPp||(a.cost??0)-(b.cost??0)||a.id.localeCompare(b.id));
  return {config,baseline,options,gaps:[...gaps],policy:"Gates eksplisit; bukan skor kausal atau rekomendasi otomatis."};
}
