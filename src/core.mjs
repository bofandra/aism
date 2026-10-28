// AISM Lab v0.2 — deterministic, dependency-aware, no-eval formula engine.
const rx=/\s*([A-Za-z_][A-Za-z0-9_]*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[()+*/,-])/y;
export function parse(expression){
  if(typeof expression!=="string"||!expression.trim())throw Error("Persamaan kosong");
  let tokens=[],i=0;
  while(i<expression.length){
    rx.lastIndex=i;const m=rx.exec(expression);
    if(!m){if(!expression.slice(i).trim())break;throw Error("Karakter tidak diizinkan pada posisi "+i);}
    tokens.push(m[1]);i=rx.lastIndex;
  }
  let pos=0;const peek=()=>tokens[pos];const take=()=>tokens[pos++];
  function primary(){
    const t=take();
    if(t===undefined)throw Error("Persamaan belum selesai");
    if(t==="+"||t==="-")return {type:"unary",op:t,arg:primary()};
    if(t==="("){const out=add();if(take()!==")")throw Error("Kurung penutup diperlukan");return out;}
    if(/^(?:\d|\.)/.test(t)){const v=Number(t);if(!Number.isFinite(v))throw Error("Angka tidak valid");return {type:"num",value:v};}
    if(/^[A-Za-z_]/.test(t)){
      if(peek()==="("){take();const args=[];if(peek()!==")"){do{args.push(add());if(peek()!==",")break;take();}while(true);}if(take()!==")")throw Error("Sintaks fungsi tidak valid");if(!["min","max","clamp"].includes(t))throw Error("Fungsi tidak diizinkan: "+t);if((t==="clamp"&&args.length!==3)||(t!=="clamp"&&args.length<1))throw Error("Jumlah argumen "+t+" tidak tepat");return {type:"call",name:t,args};}
      return {type:"var",name:t};
    }
    throw Error("Token tidak valid: "+t);
  }
  function mult(){let node=primary();while(peek()==="*"||peek()==="/"){let op=take();node={type:"binary",op,left:node,right:primary()};}return node;}
  function add(){let node=mult();while(peek()==="+"||peek()==="-"){let op=take();node={type:"binary",op,left:node,right:mult()};}return node;}
  const ast=add();if(pos!==tokens.length)throw Error("Token tersisa setelah persamaan: "+peek());return ast;
}
function dimCopy(d){return {...d};}
export function unitDimension(unit){
  if(!unit||unit==="ratio"||unit==="dimensionless")return {};
  const bits=unit.split("/");if(bits.length>2)throw Error("Satuan tidak dikenal: "+unit);
  const result={};function apply(part,sgn){for(const key of part.split("*").filter(Boolean)){const k=key.trim();if(!/^[A-Za-z_]+$/.test(k))throw Error("Satuan tidak diizinkan: "+unit);result[k]=(result[k]||0)+sgn;}}
  apply(bits[0],1);if(bits[1])apply(bits[1],-1);return Object.fromEntries(Object.entries(result).filter(([,v])=>v!==0).sort());
}
function combine(a,b,sgn){const d=dimCopy(a);for(const [k,v] of Object.entries(b)){d[k]=(d[k]||0)+v*sgn;if(!d[k])delete d[k];}return d;}
function same(a,b){return JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());}
export function inferUnit(ast,lookup){
  if(ast.type==="num")return {};
  if(ast.type==="var"){if(!(ast.name in lookup))throw Error("Variabel tidak ditemukan: "+ast.name);return unitDimension(lookup[ast.name]);}
  if(ast.type==="unary")return inferUnit(ast.arg,lookup);
  if(ast.type==="binary"){
    const a=inferUnit(ast.left,lookup),b=inferUnit(ast.right,lookup);
    if(ast.op==="+"||ast.op==="-"){if(!same(a,b))throw Error("Satuan tidak kompatibel untuk "+ast.op);return a;}
    return combine(a,b,ast.op==="*"?1:-1);
  }
  if(ast.type==="call"){
    const ds=ast.args.map(x=>inferUnit(x,lookup));
    if(ds.some(x=>!same(x,ds[0])))throw Error("Satuan argumen fungsi "+ast.name+" berbeda");
    return ds[0];
  }
  throw Error("Node formula tidak dikenal");
}
export function evaluate(ast,ctx){
  let v;
  if(ast.type==="num")v=ast.value;
  if(ast.type==="var"){if(!(ast.name in ctx))throw Error("Nilai tidak tersedia: "+ast.name);v=ctx[ast.name];}
  if(ast.type==="unary")v=(ast.op==="-"?-1:1)*evaluate(ast.arg,ctx);
  if(ast.type==="binary"){
    const a=evaluate(ast.left,ctx),b=evaluate(ast.right,ctx);
    if(ast.op==="/"){if(Math.abs(b)<1e-12)throw Error("Pembagian dengan nol");v=a/b;}
    else if(ast.op==="+")v=a+b;else if(ast.op==="-")v=a-b;else v=a*b;
  }
  if(ast.type==="call"){
    const x=ast.args.map(n=>evaluate(n,ctx));
    v=ast.name==="min"?Math.min(...x):ast.name==="max"?Math.max(...x):Math.max(x[1],Math.min(x[2],x[0]));
  }
  if(!Number.isFinite(v))throw Error("Hasil tidak hingga / bukan angka");return v;
}
export function references(ast){
  const ids=new Set();function walk(n){if(n.type==="var")ids.add(n.name);else if(n.type==="binary"){walk(n.left);walk(n.right);}else if(n.type==="unary")walk(n.arg);else if(n.type==="call")n.args.forEach(walk);}
  walk(ast);return [...ids];
}
const issue=(severity,code,message,target)=>({severity,code,message,target});
export function validateModel(model){
  const issues=[];if(!model||!Array.isArray(model.variables)||!Array.isArray(model.formulas))return [issue("BLOCK","SCHEMA","Model tidak lengkap","model")];
  const units={dt:model.timeUnit||"week"},seen=new Set(),varMap={};
  for(const v of model.variables){
    if(!/^[A-Za-z_][A-Za-z_0-9]*$/.test(v.id)||seen.has(v.id)||v.id==="dt")issues.push(issue("BLOCK","VAR_ID","ID variabel tidak valid/duplikat: "+v.id,v.id));
    seen.add(v.id);varMap[v.id]=v;
    try{unitDimension(v.unit);}catch(err){issues.push(issue("BLOCK","VAR_UNIT",err.message,v.id));}
    if(!Number.isFinite(Number(v.value)))issues.push(issue("BLOCK","VAR_VALUE","Nilai variabel harus numerik",v.id));
    if(v.min!==undefined&&Number(v.value)<Number(v.min)||v.max!==undefined&&Number(v.value)>Number(v.max))issues.push(issue("BLOCK","VAR_RANGE","Nilai di luar rentang",v.id));
    if(!v.definition||!v.source)issues.push(issue("WARN","PROVENANCE","Definisi/sumber variabel belum lengkap",v.id));
    units[v.id]=v.unit;
  }
  for(const eq of model.formulas){
    if(seen.has(eq.id)||! /^[A-Za-z_][A-Za-z_0-9]*$/.test(eq.id))issues.push(issue("BLOCK","FORMULA_ID","ID persamaan duplikat atau tidak valid: "+eq.id,eq.id));
    if(!eq.source||!eq.why)issues.push(issue("WARN","FORMULA_PROVENANCE","Alasan/sumber formula belum lengkap",eq.id));
    try{
      const ast=parse(eq.expr), actual=inferUnit(ast,units),expected=unitDimension(eq.unit);
      if(!same(actual,expected))issues.push(issue("BLOCK","DIMENSION","Satuan hasil "+eq.id+" tidak sesuai dengan "+eq.unit,eq.id));
      if(references(ast).includes(eq.id))issues.push(issue("BLOCK","SELF_REF","Persamaan mereferensi dirinya sendiri",eq.id));
    }catch(err){issues.push(issue("BLOCK","FORMULA",err.message,eq.id));}
    seen.add(eq.id);units[eq.id]=eq.unit;
  }
  for(const [stock,formula] of Object.entries(model.updates||{})){
    if(!varMap[stock]||!seen.has(formula))issues.push(issue("BLOCK","UPDATE","Update stok tidak ditemukan: "+stock+" ← "+formula,stock));
    else if(!same(unitDimension(varMap[stock].unit),unitDimension(units[formula])))issues.push(issue("BLOCK","UPDATE_UNIT","Satuan stok berbeda dari hasil update",stock));
  }
  if(!seen.has(model.output))issues.push(issue("BLOCK","OUTCOME","Output persamaan tidak ditemukan",model.output));
  if(model.outcome){
    try{
      const d=parse(model.outcome.denominator);
      inferUnit(d,units);
      const vals=Object.fromEntries(model.variables.map(v=>[v.id,Number(v.value)]));
      const n=evaluate(d,vals);
      if(n<=0)issues.push(issue("BLOCK","DENOMINATOR","Penyebut outcome awal harus > 0",model.outcome.id));
      const numer=evaluate(parse(model.outcome.numerator),vals);
      if(numer<0||numer>n+1e-8)issues.push(issue("BLOCK","COHORT","Numerator outcome di luar 0..denominator",model.outcome.id));
    }catch(err){issues.push(issue("BLOCK","OUTCOME_INITIAL",err.message,model.outcome.id));}
  }
  for(const inter of model.interventions||[]){
    for(const [id,val] of Object.entries(inter.changes||{})){
      if(!varMap[id])issues.push(issue("BLOCK","INTERVENTION_TARGET","Target intervensi tidak ditemukan: "+id,inter.id));
      else if(!Number.isFinite(Number(val))||(varMap[id].min!==undefined&&val<varMap[id].min)||(varMap[id].max!==undefined&&val>varMap[id].max))issues.push(issue("BLOCK","INTERVENTION_RANGE","Nilai intervensi di luar rentang: "+id,inter.id));
    }
    if(inter.source==="synthetic")issues.push(issue("WARN","SYNTHETIC_EFFECT","Efek intervensi masih asumsi demonstrasi",inter.id));
  }
  for(const edge of model.edges||[]){
    if(!seen.has(edge.from)||!seen.has(edge.to))issues.push(issue("WARN","EDGE_REF","Hubungan merujuk variabel/rumus yang tidak terdaftar",edge.id));
    if(!edge.why)issues.push(issue("WARN","EDGE_EVIDENCE","Justifikasi hubungan belum terisi",edge.id));
  }
  return issues;
}
export function getLineage(model,eqId){
  const eqs=Object.fromEntries(model.formulas.map(f=>[f.id,f]));
  const vars=Object.fromEntries(model.variables.map(v=>[v.id,v]));
  const visited=new Set(),list=[];
  function visit(id){
    if(visited.has(id))return;visited.add(id);
    if(vars[id]){list.push({id,type:"variable",source:vars[id].source,unit:vars[id].unit,label:vars[id].label});return;}
    const eq=eqs[id];if(!eq)return;
    for(const dep of references(parse(eq.expr)))if(dep!=="dt")visit(dep);
    list.push({id,type:"formula",source:eq.source,unit:eq.unit,label:eq.label});
  }
  visit(eqId);return list;
}
export function simulate(model,interventionId="baseline",weeks=model.horizon||12){
  const blocking=validateModel(model).filter(i=>i.severity==="BLOCK");
  if(blocking.length)throw Error(blocking.map(i=>i.message).join("; "));
  const inter=(model.interventions||[]).find(i=>i.id===interventionId);
  if(interventionId!=="baseline"&&!inter)throw Error("Intervensi tidak ditemukan");
  const state=Object.fromEntries(model.variables.map(v=>[v.id,Number(v.value)]));
  const out=(s)=>evaluate(parse(model.outcome.numerator),s)/evaluate(parse(model.outcome.denominator),s);
  const result=[{week:0,value:out(state),...state}],snapshots=[];
  const compiled=model.formulas.map(f=>({...f,ast:parse(f.expr)}));
  for(let week=1;week<=weeks;week++){
    const context={...state,dt:model.dt||1};
    if(inter&&week>=(inter.delay||0)+1)Object.assign(context,inter.changes);
    for(const f of compiled)context[f.id]=evaluate(f.ast,context);
    for(const [target,source] of Object.entries(model.updates))state[target]=context[source];
    for(const v of model.variables)if(!(v.id in model.updates)&&! (inter&&v.id in inter.changes))state[v.id]=context[v.id];
    for(const stock of Object.keys(model.updates))if(state[stock]<-1e-8)throw Error("Stok negatif: "+stock);
    const value=context[model.output];if(value< -1e-8||value>1+1e-8)throw Error("Outcome keluar rentang rasio: "+value);
    result.push({week,value,...state});
    snapshots.push({week,terms:Object.fromEntries(compiled.map(f=>[f.id,context[f.id]])),input:Object.fromEntries(model.variables.map(v=>[v.id,context[v.id]]))});
  }
  return {id:interventionId,name:inter?.label||"Baseline",points:result,snapshots,assumptions:inter?.changes||{},delay:inter?.delay||0};
}
export function compare(model,weeks=model.horizon||12){
  const candidates=["baseline",...(model.interventions||[]).map(i=>i.id)];
  return candidates.map(id=>simulate(model,id,weeks));
}
