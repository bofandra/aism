
/* AISM Lite: entirely client-side, aggregate data only. Rules are exploratory CLD hypotheses. */
(function () {
  "use strict";
  const el = (id) => document.getElementById(id);
  const REQUIRED = ["periode", "jenis_layanan", "total_eligible", "total_terkirim", "total_lengkap", "total_gagal_validasi"];
  const BASE = [
    {id:"monitor", label:"Apakah kelengkapan pengiriman data dipantau secara rutin?", hint:"Contoh: pemantauan mingguan, pemisahan laboratorium dan radiologi."},
    {id:"mapping", label:"Apakah terminologi, mapping kode, dan struktur FHIR diperiksa rutin?", hint:"Bukan hanya status API berhasil, tetapi juga mutu data yang diterima."},
    {id:"capacity", label:"Apakah ada PIC yang mempunyai waktu untuk mengoreksi masalah data?", hint:"Peran, alokasi waktu, dan penanganan antrean masalah."},
    {id:"escalation", label:"Apakah terdapat alur eskalasi dan verifikasi bahwa masalah benar-benar selesai?", hint:"Termasuk vendor SIMRS atau tim integrasi, jika diperlukan."},
    {id:"change", label:"Apakah ada migrasi, pergantian, atau perubahan besar sistem dalam 3 bulan terakhir?", hint:"Pertanyaan ini menggunakan jawaban Ya / Tidak / Belum tahu.", binary:true},
    {id:"leadership", label:"Apakah pimpinan atau pengelola layanan meninjau kualitas data untuk tindak lanjut?", hint:"Contoh: laporan mutu pengiriman digunakan dalam rapat perbaikan."}
  ];
  const DEEP = [
    {id:"integration", label:"Apakah gangguan API, koneksi, antrean, atau proses kirim ulang sering terjadi?", when:(m,a)=>m.sentRate<.9 || a.change==="ya"},
    {id:"validation", label:"Apakah ditemukan error terminologi, kode, atau struktur resource FHIR?", when:(m,a)=>m.completeOfSent<.9 || m.failRate>=.05 || ["tidak","sebagian"].includes(a.mapping)},
    {id:"monitor_detail", label:"Apakah sudah ada daftar episode belum lengkap beserta kategori penyebabnya?", when:(m,a)=>a.monitor!=="ya"},
    {id:"backlog", label:"Apakah tiket atau pekerjaan koreksi sering menumpuk lebih dari satu minggu?", when:(m,a)=>a.capacity!=="ya" || m.completeRate<.9},
    {id:"migration", label:"Apakah perubahan sistem tersebut masih menyisakan masalah integrasi atau backfill?", when:(m,a)=>a.change==="ya"},
    {id:"escalation_check", label:"Apakah ada tiket yang dinyatakan selesai tanpa uji ulang keberhasilan pengiriman?", when:(m,a)=>a.escalation!=="ya"},
    {id:"stable", label:"Apakah perbaikan yang dilakukan telah dicek agar tidak berulang pada periode berikutnya?", when:(m,a)=>m.sentRate>=.9 && m.completeOfSent>=.9 && a.monitor==="ya" && a.mapping==="ya"}
  ];
  const OPTION_LABEL = {ya:"Ya",sebagian:"Sebagian",tidak:"Tidak",tidak_tahu:"Belum tahu"};
  let rows = [];
  let sourceName = "";
  let answers = {};
  let activeStage = 1;
  let assessmentLevel = 1;
  const percentage = (v) => Number.isFinite(v) ? (v*100).toLocaleString("id-ID",{maximumFractionDigits:1})+"%" : "—";
  const integer = (v) => Number(v).toLocaleString("id-ID");
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const sum = (items, name) => items.reduce((acc,row)=>acc+row[name],0);
  const totals = (items) => {
    const eligible=sum(items,"total_eligible"), sent=sum(items,"total_terkirim");
    const complete=sum(items,"total_lengkap"), failed=sum(items,"total_gagal_validasi");
    return {eligible,sent,complete,failed,sentRate:eligible?sent/eligible:0,completeRate:eligible?complete/eligible:0,completeOfSent:sent?complete/sent:0,failRate:eligible?failed/eligible:0};
  };
  function csvMatrix(input) {
    const text = String(input).replace(/^\uFEFF/,"");
    const heading = text.split(/\r?\n/,1)[0] || "";
    const delimiter = (heading.match(/;/g)||[]).length>(heading.match(/,/g)||[]).length?";":",";
    const out=[]; let row=[], field="", quoted=false;
    for(let i=0;i<text.length;i++) {
      const ch=text[i];
      if(ch==='"') {
        if(quoted && text[i+1]==='"'){field+='"';i++} else {quoted=!quoted}
      } else if(ch===delimiter && !quoted){row.push(field.trim());field=""}
      else if((ch==="\n" || ch==="\r") && !quoted){
        if(ch==="\r" && text[i+1]==="\n")i++;
        row.push(field.trim());field="";
        if(row.some(v=>v!==""))out.push(row);
        row=[];
      } else {field+=ch}
    }
    if(quoted)throw Error("Tanda kutip CSV tidak tertutup.");
    row.push(field.trim());if(row.some(v=>v!==""))out.push(row);
    return out;
  }
  function parseData(content) {
    const matrix=csvMatrix(content);
    if(matrix.length<2)throw Error("File harus memiliki header dan minimal satu baris data.");
    if(matrix.length>301)throw Error("Maksimum 300 baris data per unggahan.");
    const headings=matrix[0].map(v=>v.trim().toLowerCase());
    const missing=REQUIRED.filter(field=>!headings.includes(field));
    if(missing.length)throw Error("Kolom wajib tidak ada: "+missing.join(", "));
    const prohibited=["nik","nama_pasien","nama_pasien_lengkap","no_rm","nomor_rekam_medis","mrn","patient_id","pasien_id","alamat_pasien"];
    const found=headings.filter(h=>prohibited.includes(h));
    if(found.length)throw Error("Kolom identitas pasien tidak diizinkan: "+found.join(", "));
    const seen=new Set();
    return matrix.slice(1).map((cells,i)=>{
      const item={}; headings.forEach((h,j)=>item[h]=(cells[j]||"").trim());
      const line=i+2;
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(item.periode))throw Error("Baris "+line+": periode harus YYYY-MM.");
      item.jenis_layanan=item.jenis_layanan.toLowerCase();
      if(!["laboratorium","radiologi"].includes(item.jenis_layanan))throw Error("Baris "+line+": jenis_layanan harus laboratorium atau radiologi.");
      const key=item.periode+"|"+item.jenis_layanan;
      if(seen.has(key))throw Error("Baris "+line+": periode dan jenis_layanan duplikat.");
      seen.add(key);
      REQUIRED.slice(2).forEach(field=>{
        const value=item[field];
        if(!/^\d+$/.test(value))throw Error("Baris "+line+": "+field+" harus bilangan bulat non-negatif.");
        const number=Number(value);
        if(!Number.isSafeInteger(number))throw Error("Baris "+line+": angka terlalu besar.");
        item[field]=number;
      });
      if(item.total_eligible===0)throw Error("Baris "+line+": total_eligible harus lebih dari 0.");
      if(item.total_lengkap>item.total_terkirim || item.total_terkirim>item.total_eligible)throw Error("Baris "+line+": wajib total_lengkap ≤ total_terkirim ≤ total_eligible.");
      if(item.total_gagal_validasi>item.total_eligible)throw Error("Baris "+line+": gagal_validasi tidak boleh melebihi total_eligible.");
      return item;
    });
  }
  function setMessage(text,type) {
    const box=el("data-feedback");
    box.textContent=text;
    box.className="feedback "+(type||"ok");
  }
  function showStage(num) {
    if(num>1 && !rows.length)return;
    if(num===3)renderRecommendations();
    activeStage=num;
    document.querySelectorAll(".stage").forEach(node=>node.classList.toggle("active",node.id==="stage-"+["data","assessment","results"][num-1]));
    document.querySelectorAll("[data-nav]").forEach(node=>{
      const current=Number(node.dataset.nav)===num;
      if(current)node.setAttribute("aria-current","step");else node.removeAttribute("aria-current");
    });
    window.scrollTo({top:Math.max(0,el("workflow").getBoundingClientRect().top+window.scrollY-15),behavior:"smooth"});
  }
  function renderData() {
    const has=rows.length>0;
    el("data-summary").classList.toggle("hide",!has);
    el("next-to-assessment").disabled=!has;
    if(!has)return;
    const m=totals(rows);
    el("source-name").textContent=sourceName+" · "+rows.length+" baris agregat";
    el("metric-grid").innerHTML=[
      ["Episode eligible",integer(m.eligible),"Total episode dalam denominator"],
      ["Terkirim",percentage(m.sentRate),integer(m.sent)+" dari "+integer(m.eligible)],
      ["Lengkap",percentage(m.completeRate),integer(m.complete)+" dari "+integer(m.eligible)],
      ["Gagal validasi",integer(m.failed),percentage(m.failRate)+" dari episode eligible"]
    ].map(v=>'<div class="metric"><span class="label">'+v[0]+'</span><strong>'+v[1]+'</strong><small>'+v[2]+'</small></div>').join("");
    const services=["laboratorium","radiologi"].map(name=>({name, ...totals(rows.filter(r=>r.jenis_layanan===name))}));
    el("service-table").innerHTML=services.map(s=>'<tr><td><strong>'+s.name+'</strong></td><td>'+integer(s.eligible)+'</td><td>'+percentage(s.sentRate)+'</td><td>'+percentage(s.completeRate)+'</td><td>'+integer(s.failed)+'</td></tr>').join("");
    el("period-range").textContent="Periode "+rows.map(r=>r.periode).sort()[0]+" s.d. "+rows.map(r=>r.periode).sort().at(-1);
  }
  async function importCsv(file){
    if(!file)return;
    if(file.size>2*1024*1024){setMessage("Batas ukuran file 2 MB. Gunakan data agregat, bukan data per pasien.","error");return}
    try{loadCsv(await file.text(),file.name)}
    catch(err){setMessage("Gagal membaca file: "+err.message,"error")}
  }
  function loadCsv(csv,name){
    try {
      const parsed=parseData(csv);
      rows=parsed;sourceName=name;answers={};assessmentLevel=1;
      setMessage("File valid: "+parsed.length+" baris data agregat berhasil diproses di browser.","ok");
      renderData();renderBase();renderDeep();
    }catch(err){rows=[];sourceName="";answers={};assessmentLevel=1;renderData();renderBase();renderDeep();setMessage(err.message,"error")}
  }
  function questionHtml(q,prefix) {
    const options=q.binary?["ya","tidak","tidak_tahu"]:["ya","sebagian","tidak","tidak_tahu"];
    const optionsHtml=options.map(value=>{
      const checked=answers[q.id]===value?' checked':'';
      return '<label class="choice"><input type="radio" name="'+prefix+q.id+'" value="'+value+'" data-answer="'+q.id+'"'+checked+'><span>'+OPTION_LABEL[value]+'</span></label>';
    }).join("");
    return '<fieldset class="question"><legend>'+escapeHtml(q.label)+(q.hint?'<span class="hint">'+escapeHtml(q.hint)+'</span>':"")+'</legend><div class="choices">'+optionsHtml+'</div></fieldset>';
  }
  function renderBase(){el("base-questions").innerHTML=BASE.map(q=>questionHtml(q,"base-")).join("");updateAnswerProgress()}
  function requiredDeep(){if(!rows.length)return [];const m=totals(rows);return DEEP.filter(q=>q.when(m,answers))}
  function renderDeep(){
    const list=requiredDeep();
    el("deep-questions").innerHTML=list.length?list.map(q=>questionHtml(q,"deep-")).join(""):'<p class="guidance">Tidak ada pertanyaan pendalaman yang terpicu. Lanjutkan untuk melihat hasil berdasarkan data yang tersedia.</p>';
    el("deep-count").textContent=list.length+" pertanyaan kontekstual";
    updateAnswerProgress();
  }
  function updateAnswerProgress(){
    const baseComplete=BASE.filter(q=>Boolean(answers[q.id])).length;
    const deep=requiredDeep();const deepComplete=deep.filter(q=>Boolean(answers[q.id])).length;
    el("assess-progress").textContent="Dasar "+baseComplete+"/"+BASE.length+" · Pendalaman "+deepComplete+"/"+deep.length+" dijawab";
  }
  function setAssessmentLevel(level) {
    assessmentLevel=level;
    el("base-block").classList.toggle("hide",level!==1);
    el("deep-block").classList.toggle("hide",level!==2);
    el("back-to-data").classList.toggle("hide",level!==1);
    el("to-deep").classList.toggle("hide",level!==1);
    el("back-to-base").classList.toggle("hide",level!==2);
    el("to-results").classList.toggle("hide",level!==2);
    el("assessment-title").textContent=level===1?"Assessment dasar":"Pendalaman sesuai kondisi";
    el("assessment-desc").textContent=level===1?"Jawab berdasarkan kondisi operasional saat ini. Pilih Belum tahu jika bukti tidak tersedia.":"Pertanyaan berikut muncul sesuai temuan data dan jawaban tahap dasar.";
    if(level===2)renderDeep();
  }
  function makeCandidate(id,title,loops,action,indicator){
    return {id,title,loops,action,indicator,score:0,reasons:[]};
  }
  function add(c,points,reason){c.score+=points;c.reasons.push(reason)}
  function evaluate(){
    const m=totals(rows);const a={...answers};const candidates=[];
    const activeDeep=new Set(requiredDeep().map(q=>q.id));
    DEEP.forEach(q=>{if(!activeDeep.has(q.id))delete a[q.id]});
    let c=makeCandidate("delivery","Pulihkan alur pengiriman RME",["B2","B3"],"Telusuri titik gagal dari antrean SIMRS → integrasi → respons SATUSEHAT; uji kirim ulang dan lakukan rekonsiliasi episode.","Rasio terkirim / eligible per layanan dan per periode");
    if(m.sentRate<.9)add(c,m.sentRate<.75?5:3,"Data: baru "+percentage(m.sentRate)+" episode eligible terkirim (ambang eksploratif 90%).");
    if(a.integration==="ya")add(c,3,"Pendalaman: gangguan API, antrean atau retry dilaporkan.");
    if(a.integration==="sebagian")add(c,1,"Pendalaman: sebagian gangguan pengiriman dilaporkan.");
    if(a.change==="ya" && a.migration==="ya")add(c,3,"Perubahan sistem disertai persoalan migrasi atau backfill yang belum selesai.");
    if(c.score)candidates.push(c);
    c=makeCandidate("quality","Audit mapping kode dan validasi FHIR",["R3"],"Ambil sampel error agregat, kelompokkan per kode/resource, perbaiki mapping dan validasi isi setelah respons API berhasil.","Rasio lengkap / terkirim dan jumlah episode gagal validasi");
    if(m.completeOfSent<.9)add(c,m.completeOfSent<.75?5:3,"Data: "+percentage(m.completeOfSent)+" dari episode terkirim dinilai lengkap (ambang eksploratif 90%).");
    if(m.failRate>=.05)add(c,2,"Data: "+percentage(m.failRate)+" episode eligible tercatat gagal validasi.");
    if(a.mapping==="tidak")add(c,3,"Assessment: pengelolaan mapping dan struktur FHIR belum rutin.");
    if(a.mapping==="sebagian")add(c,1,"Assessment: pemeriksaan mapping baru sebagian.");
    if(a.validation==="ya")add(c,3,"Pendalaman: error terminologi atau struktur FHIR telah ditemukan.");
    if(c.score)candidates.push(c);
    c=makeCandidate("monitoring","Buat pemantauan kelengkapan dan akar masalah",["R1","R2"],"Pantau episode eligible, terkirim, lengkap, dan gagal validasi secara berkala; kelompokkan error dan evaluasi apakah masalah berulang.","Persentase episode lengkap dan umur masalah terbuka");
    if(a.monitor==="tidak")add(c,4,"Assessment: pemantauan rutin belum berjalan.");
    if(a.monitor==="sebagian")add(c,2,"Assessment: pemantauan baru sebagian.");
    if(a.monitor_detail==="tidak")add(c,3,"Pendalaman: belum tersedia daftar episode belum lengkap dan penyebabnya.");
    if(a.monitor_detail==="sebagian")add(c,1,"Pendalaman: pelacakan episode belum lengkap belum menyeluruh.");
    if(m.completeRate<.75)add(c,1,"Data menunjukkan kesenjangan kelengkapan cukup besar; penyebabnya perlu dipantau.");
    if(c.score)candidates.push(c);
    c=makeCandidate("capacity","Tetapkan PIC dan kurangi backlog koreksi",["R2","R5"],"Tetapkan penanggung jawab dan waktu khusus; triase masalah berdasar volume, usia, dan dampak layanan; tinjau backlog tiap minggu.","Jumlah serta umur tiket terbuka dan episode yang selesai dikoreksi");
    if(a.capacity==="tidak")add(c,4,"Assessment: belum ada kapasitas PIC koreksi yang memadai.");
    if(a.capacity==="sebagian")add(c,2,"Assessment: kapasitas PIC tersedia sebagian.");
    if(a.backlog==="ya")add(c,3,"Pendalaman: pekerjaan koreksi sering menumpuk lebih dari satu minggu.");
    if(a.backlog==="sebagian")add(c,1,"Pendalaman: antrean masalah kadang menumpuk.");
    if(c.score)candidates.push(c);
    c=makeCandidate("escalation","Perbaiki eskalasi dan verifikasi penutupan tiket",["B3"],"Gunakan kategori error, tenggat tindak lanjut, PIC vendor/teknis, dan bukti pengiriman ulang sebelum tiket ditutup.","Proporsi tiket selesai terverifikasi dan waktu penyelesaian");
    if(a.escalation==="tidak")add(c,4,"Assessment: mekanisme eskalasi/cek penyelesaian belum tersedia.");
    if(a.escalation==="sebagian")add(c,2,"Assessment: mekanisme eskalasi belum konsisten.");
    if(a.escalation_check==="ya")add(c,3,"Pendalaman: ada tiket ditutup tanpa uji ulang.");
    if(a.escalation_check==="sebagian")add(c,1,"Pendalaman: sebagian tiket belum selalu diuji ulang.");
    if(c.score)candidates.push(c);
    c=makeCandidate("governance","Jadikan mutu data agenda tindak lanjut pengelola",["R4","B1"],"Sajikan tren lab/radiologi, masalah utama, dan progres penyelesaian dalam pertemuan operasional; sepakati pemilik tindakan dan evaluasi ulang.","Frekuensi tinjauan mutu dan tindak lanjut yang selesai");
    if(a.leadership==="tidak")add(c,4,"Assessment: mutu pengiriman belum masuk peninjauan pengelola.");
    if(a.leadership==="sebagian")add(c,2,"Assessment: peninjauan mutu dan tindak lanjut belum konsisten.");
    if(c.score)candidates.push(c);
    if(!candidates.length){
      c=makeCandidate("maintain","Pertahankan pemantauan dan evaluasi berkala",["R1","R4"],"Lanjutkan audit berkala, pantau deviasi antarperiode, dan tinjau apakah hasil perbaikan benar-benar bertahan.","Tren rasio lengkap/eligible dan masalah berulang");
      add(c,1,"Belum ditemukan pemicu prioritas utama dari data dan jawaban yang diberikan.");
      candidates.push(c);
    }
    candidates.sort((a,b)=>b.score-a.score);
    return {metrics:m,candidates,unknown:BASE.concat(requiredDeep()).filter(q=>!answers[q.id] || answers[q.id]==="tidak_tahu").length,totalQuestions:BASE.length+requiredDeep().length};
  }
  function priority(score){
    if(score>=5)return {name:"Prioritas tinggi",cls:"high"};
    if(score>=3)return {name:"Prioritas menengah",cls:"medium"};
    return {name:"Perlu verifikasi",cls:"verify"};
  }
  function renderCard(item,i) {
    const p=priority(item.score);
    return '<article class="result-card"><div class="result-top"><span class="rank">'+(i+1)+'</span><div class="result-title"><h3>'+escapeHtml(item.title)+'</h3><p>Usulan tindakan berdasarkan aturan eksploratif dan draf CLD.</p></div><span class="priority '+p.cls+'">'+p.name+'</span></div>'+
     '<div class="evidence"><strong>Mengapa muncul?</strong><ul>'+item.reasons.map(r=>'<li>'+escapeHtml(r)+'</li>').join("")+'</ul></div>'+
     '<div class="mini-action"><strong>Langkah awal:</strong> '+escapeHtml(item.action)+'</div>'+
     '<div class="cld">'+item.loops.map(loop=>'<span>CLD '+loop+'</span>').join("")+'</div>'+
     '<div class="result-footer"><strong>Indikator evaluasi:</strong> '+escapeHtml(item.indicator)+'</div></article>';
  }
  function renderRecommendations() {
    if(!rows.length)return;
    const result=evaluate(), shown=result.candidates.slice(0,3), remaining=result.candidates.slice(3);
    el("result-summary").innerHTML='<strong>'+shown.length+' prioritas awal untuk ditelaah</strong><p>'+integer(result.metrics.eligible)+' episode eligible · '+percentage(result.metrics.completeRate)+' lengkap · '+result.unknown+' dari '+result.totalQuestions+' jawaban belum diketahui / belum diisi. Urutan berdasar aturan demonstrasi, bukan prediksi efektivitas.</p>';
    el("recommendations").innerHTML=shown.map(renderCard).join("");
    el("more-recommendations").innerHTML=remaining.length?'<details><summary class="btn secondary" style="display:inline-block;margin-top:15px">Lihat '+remaining.length+' opsi tambahan</summary><div class="result-list" style="margin-top:13px">'+remaining.map((r,i)=>renderCard(r,i+3)).join("")+'</div></details>':"";
    el("result-data-meta").textContent=sourceName+" · "+rows.length+" baris agregat";
  }
  function downloadJson(){
    const result=evaluate();
    const data={
      schema:"aism-lite-result-v1",generated_at:new Date().toISOString(),source:sourceName,
      note:"Demonstrator. Data agregat tanpa identitas pasien. Aturan dan mekanisme CLD belum tervalidasi secara kausal.",
      illustrative_thresholds:{sent_rate:.9,completeness_among_sent:.9,failed_validation_to_eligible:.05},
      metrics:result.metrics,by_service:["laboratorium","radiologi"].map(name=>({name,...totals(rows.filter(r=>r.jenis_layanan===name))})),
      assessment:answers,
      priorities:result.candidates.map(c=>({title:c.title,level:priority(c.score).name,score_exploratory:c.score,reasons:c.reasons,cld:c.loops,action:c.action,indicator:c.indicator}))
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
    const uri=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=uri;anchor.download="AISM-ringkasan-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(uri),1500);
  }
  function init(){
    el("file-input").addEventListener("change",(event)=>{importCsv(event.target.files[0]);event.target.value=""});
    el("sample-data").addEventListener("click",async()=>{
      try {
        const response=await fetch("./samples/contoh-data-pengiriman-rme.csv",{cache:"no-store"});
        if(!response.ok)throw Error("Contoh tidak tersedia ("+response.status+").");
        loadCsv(await response.text(),"Data contoh sintetis");
      }catch(err){setMessage("Tidak dapat membaca contoh: "+err.message,"error")}
    });
    el("next-to-assessment").addEventListener("click",()=>{setAssessmentLevel(1);showStage(2)});
    el("back-to-data").addEventListener("click",()=>showStage(1));
    el("to-deep").addEventListener("click",()=>setAssessmentLevel(2));
    el("back-to-base").addEventListener("click",()=>setAssessmentLevel(1));
    el("to-results").addEventListener("click",()=>showStage(3));
    el("edit-assessment").addEventListener("click",()=>{setAssessmentLevel(1);showStage(2)});
    el("download-report").addEventListener("click",downloadJson);
    el("print-report").addEventListener("click",()=>window.print());
    document.querySelectorAll("[data-nav]").forEach(node=>node.addEventListener("click",()=>showStage(Number(node.dataset.nav))));
    el("stage-assessment").addEventListener("change",(event)=>{
      const key=event.target.dataset.answer;
      if(!key)return;
      answers[key]=event.target.value;
      if(assessmentLevel===1)renderDeep();
      else updateAnswerProgress();
    });
    renderData();renderBase();renderDeep();setAssessmentLevel(1);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();