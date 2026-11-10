import {parseAggregateCsv,summarize,BASE_QUESTIONS,activeDeepQuestions,decisionOptions,answerLabel} from "./src/episode-lite.mjs";

/* AISM Lite: browser-only research demonstrator; no patient data, no uploads. */
const el=id=>document.getElementById(id);
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number=value=>Number(value??0).toLocaleString("id-ID");
const percent=value=>value===null||!Number.isFinite(value)?"—":(value*100).toLocaleString("id-ID",{maximumFractionDigits:1})+"%";
const pp=value=>value===null?"belum dapat dihitung":(value>=0?"+":"")+(value*100).toLocaleString("id-ID",{maximumFractionDigits:1})+" pp";
const label={laboratorium:"Laboratorium",radiologi:"Radiologi"};
const statusLabel={HOLD:"HOLD · Validasi data",INVESTIGATE:"INVESTIGATE · Perlu bukti",RECOMMEND:"RECOMMEND · Kandidat",REVIEW:"REVIEW · Tinjau manusia",VERIFY:"VERIFY · Evaluasi"};
const answerOptions=[["ya","Ya"],["sebagian","Sebagian"],["tidak","Tidak"],["tidak_tahu","Belum tahu"]];
let rows=[],profile=null,answers={},sourceName="",level=1,stage=1;

