import {getDomain,domainIds} from "./domains.mjs";
import {parse,references,getLineage,validateModel,compare,simulate} from "./core.mjs";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number=x=>Number.isFinite(Number(x))?Number(x).toLocaleString("id-ID",{maximumFractionDigits:3}):"—";
const percent=x=>Number.isFinite(x)?(x*100).toLocaleString("id-ID",{maximumFractionDigits:2})+"%":"—";
const options=[
  ["variables","STEP 01 / VARIABLE IDENTIFICATION","Variabel apa yang membentuk masalah?","Telusuri definisi, satuan, asal data dan peran setiap variabel. Angka demo bukan parameter penelitian."],
  ["mechanisms","STEP 02 / MECHANISM MODELING","Bagaimana variabel saling terkait?","Hubungan di bawah masih berupa hipotesis. Arah pengaruh bukan bukti sebab-akibat."],
  ["formulas","STEP 03 / FORMULA CONSTRUCTION","Dari variabel menjadi persamaan","Persamaan mempunyai satuan, dependensi, alasan dan sumber. Advanced Mode membuka editor formula aman."],
  ["interventions","STEP 04 / INTERVENTIONS & SIMULATION","Apa yang terjadi jika kita bertindak?","Ubah tuas intervensi, lalu bandingkan baseline dan hasil hipotetis. Efeknya belum dikalibrasi."],
  ["evaluation","STEP 05 / EVALUATION & LEARNING","Apakah model ini bisa dipercaya?","Periksa validasi teknis, asumsi, sensitivitas, dan ekspor model lengkap untuk review pakar."]
];
const DRAFT_KEY="aism-lab-v0.2.1-drafts";
const clone=x=>JSON.parse(JSON.stringify(x));
function readDrafts(){
  try{
    const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||"{}");
    return d&&typeof d==="object"&&d.models&&typeof d.models==="object"?d:{models:{}};
  }catch{return {models:{}};}
}
function usableModel(m){return m&&typeof m==="object"&&Array.isArray(m.variables)&&m.variables.length>0&&Array.isArray(m.edges)&&Array.isArray(m.formulas)&&Array.isArray(m.interventions)&&m.outcome&&m.updates;}
const draft=readDrafts();
const initialId=domainIds.includes(draft.activeId)?draft.activeId:"satusehat";
const initialModel=usableModel(draft.models[initialId])?draft.models[initialId]:getDomain(initialId);
const state={model:initialModel,step:Math.min(4,Math.max(0,Number(draft.step)||0)),advanced:!!draft.advanced,selected:{kind:"variable",id:initialModel.variables[0].id},scenario:"baseline",addVariable:false,addEdge:false,feedback:"",inspectorOpen:false,returnFocusSpec:null,undoSnapshot:null};
const isMobile=()=>window.matchMedia("(max-width:850px)").matches;
const motion=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
function persistDraft(){
  try{
    const d=readDrafts();d.models[state.model.id]=clone(state.model);d.activeId=state.model.id;d.step=state.step;d.advanced=state.advanced;
    localStorage.setItem(DRAFT_KEY,JSON.stringify(d));
  }catch{/* private browsing or blocked storage: manual JSON export still works */}
}
function applyInspectorState(){
  const open=isMobile()&&state.inspectorOpen;
  $("inspector").classList.toggle("mobile-open",open);
  $("inspector-backdrop").classList.toggle("mobile-open",open);
  document.body.classList.toggle("sheet-open",open);
  if(isMobile()){
    $("inspector").setAttribute("role","dialog");
    $("inspector").setAttribute("aria-modal",open?"true":"false");
    $("inspector").setAttribute("aria-labelledby","inspector-heading");
    $("inspector").inert=!open;
  }else{
    $("inspector").removeAttribute("role");
    $("inspector").removeAttribute("aria-modal");
    $("inspector").removeAttribute("aria-labelledby");
    $("inspector").inert=false;
  }
}
function closeInspector(){
  if(!state.inspectorOpen)return;
  state.inspectorOpen=false;applyInspectorState();
  const controls=Array.from(document.querySelectorAll("#work-area [data-inspect]"));
  (controls.find(b=>b.dataset.inspect===state.returnFocusSpec)||$("step-title")).focus();
  state.returnFocusSpec=null;
}
function goStep(index){
  state.step=Math.max(0,Math.min(options.length-1,index));
  state.inspectorOpen=false;render();
  const active=document.querySelector("[data-step].active");
  if(active)active.scrollIntoView({block:"nearest",inline:"center",behavior:motion()});
  $("step-title").scrollIntoView({block:"start",behavior:motion()});
}