function message(text,type="ok"){
  const node=el("data-feedback");
  node.textContent=text;node.className="feedback "+type;
}
function showStage(n){
  if(n>1&&!profile)return;
  stage=n;
  if(n===3)renderRecommendations();
  document.querySelectorAll(".stage").forEach(node=>node.classList.toggle("active",node.id==="stage-"+["data","assessment","results"][n-1]));
  document.querySelectorAll("[data-nav]").forEach(node=>{
    if(Number(node.dataset.nav)===n)node.setAttribute("aria-current","step");
    else node.removeAttribute("aria-current");
  });
  const top=el("workflow").getBoundingClientRect().top+window.scrollY-14;
  window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
}
function clearData(){
  rows=[];profile=null;answers={};sourceName="";
  el("data-summary").classList.add("hide");
  el("next-to-assessment").disabled=true;
  renderBase();renderDeep();setLevel(1);
}
function loadCsv(csv,name){
  try{
    const next=parseAggregateCsv(csv);
    const nextProfile=summarize(next);
    rows=next;profile=nextProfile;answers={};sourceName=name;
    message("Data valid secara aritmetis: "+next.length+" baris agregat berhasil dianalisis secara lokal. Validasi klinis dan metodologis tetap diperlukan.");
    renderData();renderBase();renderDeep();setLevel(1);
  }catch(error){clearData();message(error.message,"error");}
}
async function importFile(file){
  if(!file)return;
  if(file.size>2*1024*1024){clearData();message("Ukuran file maksimum 2 MB. Gunakan ringkasan agregat tanpa data pasien.","error");return;}
  try{loadCsv(await file.text(),file.name);}
  catch(error){clearData();message("File tidak dapat dibaca: "+error.message,"error");}
}
function metric(label,value,description){
  return '<div class="metric"><span class="label">'+escapeHtml(label)+'</span><strong>'+escapeHtml(value)+'</strong><small>'+escapeHtml(description)+'</small></div>';
}
function trendPanel(t){
  const trendClass=({membaik:"good",menurun:"alert","fluktuatif":"neutral","relatif stabil":"neutral","data belum cukup":"neutral"})[t.label]||"neutral";
  const rows=t.monthly.map(point=>{
    const bar=point.core===null?0:point.core*100;
    return '<tr><td>'+escapeHtml(point.period)+'</td><td>'+percent(point.core)+'</td><td>'+percent(point.strict)+'</td><td><div class="trend-bar" role="img" aria-label="Core '+percent(point.core)+'"><span style="width:'+Math.min(100,bar).toFixed(2)+'%"></span></div></td></tr>';
  }).join("");
  return '<article class="trend-card"><div class="trend-top"><strong>'+escapeHtml(label[t.service])+'</strong><span class="trend-status '+trendClass+'">'+escapeHtml(t.label)+'</span></div>'+
   '<p class="helper">Perubahan core dari periode pertama ke terakhir: '+escapeHtml(pp(t.delta))+' (minimal 3 periode untuk klasifikasi).</p>'+
   '<div class="table-wrap"><table class="trend-table"><thead><tr><th>Bulan</th><th>Core</th><th>Strict</th><th>Visual core</th></tr></thead><tbody>'+rows+'</tbody></table></div></article>';
}
function renderData(){
  if(!profile)return;
  const m=profile.aggregate;const list=profile.trajectories;
  el("data-summary").classList.remove("hide");el("next-to-assessment").disabled=false;
  el("source-name").textContent=sourceName+" · "+rows.length+" baris agregat";
  el("period-range").textContent="Periode "+profile.periods[0]+" s.d. "+profile.periods.at(-1);
  el("data-gate").textContent=profile.gate==="HOLD"?
    "HOLD: "+profile.problems.join(" "):
    "Denominator konsisten secara aritmetis. Status episode dan aturan pematangan tetap harus diverifikasi terhadap sumber sebelum analisis penelitian.";
  el("data-gate").className="feedback "+(profile.gate==="HOLD"?"error":"ok");
  el("metric-grid").innerHTML=[
    metric("Eligible matang",number(m.eligible_mature),number(m.total_order)+" total order"),
    metric("Kelengkapan core",percent(m.coreRate),number(m.complete_core)+" / "+number(m.eligible_mature)),
    metric("Kelengkapan strict",percent(m.strictRate),number(m.complete_strict)+" / "+number(m.eligible_mature)),
    metric("Tanpa bukti downstream",number(m.no_downstream_evidence),percent(m.noEvidenceRate)+" dari eligible matang"),
    metric("Belum eligible",number(m.not_yet_eligible),"Tidak masuk denominator"),
    metric("Linkage belum terverifikasi",number(m.unverified_linkage),"Tidak masuk denominator · picu HOLD")
  ].join("");
  el("service-table").innerHTML=Object.entries(profile.byService).filter(([,s])=>s.total_order>0).map(([name,s])=>
    '<tr><td><strong>'+label[name]+'</strong></td><td>'+number(s.eligible_mature)+'</td><td>'+percent(s.coreRate)+'</td><td>'+percent(s.strictRate)+'</td><td>'+number(s.incomplete_with_downstream)+'</td><td>'+number(s.completed_without_result)+'</td><td>'+number(s.no_downstream_evidence)+'</td></tr>'
  ).join("");
  el("trend-panels").innerHTML=list.map(trendPanel).join("");
  el("quality-note").innerHTML='<div><strong>'+number(m.total_order)+'</strong><span>Total order</span></div>'+
    '<div><strong>'+number(m.not_yet_eligible)+'</strong><span>Belum matang / eligible</span></div>'+
    '<div><strong>'+number(m.excluded_order)+'</strong><span>Dikecualikan</span></div>'+
    '<div><strong>'+number(m.unverified_linkage)+'</strong><span>Linkage perlu ditinjau</span></div>'+
    '<p>Episode tanpa bukti downstream tidak disamakan dengan tindakan klinis yang tidak dilakukan. Perhitungan ini mengasumsikan kategori sudah ditetapkan dengan aturan serta snapshot yang konsisten.</p>';
}
function questionMarkup(q,prefix){
  const opts=q.binary?answerOptions.filter(o=>o[0]!=="sebagian"):answerOptions;
  return '<fieldset class="question"><legend>'+escapeHtml(q.label)+'<span class="hint">'+escapeHtml(q.hint||"")+'</span></legend><div class="choices">'+
    opts.map(([value,text])=>'<label class="choice"><input type="radio" name="'+prefix+q.id+'" data-answer="'+q.id+'" value="'+value+'"'+(answers[q.id]===value?' checked':'')+'><span>'+text+'</span></label>').join("")+
    '</div></fieldset>';
}
function renderBase(){el("base-questions").innerHTML=BASE_QUESTIONS.map(q=>questionMarkup(q,"base-")).join("");updateProgress();}
function relevantDeep(){return profile?activeDeepQuestions(profile,answers):[];}
function renderDeep(){
  const questions=relevantDeep();
  el("deep-count").textContent=questions.length+" pertanyaan relevan.";
  el("deep-questions").innerHTML=questions.length?questions.map(q=>questionMarkup(q,"deep-")).join(""):'<p class="guidance">Tidak ada pertanyaan pendalaman yang terpicu dari data dan assessment saat ini.</p>';
  updateProgress();
}
function updateProgress(){
  const base=BASE_QUESTIONS.filter(q=>answers[q.id]).length;
  const deep=relevantDeep();
  const deepDone=deep.filter(q=>answers[q.id]).length;
  el("assess-progress").textContent="Dasar "+base+"/"+BASE_QUESTIONS.length+" · Pendalaman "+deepDone+"/"+deep.length;
}
function setLevel(n){
  level=n;
  el("base-block").classList.toggle("hide",n!==1);
  el("deep-block").classList.toggle("hide",n!==2);
  for(const [id,visible] of [["back-to-data",n===1],["to-deep",n===1],["back-to-base",n===2],["to-results",n===2]])el(id).classList.toggle("hide",!visible);
  el("assessment-title").textContent=n===1?"Assessment dasar":"Pendalaman sesuai kondisi";
  el("assessment-desc").textContent=n===1?"Jawab sesuai kondisi fasyankes. Pilih Belum tahu bila bukti tidak tersedia.":"Pilih jawaban yang didukung data, log tersanitasi, atau pengalaman operasional yang dapat dijelaskan.";
  if(n===2)renderDeep();
}
function recommendationMarkup(item,index){
  const tone=({HOLD:"hold",INVESTIGATE:"investigate",RECOMMEND:"recommend",REVIEW:"review",VERIFY:"verify"})[item.status]||"investigate";
  const list=item.why.map(msg=>'<li>'+escapeHtml(msg)+'</li>').join("");
  return '<article class="result-card"><div class="result-top"><span class="rank">'+(index+1)+'</span>'+
    '<div class="result-title"><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.scope)+'</p></div>'+
    '<span class="priority '+tone+'">'+escapeHtml(statusLabel[item.status])+'</span></div>'+
    '<div class="evidence"><strong>Bukti/pemicu pilihan</strong><ul>'+list+'</ul></div>'+
    '<p class="mini-action"><strong>Langkah yang dipertimbangkan:</strong> '+escapeHtml(item.action)+'</p>'+
    '<div class="result-details"><p><strong>Periksa terlebih dahulu:</strong> '+escapeHtml(item.check)+'</p>'+
    '<p><strong>Syarat berlaku:</strong> '+escapeHtml(item.condition)+'</p>'+
    '<p><strong>Jangan diterapkan bila:</strong> '+escapeHtml(item.avoid)+'</p>'+
    '<p><strong>PIC yang disarankan:</strong> '+escapeHtml(item.owner)+'</p>'+
    '<p><strong>Indikator verifikasi:</strong> '+escapeHtml(item.verify)+'</p></div>'+
    '<div class="cld">'+(item.loops.length?item.loops.map(loop=>'<span>CLD '+escapeHtml(loop)+'</span>').join(""):'<span>Gerbang validitas data</span>')+'</div>'+
    '<div class="result-footer">Usulan awal; perlu REVIEW oleh pengelola dan VERIFY setelah tindakan. Tidak menyatakan hubungan kausal sudah terbukti.</div>'+
    '</article>';
}
function renderRecommendations(){
  if(!profile)return;
  const options=decisionOptions(profile,answers);
  const questions=BASE_QUESTIONS.concat(relevantDeep());
  const unknown=questions.filter(q=>!answers[q.id]||answers[q.id]==="tidak_tahu").length;
  const hold=profile.gate==="HOLD";
  el("result-data-meta").textContent=sourceName+" · "+profile.periods.length+" periode";
  el("result-summary").innerHTML='<div><strong>'+(hold?"HOLD — verifikasi kualitas data terlebih dahulu":options.length+" opsi untuk dipertimbangkan")+'</strong>'+
    '<p>'+(hold?"Tidak ada rekomendasi perubahan teknis sebelum denominator dan linkage dapat diverifikasi.":"Kelengkapan core "+percent(profile.aggregate.coreRate)+", strict "+percent(profile.aggregate.strictRate)+".")+
    ' '+unknown+' dari '+questions.length+' pertanyaan belum diketahui/belum diisi. Peringkat merupakan aturan triase demonstrasi, bukan efektivitas terukur.</p></div>';
  el("recommendations").innerHTML=options.slice(0,3).map(recommendationMarkup).join("");
  el("more-recommendations").innerHTML=options.length>3?'<details class="more-options"><summary>Lihat '+(options.length-3)+' opsi lainnya</summary><div class="result-list" style="margin-top:14px">'+options.slice(3).map((o,i)=>recommendationMarkup(o,i+3)).join("")+'</div></details>':"";
}
function downloadResult(){
  if(!profile)return;
  const allowed=new Set(BASE_QUESTIONS.concat(relevantDeep()).map(q=>q.id));
  const answered=Object.fromEntries(Object.entries(answers).filter(([key])=>allowed.has(key)));
  const snapshot={
    schema:"aism-research-aggregate-v0.4",generatedAt:new Date().toISOString(),sourceFileName:sourceName,
    note:"Data agregat tanpa identitas pasien. Aturan CLD dan prioritas adalah hipotesis, belum bukti kausal.",
    dataGate:profile.gate,periods:profile.periods,aggregatedCounts:profile.aggregate,
    byService:profile.byService,trajectory:profile.trajectories,
    assessment:answered,options:decisionOptions(profile,answered)
  };
  const uri=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=uri;link.download="AISM-keputusan-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(uri),1500);
}
function init(){
  el("file-input").addEventListener("change",async event=>{await importFile(event.target.files[0]);event.target.value="";});
  el("sample-data").addEventListener("click",async()=>{
    try{const response=await fetch("./samples/contoh-data-pengiriman-rme.csv",{cache:"no-store"});
      if(!response.ok)throw Error("File contoh tidak tersedia.");
      loadCsv(await response.text(),"Data contoh sintetis");
    }catch(error){clearData();message(error.message,"error");}
  });
  document.querySelectorAll("[data-nav]").forEach(node=>node.addEventListener("click",()=>showStage(Number(node.dataset.nav))));
  el("next-to-assessment").addEventListener("click",()=>{setLevel(1);showStage(2);});
  el("back-to-data").addEventListener("click",()=>showStage(1));
  el("to-deep").addEventListener("click",()=>setLevel(2));
  el("back-to-base").addEventListener("click",()=>setLevel(1));
  el("to-results").addEventListener("click",()=>showStage(3));
  el("edit-assessment").addEventListener("click",()=>{setLevel(1);showStage(2);});
  el("download-report").addEventListener("click",downloadResult);
  el("print-report").addEventListener("click",()=>window.print());
  el("stage-assessment").addEventListener("change",event=>{
    const key=event.target.dataset.answer;if(!key)return;
    answers[key]=event.target.value;
    if(level===1)renderDeep();
    else updateProgress();
  });
  clearData();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();