function varBy(id){return state.model.variables.find(x=>x.id===id);}
function formulaBy(id){return state.model.formulas.find(x=>x.id===id);}
function edgeBy(id){return state.model.edges.find(x=>x.id===id);}
function interBy(id){return state.model.interventions.find(x=>x.id===id);}
function rowIssue(issues){const blocks=issues.filter(i=>i.severity==="BLOCK"),warnings=issues.filter(i=>i.severity==="WARN");return {blocks,warnings};}
function inputOptions(){return [...state.model.variables.map(v=>[v.id,v.label]),...[state.model.outcome?[ [state.model.outcome.id,state.model.outcome.label] ]:[]]];}
function unitBadge(v){return '<span class="code-tag">'+esc(v.unit)+'</span>';}
function badge(source){const type=source==="synthetic"?"synthetic":source==="hypothesis"||source==="structural hypothesis"?"hypo":"valid";return '<span class="badge '+type+'">'+esc(source||"not recorded")+'</span>';}
function setFeedback(s){
  state.feedback=s;
  const showUndo=!!state.undoSnapshot && !!s && s.includes("direset");
  $("alerts").innerHTML=s?'<div class="alert warning"><span>'+esc(s)+'</span>'+(showUndo?'<button class="mini-btn" type="button" id="undo-reset">Batalkan reset ↶</button>':'')+'</div>':"";
}
function renderNavigation(){
  document.querySelectorAll("[data-step]").forEach((b,i)=>{const active=i===state.step;b.classList.toggle("active",active);b.setAttribute("aria-current",active?"step":"false");});
  const step=options[state.step];$("step-tag").textContent=step[1];$("step-title").textContent=step[2];$("step-description").textContent=step[3];$("mobile-step-progress").textContent="Tahap "+(state.step+1)+" dari "+options.length+" · "+step[0].charAt(0).toUpperCase()+step[0].slice(1);
  $("prev").disabled=state.step===0;$("next").disabled=state.step===options.length-1;
  $("next").textContent=state.step===options.length-2?"Lanjut ke evaluasi →":"Lanjutkan →";
}
function renderVariableStage(){
  const m=state.model;
  const trs=m.variables.map(v=>'<tr><td><button type="button" class="mini-btn" data-inspect="variable:'+esc(v.id)+'">Detail ↗</button></td><td><strong>'+esc(v.label)+'</strong><small><code>'+esc(v.id)+'</code> · '+esc(v.kind)+'</small></td><td>'+unitBadge(v)+'</td><td><input aria-label="Nilai '+esc(v.label)+'" class="value-input" type="number" data-value="'+esc(v.id)+'" step="any" value="'+esc(v.value)+'"></td><td>'+badge(v.source)+'</td>'+(state.advanced?'<td><button type="button" class="mini-btn danger" data-remove-var="'+esc(v.id)+'">Hapus</button></td>':'')+'</tr>').join("");
  const initialN=m.outcome.numerator, initialD=m.outcome.denominator;
  let html='<div class="intro-card"><strong>Outcome:</strong> '+esc(m.outcome.label)+' = <code>'+esc(initialN)+'</code> / <code>'+esc(initialD)+'</code>. Nilai awal dibangun dari definisi indikator, bukan bobot skor.</div>';
  html+='<div class="box-title"><h3>Variable Dictionary</h3><small>'+m.variables.length+' variabel · '+(state.advanced?"Advanced: struktur dapat diedit":"Guided: nilai dapat diuji")+'</small></div><div class="table-wrap variable-table"><table class="data-table"><thead><tr><th>Inspeksi</th><th>Variabel</th><th>Satuan</th><th>Nilai demo</th><th>Sumber</th>'+(state.advanced?'<th>Edit</th>':'')+'</tr></thead><tbody>'+trs+'</tbody></table></div>';
  html+='<div class="variable-cards" aria-label="Daftar variabel mobile">'+m.variables.map(v=>
    '<article class="variable-card"><div class="variable-card-head"><div><span class="code-tag">'+esc(v.id)+'</span><h3>'+esc(v.label)+'</h3><span class="variable-card-sub">'+esc(v.kind)+' · '+esc(v.unit)+'</span></div></div>'+
    '<div class="variable-card-values"><label class="inspection-label" for="mobile-value-'+esc(v.id)+'">Nilai simulasi</label><input id="mobile-value-'+esc(v.id)+'" class="value-input" type="number" step="any" data-value="'+esc(v.id)+'" value="'+esc(v.value)+'"></div>'+
    '<div class="row-actions">'+badge(v.source)+'<button type="button" class="mini-btn" data-inspect="variable:'+esc(v.id)+'" aria-label="Lihat penjelasan '+esc(v.label)+'">ⓘ Lihat penjelasan</button>'+
    (state.advanced?'<button type="button" class="mini-btn danger" data-remove-var="'+esc(v.id)+'">Hapus</button>':'')+'</div></article>'
  ).join("")+'</div>';
  html+='<div class="step-summary">◇ Klik Detail untuk memeriksa sumber, definisi dan batasnya. Mengubah nilai akan memperbarui simulasi secara langsung.</div>';
  if(state.advanced){
    html+='<div class="edit-box"><div class="box-title"><h3>Tambahkan variabel</h3><button type="button" class="mini-btn" data-toggle-add-var>'+ (state.addVariable?"Tutup":"Tambah +") +'</button></div>';
    if(state.addVariable)html+='<form id="add-var-form" class="form-grid"><div><label for="new-id">ID (huruf/angka/_)</label><input class="text-field" id="new-id" name="id" required pattern="[A-Za-z_][A-Za-z_0-9]*" placeholder="new_factor"></div><div><label for="new-label">Nama</label><input class="text-field" id="new-label" name="label" required placeholder="Faktor baru"></div><div><label for="new-unit">Satuan</label><select class="text-field" name="unit" id="new-unit">'+["ratio","episode","episode/week","ticket","ticket/week","student","student/week","shipment","shipment/week","day"].map(x=>'<option>'+x+'</option>').join("")+'</select></div><div><label for="new-value">Nilai awal</label><input class="text-field" id="new-value" type="number" step="any" name="value" value="0" required></div><div class="full"><label for="new-definition">Definisi dan cara ukur</label><input class="text-field" id="new-definition" name="definition" required placeholder="Definisi operasional dan denominator"></div><div class="full"><button class="btn btn-primary" type="submit">Tambahkan ke kamus</button></div></form>';
    html+='</div>';
  }
  return html;
}
function renderMechanismStage(){
  const varOpts=inputOptions();
  let html='<div class="intro-card">Satu panah adalah <strong>hipotesis hubungan</strong> dengan polaritas, alasan, dan kemungkinan jeda. Ia tidak otomatis mengubah formula sampai pengguna menautkannya melalui persamaan.</div><div class="box-title"><h3>Mechanism Graph · daftar hubungan</h3><small>'+state.model.edges.length+' hubungan</small></div><div class="edge-list">';
  html+=state.model.edges.map(e=>'<div class="edge-card '+(state.selected.kind==="edge"&&state.selected.id===e.id?"selected":"")+'"><div class="card-top"><div class="edge-chain"><strong>'+esc(e.from)+'</strong><span class="'+(e.sign==="+"?"positive":"negative")+'">'+(e.sign==="+"?"＋":"－")+' →</span><strong>'+esc(e.to)+'</strong></div>'+badge(e.source)+'</div><p>'+esc(e.why)+'</p><div class="row-actions"><button class="mini-btn" type="button" data-inspect="edge:'+esc(e.id)+'">Jelaskan hubungan ↗</button>'+(state.advanced?'<button class="mini-btn danger" type="button" data-remove-edge="'+esc(e.id)+'">Hapus</button>':'')+'<span class="muted small">Jeda: '+number(e.lag||0)+' minggu</span></div></div>').join("");
  html+='</div>';
  if(state.advanced){
    html+='<div class="edit-box"><div class="box-title"><h3>Bangun hipotesis baru</h3><button class="mini-btn" type="button" data-toggle-add-edge>'+(state.addEdge?"Tutup":"Tambah hubungan +")+'</button></div>';
    if(state.addEdge){
      const opts=varOpts.map(([id,label])=>'<option value="'+esc(id)+'">'+esc(id+" · "+label)+'</option>').join("");
      html+='<form id="add-edge-form" class="form-grid"><div><label>Dari</label><select name="from" class="text-field">'+opts+'</select></div><div><label>Ke</label><select name="to" class="text-field">'+opts+'</select></div><div><label>Arah pengaruh (hipotesis)</label><select class="text-field" name="sign"><option value="+">Positif (+)</option><option value="-">Negatif (−)</option></select></div><div><label>Jeda (minggu)</label><input class="text-field" name="lag" type="number" min="0" step="1" value="0"></div><div class="full"><label>Justifikasi mekanisme</label><textarea class="text-field text-area" name="why" required placeholder="Mengapa hubungan ini masuk akal? Bukti apa yang masih diperlukan?"></textarea></div><div class="full"><button class="btn btn-primary" type="submit">Tambahkan hipotesis</button></div></form>';
    }html+='</div>';
  }
  return html;
}
function renderFormulaStage(){
  let html='<div class="intro-card">Persamaan dihitung <strong>berurutan</strong> dalam satu interval minggu. Edit di Advanced Mode; unit checker akan menolak penjumlahan variabel dengan dimensi berbeda. Model hanya mendukung operator + − × ÷ dan fungsi min, max, clamp.</div>';
  const {blocks,warnings}=rowIssue(validateModel(state.model));
  html+='<div class="box-title"><h3>Executable Formula Chain</h3><span class="badge '+(blocks.length?"synthetic":"valid")+'">'+(blocks.length?blocks.length+" BLOCK":"DIMENSION CHECK OK")+'</span></div><div class="formula-list">';
  html+=state.model.formulas.map((f,i)=>{
    const select=state.selected.kind==="formula"&&state.selected.id===f.id;
    return '<div class="formula-card '+(select?"selected":"")+'"><div class="card-top"><h3>'+(i+1)+'. '+esc(f.label)+'</h3>'+unitBadge(f)+'</div><code>'+esc(f.id)+" = "+esc(f.expr)+'</code><p>'+esc(f.why)+'</p>'+(state.advanced?'<textarea rows="2" class="text-field formula-input" aria-label="Edit formula '+esc(f.id)+'" data-edit-formula="'+esc(f.id)+'">'+esc(f.expr)+'</textarea>':'')+'<div class="row-actions"><button class="mini-btn" type="button" data-inspect="formula:'+esc(f.id)+'">Explain formula ↗</button>'+badge(f.source)+'</div></div>';
  }).join("")+'</div>';
  html+='<div class="step-summary">↳ State update: '+esc(Object.entries(state.model.updates).map(([k,v])=>k+" ← "+v).join(" · "))+'</div>';
  if(blocks.length)html+='<div class="alert error">'+esc(blocks[0].message)+'</div>';
  return html;
}
function outcomeChart(runs){
  const W=720,H=255,L=44,R=15,T=17,B=32;const x=i=>L+i/12*(W-L-R),y=v=>T+(1-v)*(H-T-B);
  const colors=["#92A6B7","#12A38E","#3170AF","#DA9A4B","#875FC0"];
  let axes="";
  for(let i=0;i<=4;i++){let val=i*.25,py=y(val);axes+='<line x1="'+L+'" y1="'+py+'" x2="'+(W-R)+'" y2="'+py+'" stroke="#E9EFF2"/><text x="'+(L-8)+'" y="'+(py+4)+'" fill="#8497A7" font-size="10" text-anchor="end">'+Math.round(val*100)+'%</text>';}
  for(let i=0;i<=12;i+=3)axes+='<text x="'+x(i)+'" y="'+(H-9)+'" fill="#8295A5" font-size="10" text-anchor="middle">M'+i+'</text>';
  const lines=runs.map((r,i)=>'<polyline fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="'+(r.id===state.scenario?4:2.4)+'" stroke-linejoin="round" stroke-linecap="round" points="'+r.points.map(p=>x(p.week).toFixed(1)+","+y(p.value).toFixed(1)).join(" ")+'"/>').join("");
  const legend=runs.map((r,i)=>'<span class="legend-chip"><i class="swatch" style="background:'+colors[i%colors.length]+'"></i>'+esc(r.name)+'</span>').join("");
  return '<div class="chart-card"><div class="box-title"><h3>Simulasi outcome · 12 minggu</h3><small>Proyeksi sintetis, bukan prediksi empiris</small></div><div class="legend">'+legend+'</div><div class="chart-scroll" role="region" tabindex="0" aria-label="Grafik perbandingan intervensi yang dapat digeser horizontal"><svg viewBox="0 0 '+W+" "+H+'" role="img" aria-label="Grafik baseline dan alternatif intervensi selama 12 minggu">'+axes+lines+'</svg></div><p class="chart-hint">↔ Geser grafik ke samping untuk membaca setiap minggu</p></div>';
}
function renderInterventionStage(){
  const issues=validateModel(state.model),block=issues.find(i=>i.severity==="BLOCK");
  if(block)return '<div class="alert error">Simulasi dihentikan: '+esc(block.message)+'. Perbaiki variabel/formula lebih dahulu.</div>';
  let runs;try{runs=compare(state.model,12);}catch(e){return '<div class="alert error">'+esc(e.message)+'</div>';}
  const baseline=runs[0].points.at(-1).value;
  let html='<div class="intro-card">Efek intervensi disimpan sebagai <strong>perubahan eksplisit parameter</strong>, bukan disimpulkan otomatis dari skor mekanisme. Data efek dan biaya masih sintetis.</div><div class="box-title"><h3>Perbandingan alternatif</h3><small>Horizon: 12 minggu · dt=1 minggu</small></div><div class="scenario-grid">';
  html+=runs.map((r,i)=>{
    const diff=(r.points.at(-1).value-baseline)*100;
    const inter=interBy(r.id);
    const chips=Object.entries(r.assumptions).map(([k,val])=>'<span>'+esc(k)+" → "+number(val)+'</span>').join("");
    return '<div class="scenario '+(state.scenario===r.id?"primary":"")+'"><div class="card-top"><span class="badge '+(i===0?"valid":"synthetic")+'">'+(i===0?"BASELINE":"SYNTHETIC")+'</span><button type="button" class="mini-btn" data-inspect="'+(i===0?"baseline:baseline":"intervention:"+esc(r.id))+'">Detail ↗</button></div><strong>'+esc(r.name)+'</strong><span class="value">'+percent(r.points.at(-1).value)+'</span><small>'+ (i===0?"Tanpa perubahan":(diff>=0?"+":"")+number(diff)+" poin persentase vs baseline")+'</small><div class="assumption-list">'+(chips||'<span>Asumsi awal</span>')+'</div>'+(inter?'<p>Biaya relatif: '+number(inter.cost)+' · Risiko relatif: '+number(inter.risk)+' · Jeda: '+number(inter.delay)+' minggu</p>':'')+'</div>';
  }).join("")+'</div>'+outcomeChart(runs);
  html+='<div class="alert warning"><strong>Interpretasi:</strong> nilai tertinggi pada grafik tidak otomatis menjadi rekomendasi terbaik. Belum ada kalibrasi efektivitas, kelayakan, biaya empiris, maupun identifikasi kausal.</div>';
  return html;
}
function sensitivityTable(){
  const m=state.model,vars=m.variables.filter(v=>["parameter","flow"].includes(v.kind)&&v.value>0).slice(0,6);const baseline=simulate(m,"baseline",12).points.at(-1).value;
  const rows=[];
  for(const variable of vars){
    try{
      const lo=JSON.parse(JSON.stringify(m)),hi=JSON.parse(JSON.stringify(m));
      const a=lo.variables.find(v=>v.id===variable.id),b=hi.variables.find(v=>v.id===variable.id);
      a.value=Math.max(a.min??0,variable.value*.9);b.value=Math.min(b.max??Infinity,variable.value*1.1);
      const l=simulate(lo,"baseline",12).points.at(-1).value,h=simulate(hi,"baseline",12).points.at(-1).value;
      rows.push('<tr><td><strong>'+esc(variable.id)+'</strong><small>'+esc(variable.unit)+'</small></td><td>'+percent(l)+'</td><td>'+percent(baseline)+'</td><td>'+percent(h)+'</td></tr>');
    }catch(e){rows.push('<tr><td>'+esc(variable.id)+'</td><td colspan="3">'+esc(e.message)+'</td></tr>');}
  }
  return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Parameter</th><th>−10%</th><th>Awal</th><th>+10%</th></tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
}
function renderEvaluationStage(){
  const issues=validateModel(state.model),{blocks,warnings}=rowIssue(issues);
  let html='<div class="intro-card">Pemeriksaan teknis tidak sama dengan validasi ilmiah. Model yang dapat dijalankan masih dapat memiliki asumsi kausal yang salah atau tidak berlaku di dunia nyata.</div><div class="grid-2"><div class="metric"><label>BLOCKING ISSUES</label><strong>'+blocks.length+'</strong><p>Kesalahan satuan, definisi, rentang atau sintaks</p></div><div class="metric"><label>SCIENTIFIC WARNINGS</label><strong>'+warnings.length+'</strong><p>Asumsi sintetis dan provenance yang belum memadai</p></div></div>';
  html+='<div class="box-title"><h3>Validation Report</h3><small>Structural & numerical checks</small></div><div class="diagnostic-list">';
  if(!blocks.length)html+='<div class="alert pass">✓ Struktur dasar, referensi formula, satuan dan outcome awal lolos pemeriksaan otomatis.</div>';
  html+=issues.map(i=>'<div class="alert '+(i.severity==="BLOCK"?"error":"warning")+'"><strong>'+esc(i.code)+'</strong> · '+esc(i.message)+' <span class="small">('+esc(i.target||"model")+')</span></div>').join("")+'</div>';
  if(!blocks.length){
    try{html+='<div class="box-title"><h3>Sensitivity Test · satu variabel per uji</h3><small>±10% dari nilai awal</small></div>'+sensitivityTable();}catch(e){html+='<div class="alert error">'+esc(e.message)+'</div>';}
  }
  html+='<div class="edit-box"><h3>Reproducibility & Research Review</h3><p class="muted small">Status validasi: <strong>'+esc(state.model.validationStatus)+'</strong>. Status klaim kausal: <strong>'+esc(state.model.causalStatus)+'</strong>. Perbandingan ini masih demo-only.</p><div class="action-footer"><button class="btn btn-primary" type="button" data-download>Ekspor JSON penelitian ↓</button><label class="btn btn-outline" for="import-file">Impor JSON model ↑</label><input id="import-file" type="file" accept=".json,application/json" style="display:none"></div><p class="helper-text">Ekspor mencakup variabel, hipotesis, persamaan, intervensi, sumber asumsi dan metadata. Impor dilakukan lokal dalam browser; jangan memasukkan data pasien.</p></div>';
  return html;
}
function renderInspector(){
  const m=state.model,s=state.selected;let html="";
  if(s.kind==="variable"){
    const v=varBy(s.id);if(!v){state.selected={kind:"variable",id:m.variables[0].id};return renderInspector();}
    html='<div class="inspection-label">VARIABLE / '+esc(v.id)+'</div><h3>'+esc(v.label)+'</h3>'+badge(v.source)+'<div class="field"><div class="inspection-label">Definisi operasional</div><div class="inspection-value">'+esc(v.definition)+'</div></div><div class="field"><div class="inspection-label">Tipe & satuan</div><div class="inspection-value">'+esc(v.kind)+' · '+esc(v.unit)+'</div></div><div class="field"><div class="inspection-label">Sumber / provenance</div><div class="inspection-value">'+esc(v.reference||"Belum dicatat")+'</div></div><div class="field"><div class="inspection-label">Rentang nilai</div><div class="inspection-value">'+(v.min??"−∞")+' s.d. '+(v.max??"∞")+'</div></div>';
    if(state.advanced)html+='<div class="edit-box"><h3>Inspector · Edit metadata</h3><label class="inspection-label">Nama</label><input class="text-field" data-v-field="label" data-id="'+esc(v.id)+'" value="'+esc(v.label)+'"><label class="inspection-label">Definisi</label><textarea class="text-field text-area" data-v-field="definition" data-id="'+esc(v.id)+'">'+esc(v.definition)+'</textarea><label class="inspection-label">Asal parameter</label><select class="text-field" data-v-field="source" data-id="'+esc(v.id)+'">'+["synthetic","expert","observational","literature","intervention"].map(x=>'<option value="'+x+'" '+(v.source===x?"selected":"")+'>'+x+'</option>').join("")+'</select></div>';
  }else if(s.kind==="edge"){
    const e=edgeBy(s.id);if(!e){state.selected={kind:"variable",id:m.variables[0].id};return renderInspector();}
    html='<div class="inspection-label">MECHANISM / '+esc(e.id)+'</div><h3>'+esc(e.from)+' → '+esc(e.to)+'</h3>'+badge(e.source)+'<div class="field"><div class="inspection-label">Hipotesis dan justifikasi</div><div class="inspection-value">'+esc(e.why)+'</div></div><div class="field"><div class="inspection-label">Polaritas</div><div class="inspection-value">'+(e.sign==="+"?"Positif (+)":"Negatif (−)")+'</div></div><div class="field"><div class="inspection-label">Jeda waktu</div><div class="inspection-value">'+number(e.lag||0)+' minggu</div></div><div class="explain-callout">Panah bukan persamaan eksekusi dan tidak membuktikan sebab-akibat. Untuk memengaruhi hasil, hubungan harus diterjemahkan ke formula dengan parameter yang bersumber jelas.</div>';
    if(state.advanced)html+='<div class="edit-box"><h3>Edit hipotesis</h3><label class="inspection-label">Polaritas</label><select class="text-field" data-edge-field="sign" data-id="'+esc(e.id)+'"><option value="+" '+(e.sign==="+"?"selected":"")+'>Positif</option><option value="-" '+(e.sign==="-"?"selected":"")+'>Negatif</option></select><label class="inspection-label">Jeda minggu</label><input type="number" min="0" class="text-field" data-edge-field="lag" data-id="'+esc(e.id)+'" value="'+esc(e.lag)+'"><label class="inspection-label">Justifikasi</label><textarea class="text-field text-area" data-edge-field="why" data-id="'+esc(e.id)+'">'+esc(e.why)+'</textarea></div>';
  }else if(s.kind==="formula"){
    const f=formulaBy(s.id);if(!f){state.selected={kind:"variable",id:m.variables[0].id};return renderInspector();}
    let lin=[];try{lin=getLineage(m,f.id);}catch(e){lin=[];}
    html='<div class="inspection-label">FORMULA / '+esc(f.id)+'</div><h3>'+esc(f.label)+'</h3>'+badge(f.source)+'<div class="field"><div class="inspection-label">Persamaan</div><code class="code-tag">'+esc(f.id+" = "+f.expr)+'</code></div><div class="field"><div class="inspection-label">Mengapa bentuk ini?</div><div class="inspection-value">'+esc(f.why)+'</div></div><div class="field"><div class="inspection-label">Satuan output</div><div class="inspection-value">'+esc(f.unit)+'</div></div><div class="field"><div class="inspection-label">Status validasi</div><div class="inspection-value">Structure-checked only. Tidak tervalidasi empiris.</div></div><div class="inspection-label">Formula lineage · dependensi</div><div class="lineage-list">'+lin.map(l=>'<div class="lineage-item"><code>'+esc(l.id)+'</code><span>'+esc(l.type)+'</span><span>'+esc(l.unit)+'</span></div>').join("")+'</div><div class="explain-callout">Sumber: '+esc(f.reference||f.source)+'. Koefisien dan efek intervensi tidak boleh dianggap temuan empiris.</div>';
  }else if(s.kind==="intervention"){
    const i=interBy(s.id);if(!i){state.selected={kind:"variable",id:m.variables[0].id};return renderInspector();}
    html='<div class="inspection-label">INTERVENTION / '+esc(i.id)+'</div><h3>'+esc(i.label)+'</h3>'+badge(i.source)+'<p>'+esc(i.desc)+'</p><div class="field"><div class="inspection-label">Perubahan parameter (asumsi)</div><div class="inspection-value">'+esc(Object.entries(i.changes).map(([k,v])=>k+" → "+v).join("; "))+'</div></div><div class="field"><div class="inspection-label">Basis efek</div><div class="inspection-value">'+esc(i.reference)+'</div></div><div class="explain-callout">Biaya dan risiko adalah nilai ordinal ilustratif, bukan hasil analisis biaya-manfaat. Ranking otomatis belum boleh diklaim sebagai keputusan terbaik.</div>';
    if(state.advanced){
      html+='<div class="edit-box"><h3>Ubah respons skenario</h3>';
      for(const [id,val] of Object.entries(i.changes))html+='<label class="inspection-label">'+esc(id)+'</label><input class="text-field" type="number" step="any" data-intervention-field="'+esc(id)+'" data-id="'+esc(i.id)+'" value="'+esc(val)+'">';
      html+='</div>';
    }
  }else{
    html='<div class="inspection-label">BASELINE</div><h3>Tanpa intervensi</h3><p>Gunakan nilai parameter model saat ini sebagai referensi untuk setiap alternatif. Semua angka contoh merupakan sintesis demonstrasi.</p>';
  }
  html+='<div class="step-summary">◇ Provenance tidak membuktikan kebenaran hubungan. Bukti perlu diuji pada konteks yang sesuai.</div>';
  $("inspector-body").innerHTML=html;
}
function render(){
  $("domain").value=state.model.id;
  $("guided").classList.toggle("selected",!state.advanced);$("advanced").classList.toggle("selected",state.advanced);
  $("guided").setAttribute("aria-pressed",String(!state.advanced));$("advanced").setAttribute("aria-pressed",String(state.advanced));
  $("question").textContent=state.model.question;$("case-sector").textContent=state.model.sector;
  renderNavigation();
  const name=options[state.step][0];
  try{$("work-area").innerHTML=name==="variables"?renderVariableStage():name==="mechanisms"?renderMechanismStage():name==="formulas"?renderFormulaStage():name==="interventions"?renderInterventionStage():renderEvaluationStage();}
  catch(e){$("work-area").innerHTML='<div class="alert error">'+esc(e.message)+'</div>';}
  renderInspector();
  applyInspectorState();
  setFeedback(state.feedback);
  persistDraft();
}
function selectCase(id){
  const drafts=readDrafts(),saved=drafts.models[id];
  state.model=usableModel(saved)?clone(saved):getDomain(id);
  state.step=0;state.selected={kind:"variable",id:state.model.variables[0].id};state.scenario="baseline";
  state.addVariable=false;state.addEdge=false;state.feedback="";state.inspectorOpen=false;state.undoSnapshot=null;
  render();
}
function inspect(spec){
  const p=spec.indexOf(":");state.selected={kind:spec.slice(0,p),id:spec.slice(p+1)};
  state.returnFocusSpec=spec;
  state.scenario=state.selected.kind==="intervention"?state.selected.id:"baseline";
  state.inspectorOpen=isMobile();render();
  if(state.inspectorOpen)$("inspector-close").focus();
}
function download(){const m={...state.model,exportedAt:new Date().toISOString(),meta:{generator:"AISM Lab v0.2",disclaimer:"Synthetic demonstrator. Not a causal or clinical decision tool."}};const blob=new Blob([JSON.stringify(m,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="aism-v0.2-"+m.id+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function changeValue(id,val){
  const v=varBy(id);if(!v)return;
  const n=Number(val);if(!Number.isFinite(n)){setFeedback("Nilai harus numerik");return;}
  v.value=n;state.feedback="";render();
}
function addVariable(form){
  const data=Object.fromEntries(new FormData(form).entries()),id=data.id;
  if(state.model.variables.some(v=>v.id===id)||state.model.formulas.some(f=>f.id===id)||id==="dt"){setFeedback("ID variabel duplikat: "+id);return;}
  const n=Number(data.value);
  if(!Number.isFinite(n)){setFeedback("Nilai variabel tidak valid");return;}
  state.model.variables.push({id,label:data.label,unit:data.unit,value:n,kind:"auxiliary",definition:data.definition,source:"synthetic",reference:"Dibuat pengguna (asumsi, belum divalidasi)"});
  state.addVariable=false;state.selected={kind:"variable",id};state.feedback="Variabel baru tersimpan. Periksa peran dan hubungan sebelum memasukkannya ke persamaan.";render();
}
function addEdge(form){
  const data=Object.fromEntries(new FormData(form).entries());
  if(data.from===data.to){setFeedback("Hubungan diri sendiri membutuhkan definisi jeda stok-aliran yang eksplisit.");return;}
  const id="edge-"+data.from+"-"+data.to+"-"+(state.model.edges.length+1);
  state.model.edges.push({id,from:data.from,to:data.to,sign:data.sign,lag:Number(data.lag)||0,why:data.why,source:"hypothesis",reference:"Hipotesis dibuat pengguna; belum divalidasi"});
  state.addEdge=false;state.selected={kind:"edge",id};state.feedback="Hipotesis tersimpan. Panah tidak otomatis masuk ke persamaan.";render();
}
function removeVariable(id){
  const dep=state.model.formulas.some(f=>{try{return references(parse(f.expr)).includes(id)}catch(e){return true;}})||state.model.edges.some(e=>e.from===id||e.to===id)||Object.keys(state.model.updates).includes(id)||Object.values(state.model.updates).includes(id)||state.model.interventions.some(i=>id in i.changes)||state.model.outcome.numerator.includes(id)||state.model.outcome.denominator.includes(id);
  if(dep){setFeedback("Variabel "+id+" masih dipakai oleh rumus/hubungan/intervensi dan tidak boleh dihapus sebelum dependensinya diselesaikan.");return;}
  state.model.variables=state.model.variables.filter(v=>v.id!==id);state.selected={kind:"variable",id:state.model.variables[0].id};state.feedback="Variabel dihapus dari model";render();
}
async function importModel(file){
  if(!file||file.size>1024*1024){setFeedback("File tidak ada atau lebih besar dari 1 MB");return;}
  try{
    const m=JSON.parse(await file.text());
    if(!m||typeof m!=="object"||!Array.isArray(m.variables)||!Array.isArray(m.formulas)||!Array.isArray(m.edges)||!m.outcome||!m.updates||!Array.isArray(m.interventions))throw Error("Skema JSON tidak lengkap.");
    const issues=validateModel(m),blocks=issues.filter(i=>i.severity==="BLOCK");
    if(blocks.length)throw Error("Model gagal validasi: "+blocks[0].message);
    // Imported user models are conservatively marked unvalidated.
    m.validationStatus="not_tested";m.decisionReadiness="demo_only";
    state.model=m;state.step=0;state.selected={kind:"variable",id:m.variables[0].id};state.feedback="Model berhasil dimuat secara lokal. Provenance dan validitas ilmiahnya masih perlu ditelaah.";render();
  }catch(e){setFeedback("Impor gagal: "+e.message);}
}
$("domain").addEventListener("change",e=>selectCase(e.target.value));
$("guided").addEventListener("click",()=>{state.advanced=false;render();});
$("advanced").addEventListener("click",()=>{state.advanced=true;render();});
$("reset").addEventListener("click",()=>{
  if(!window.confirm("Reset semua perubahan pada kasus ini? Draf terakhir dapat dipulihkan lewat Batalkan reset."))return;
  state.undoSnapshot={model:clone(state.model),step:state.step,selected:clone(state.selected)};
  state.model=getDomain(domainIds.includes(state.model.id)?state.model.id:"satusehat");
  state.step=0;state.selected={kind:"variable",id:state.model.variables[0].id};state.inspectorOpen=false;
  state.scenario="baseline";state.addVariable=false;state.addEdge=false;state.feedback="Model direset. Draf sebelum reset masih bisa dipulihkan.";
  render();
});
$("alerts").addEventListener("click",e=>{
  if(e.target.id!=="undo-reset"||!state.undoSnapshot)return;
  const previous=state.undoSnapshot;state.undoSnapshot=null;
  state.model=previous.model;state.step=previous.step;state.selected=previous.selected;
  state.feedback="Reset dibatalkan. Model sebelumnya kembali.";render();
});
$("inspector-close").addEventListener("click",closeInspector);
$("inspector-backdrop").addEventListener("click",closeInspector);
window.addEventListener("keydown",e=>{
  if(!state.inspectorOpen||!isMobile())return;
  if(e.key==="Escape"){e.preventDefault();closeInspector();return;}
  if(e.key!=="Tab")return;
  const controls=[...$("inspector").querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);
  if(!controls.length)return;
  const first=controls[0],last=controls.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
window.addEventListener("resize",()=>{
  if(!isMobile()&&state.inspectorOpen){state.inspectorOpen=false;applyInspectorState();}
});
$("export").addEventListener("click",download);
$("prev").addEventListener("click",()=>goStep(state.step-1));
$("next").addEventListener("click",()=>goStep(state.step+1));
document.querySelectorAll("[data-step]").forEach((b,i)=>b.addEventListener("click",()=>goStep(i)));
$("work-area").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.inspect){inspect(b.dataset.inspect);return;}
  if(b.dataset.toggleAddVar!==undefined){state.addVariable=!state.addVariable;render();return;}
  if(b.dataset.toggleAddEdge!==undefined){state.addEdge=!state.addEdge;render();return;}
  if(b.dataset.removeVar){removeVariable(b.dataset.removeVar);return;}
  if(b.dataset.removeEdge){state.model.edges=state.model.edges.filter(x=>x.id!==b.dataset.removeEdge);state.selected={kind:"variable",id:state.model.variables[0].id};render();return;}
  if(b.dataset.download!==undefined){download();return;}
});
$("work-area").addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset.value){changeValue(t.dataset.value,t.value);return;}
  if(t.dataset.editFormula){const f=formulaBy(t.dataset.editFormula);if(f){f.expr=t.value;state.selected={kind:"formula",id:f.id};state.feedback="Formula diperbarui. Validasi satuan dan dependensi dihitung ulang.";render();}}
  if(t.id==="import-file"){importModel(t.files[0]);}
});
$("work-area").addEventListener("submit",e=>{
  if(e.target.id==="add-var-form"||e.target.id==="add-edge-form"){e.preventDefault();if(e.target.id==="add-var-form")addVariable(e.target);else addEdge(e.target);}
});
$("inspector-body").addEventListener("change",e=>{
  const t=e.target,id=t.dataset.id;
  if(t.dataset.vField){const v=varBy(id);if(v){v[t.dataset.vField]=t.value;render();}}
  if(t.dataset.edgeField){const edge=edgeBy(id);if(edge){edge[t.dataset.edgeField]=t.dataset.edgeField==="lag"?Math.max(0,Number(t.value)):t.value;render();}}
  if(t.dataset.interventionField){const i=interBy(id),v=varBy(t.dataset.interventionField),n=Number(t.value);if(i&&v&&Number.isFinite(n)){i.changes[t.dataset.interventionField]=n;render();}}
});
render();
