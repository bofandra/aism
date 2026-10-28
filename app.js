(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const fmt = n => Math.round(n).toLocaleString("id-ID");
  const pct = n => Number(n).toFixed(1).replace(".",",") + "%";
  const fields = ["episodes","completeness","backlog","correctionDays","repeatErrors","visibility","ownership","terminology","capacity"];
  const presets = {
    backlog: {episodes:500,completeness:70,backlog:90,correctionDays:7,repeatErrors:22,visibility:60,ownership:65,terminology:4,capacity:40,evidence:"adequate",matured:true,transition:false},
    ownership: {episodes:500,completeness:74,backlog:40,correctionDays:4,repeatErrors:10,visibility:80,ownership:20,terminology:3,capacity:75,evidence:"adequate",matured:true,transition:false},
    terminology: {episodes:520,completeness:77,backlog:30,correctionDays:3,repeatErrors:12,visibility:75,ownership:80,terminology:21,capacity:75,evidence:"adequate",matured:true,transition:false},
    insufficient: {episodes:40,completeness:62,backlog:18,correctionDays:11,repeatErrors:30,visibility:30,ownership:25,terminology:10,capacity:30,evidence:"insufficient",matured:false,transition:false}
  };
  const config = {
    M1: {label:"Observabilitas",title:"Bangun visibilitas episode tidak lengkap",description:"Tampilkan titik putus ServiceRequest → hasil diagnostik dan daftar episode yang memerlukan investigasi.",owner:"Tim integrasi / mutu data RS",indicator:"Proporsi exception terdeteksi dan median waktu identifikasi",risk:"Dashboard tanpa SOP tindak lanjut hanya memindahkan backlog."},
    M2: {label:"Ownership",title:"Tetapkan PIC, SLA dan eskalasi koreksi",description:"Petakan penanggung jawab antar unit (klinisi, SIMRS, lab/rad, vendor) hingga verifikasi selesai.",owner:"Manajemen RS dan koordinator interoperabilitas",indicator:"Exception dengan PIC jelas, waktu eskalasi dan bukti closure",risk:"Penugasan tanpa kewenangan atau sumber daya tidak efektif."},
    M3: {label:"Retry / exception",title:"Prioritaskan antrean exception & mekanisme recovery",description:"Kelompokkan error berulang, terapkan retry yang aman dan dapat diaudit, lalu tindak lanjuti akar masalah.",owner:"Tim integrasi RS bersama vendor",indicator:"Backlog mingguan, error berulang dan waktu koreksi median",risk:"Retry otomatis tanpa idempotensi dapat menimbulkan duplikasi."},
    M4: {label:"Terminologi",title:"Perbaiki mapping & validasi terminologi",description:"Audit kode pemeriksaan, aturan terminologi, validasi payload dan SOP pengelolaan perubahan mapping.",owner:"Tim standardisasi / integrasi RS dan vendor",indicator:"Persentase kesalahan mapping dan kelengkapan episode diagnostik",risk:"Perubahan mapping berpotensi mengubah makna klinis; perlu review."},
    M5: {label:"Transisi sistem",title:"Perkuat rekonsiliasi selama cutover",description:"Lakukan reconciliation batch, checklist migrasi dan penelusuran episode melintasi sistem lama–baru.",owner:"PM transisi, TI RS, dan vendor terkait",indicator:"Episode hilang pada periode transisi dan penyelesaian mismatch",risk:"Kesalahan pemetaan saat migrasi bisa luput dari deteksi."},
    M6: {label:"Kapasitas / eskalasi",title:"Atur kapasitas koreksi dan jalur eskalasi",description:"Tetapkan prioritas risiko, alokasi waktu PIC dan forum eskalasi untuk mengurangi antrean tertahan.",owner:"Pimpinan layanan, unit mutu dan TI RS",indicator:"Throughput koreksi per pekan, backlog dan keterlambatan",risk:"Redistribusi beban tanpa penambahan kapasitas bisa menggeser masalah."}
  };
  let selectedPreset = "backlog";
  let projected = false;
  let state = null;

  function read() {
    const o = {};
    fields.forEach(k => o[k] = Number($(k).value));
    o.evidence = $("evidence").value;
    o.matured = $("matured").checked;
    o.transition = $("transition").checked;
    return o;
  }
  function evidenceGate(d) {
    const reasons = [];
    if (!d.matured) reasons.push("kohort belum matang atau denominator belum jelas");
    if (d.episodes < 50) reasons.push("sampel eligible kurang dari 50 episode (ambang DEMO)");
    if (d.evidence === "insufficient") reasons.push("bukti dasar tidak memadai");
    if (reasons.length) return {type:"hold",label:"HOLD",title:"HOLD — investigasi bukti diperlukan",detail:"Tidak ada intervensi yang dipilih. Perbaiki "+reasons.join("; ")+"."};
    if (d.evidence === "partial") return {type:"warn",label:"INVESTIGATE",title:"Bukti parsial — diagnosis belum dapat dipastikan",detail:"Validasi indikator bersama audit proses, wawancara dan bukti pengecualian sebelum menentukan intervensi."};
    return {type:"ready",label:"READY",title:"Bukti memenuhi syarat skrining awal",detail:"Kohort eligible matang dan kualitas bukti diandaikan memadai. Diagnosis mekanisme tetap hipotesis, bukan kesimpulan kausal."};
  }
  function scores(d) {
    const result = [
      {id:"M1",score:100-d.visibility,reason:"Observabilitas "+d.visibility+"%"},
      {id:"M2",score:100-d.ownership,reason:"PIC jelas "+d.ownership+"%"},
      {id:"M3",score:Math.max(clamp(d.backlog/Math.max(1,d.episodes)*200,0,100),clamp(d.correctionDays*10,0,100),clamp(d.repeatErrors*2,0,100)),reason:fmt(d.backlog)+" tiket, "+d.correctionDays+" hari, error "+d.repeatErrors+"%"},
      {id:"M4",score:clamp(d.terminology*5,0,100),reason:"Mapping bermasalah "+d.terminology+"%"},
      {id:"M5",score:d.transition?74:0,reason:d.transition?"Periode transisi sistem aktif":"Tidak ada transisi sistem"},
      {id:"M6",score:100-d.capacity,reason:"Kapasitas tim "+d.capacity+"%"}
    ];
    return result.map(x=>({...x,score:Math.round(x.score)})).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
  }
  function decide(d,gate,rank) {
    if (gate.type !== "ready") return {type:"hold",id:null,reason:"Evidence gate belum lolos. Diagnosis belum cukup kuat untuk dasar pilot."};
    if (rank[0].score < 30) return {type:"hold",id:null,reason:"Tidak ada sinyal mekanisme dominan pada ambang heuristik DEMO; lakukan investigasi lebih lanjut."};
    return {type:"recommend",id:rank[0].id,score:rank[0].score,reason:rank[0].reason};
  }
  function chartData(d,decision) {
    const cohort = d.episodes, incoming = Math.max(20,Math.round(cohort*.13)), p0=d.completeness/100;
    const baselineRate = .025 + .14*d.capacity/100;
    const focus = decision.type==="recommend"?decision.score/100:0;
    const afterDelayRate = clamp(baselineRate + .025 + focus*.11,0,.38);
    const afterDelayComplete = clamp(p0+.03+focus*.08,0,.985);
    let baselineOpen = cohort*(1-p0), withPilotOpen = baselineOpen, total = cohort;
    const baseline = [100*(1-baselineOpen/total)],pilot=[100*(1-withPilotOpen/total)];
    for (let week=1;week<=12;week++) {
      const enabled = week>3 && decision.type==="recommend";
      const bNew=incoming*(1-p0), pNew=incoming*(1-(enabled?afterDelayComplete:p0));
      baselineOpen = Math.max(0,baselineOpen + bNew - baselineOpen*baselineRate);
      withPilotOpen = Math.max(0,withPilotOpen + pNew - withPilotOpen*(enabled?afterDelayRate:baselineRate));
      total+=incoming;
      baseline.push(100*(1-baselineOpen/total));
      pilot.push(100*(1-withPilotOpen/total));
    }
    return {baseline,pilot,initialTotal:cohort,weeklyIncoming:incoming,baselineCorrectionRate:baselineRate,interventionCorrectionRate:afterDelayRate,interventionNewEpisodeCompleteRate:afterDelayComplete,delayWeeks:3};
  }
  function updateValues(d) {
    fields.forEach(k => {const suff = ["completeness","repeatErrors","visibility","ownership","terminology","capacity"].includes(k)?"%":(k==="correctionDays"?" hari":"");$(k+"-value").textContent = fmt(d[k])+suff});
    $("kpiCompleteness").textContent=d.completeness+"%";
    $("kpiCompleted").textContent=fmt(d.episodes*d.completeness/100)+" dari "+fmt(d.episodes)+" episode";
    $("kpiIncomplete").textContent=fmt(d.episodes*(1-d.completeness/100));
    $("kpiBacklog").textContent=fmt(d.backlog);
    $("kpiDays").innerHTML=d.correctionDays+" <sup>hari</sup>";
  }
  function renderGate(g) {
    const el=document.querySelector(".gate");el.className="gate card "+(g.type==="ready"?"":g.type);
    $("gateIcon").textContent=g.type==="ready"?"✓":g.type==="warn"?"!":"×";
    $("gateTitle").textContent=g.title;
    $("gateDetail").textContent=g.detail;
    $("gateStatus").textContent=g.label;
  }
  function renderMechanisms(rank,gate) {
    $("mechanisms").innerHTML=rank.map((m,index)=>{
      const name=config[m.id].label;
      return '<div class="mech-row '+(index===0&&gate.type==="ready"?'winner':'')+'" title="'+m.reason+'"><div class="mech-main"><div class="mech-meta"><strong>'+m.id+" · "+name+'</strong></div><div class="mech-track"><div class="mech-fill" style="width:'+m.score+'%"></div></div></div><span class="mech-score">'+m.score+'</span></div>';
    }).join("");
  }
  function renderDecision(decision,rank) {
    if (decision.type!=="recommend") {
      $("recommendation").innerHTML='<span class="decision-chip hold">HOLD / INVESTIGATE</span><div class="recommendation-title">Belum memilih intervensi</div><p class="recommendation-description">AISM tidak memaksakan tindakan ketika bukti tidak cukup atau sinyal mekanisme belum jelas.</p><div class="reason-box">'+decision.reason+'</div><div class="decision-meta"><div><span>Langkah</span><strong>Validasi denominator, audit error, wawancara proses dan periksa kemungkinan mekanisme alternatif.</strong></div><div><span>Pengaman</span><strong>Jangan jalankan pilot berdasarkan skor simulasi saja.</strong></div></div>';
      return;
    }
    const rec=config[decision.id],alternative=rank[1],alt=config[alternative.id];
    $("recommendation").innerHTML='<span class="decision-chip">PRIORITAS '+decision.id+' · SKOR '+decision.score+'</span><div class="recommendation-title">'+rec.title+'</div><p class="recommendation-description">'+rec.description+'</p><div class="reason-box"><strong>Mengapa dipilih?</strong><br>'+decision.reason+' — sinyal heuristik tertinggi dalam kasus ini.</div><div class="decision-meta"><div><span>PIC</span><strong>'+rec.owner+'</strong></div><div><span>Verifikasi</span><strong>'+rec.indicator+'</strong></div><div><span>Risiko</span><strong>'+rec.risk+'</strong></div><div><span>Alternatif</span><strong>'+alternative.id+' · '+alt.label+' ('+alternative.score+')</strong></div></div>';
  }
  function renderChart(model,showPilot) {
    const w=760,h=276,l=49,r=22,t=14,b=33,plotW=w-l-r,plotH=h-t-b;
    const vals=showPilot?model.baseline.concat(model.pilot):model.baseline;
    const min=clamp(Math.floor((Math.min(...vals)-8)/10)*10,0,90);
    const max=clamp(Math.ceil((Math.max(...vals)+7)/10)*10,min+10,100);
    const x=i=>l+i/12*plotW,y=v=>t+(max-v)/(max-min)*plotH;
    const poly=arr=>arr.map((v,i)=>x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ");
    let lines="";
    for (let i=0;i<=4;i++) {
      const val=min+(max-min)*i/4,yy=y(val);
      lines+='<line x1="'+l+'" y1="'+yy+'" x2="'+(w-r)+'" y2="'+yy+'" stroke="#e6edf1" stroke-width="1"/>';
      lines+='<text x="'+(l-12)+'" y="'+(yy+4)+'" font-size="11" text-anchor="end" fill="#8194a4">'+Math.round(val)+'%</text>';
    }
    for (let wk=0;wk<=12;wk+=3) lines+='<text x="'+x(wk)+'" y="'+(h-10)+'" font-size="11" text-anchor="middle" fill="#8496a6">M'+wk+'</text>';
    const baseline='<polyline points="'+poly(model.baseline)+'" fill="none" stroke="#98aebd" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
    const treated=showPilot?'<polyline points="'+poly(model.pilot)+'" fill="none" stroke="#0ca78e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="'+x(12)+'" cy="'+y(model.pilot[12])+'" r="5" fill="#0ca78e" stroke="#fff" stroke-width="2"/><text x="'+(x(12)-5)+'" y="'+(y(model.pilot[12])-13)+'" font-size="12" font-weight="800" text-anchor="end" fill="#0a947f">'+pct(model.pilot[12])+'</text>':"";
    const delay=showPilot?'<line x1="'+x(3)+'" y1="'+t+'" x2="'+x(3)+'" y2="'+(h-b)+'" stroke="#c6d8d5" stroke-dasharray="4 5"/><text x="'+(x(3)+7)+'" y="'+(t+15)+'" fill="#719488" font-size="10">Jeda adopsi</text>':"";
    $("chart").innerHTML=lines+delay+baseline+treated+'<circle cx="'+x(12)+'" cy="'+y(model.baseline[12])+'" r="4" fill="#98aebd" stroke="#fff" stroke-width="1.5"/>';
    const delta=model.pilot[12]-model.baseline[12];
    $("projectionStats").innerHTML='<div class="stat-chip"><span>Baseline · minggu ke-12</span><strong>'+pct(model.baseline[12])+'</strong></div>'+(showPilot?'<div class="stat-chip result"><span>Intervensi · minggu ke-12</span><strong>'+pct(model.pilot[12])+'</strong></div><div class="stat-chip result"><span>Selisih hipotetis (bukan prediksi)</span><strong>+'+pct(delta).replace("%"," poin persentase")+'</strong></div>':'<div class="stat-chip"><span>Lintasan intervensi</span><strong style="font-size:14px">Belum dijalankan</strong></div>');
  }
  function renderTrace(d,gate,rank,decision) {
    const rec=decision.id?config[decision.id]:null;
    const cards=[
      ["01","Kualitas bukti",gate.type==="ready"?"Eligible "+fmt(d.episodes)+" episode; denominator matang; evidence memadai (asumsi kasus).":gate.detail],
      ["02","Mekanisme untuk diuji","Sinyal tertinggi "+rank[0].id+" ("+config[rank[0].id].label+"), skor heuristik "+rank[0].score+"/100; butuh triangulasi."],
      ["03","Keputusan & pengaman",rec?rec.title+"; pemilik: "+rec.owner+". Persetujuan diperlukan.":"HOLD/INVESTIGATE — perbaiki bukti sebelum pilot."],
      ["04","Closure & pembelajaran",rec?"Lacak "+rec.indicator.toLowerCase()+"; review terhadap baseline dan konfirmasi bersama PIC.":"Audit kembali input, tentukan denominator dan ulangi evidence gate."]
    ];
    $("trace").innerHTML=cards.map(t=>'<div class="trace-step"><span class="trace-number">'+t[0]+'</span><strong>'+t[1]+'</strong><p>'+t[2]+'</p></div>').join("");
  }
  function render() {
    const d=read(),gate=evidenceGate(d),rank=scores(d),decision=decide(d,gate,rank),model=chartData(d,decision);
    state={input:d,gate,mechanisms:rank,decision,model};
    updateValues(d);renderGate(gate);renderMechanisms(rank,gate);renderDecision(decision,rank);renderChart(model,projected&&decision.type==="recommend");renderTrace(d,gate,rank,decision);
    $("run").disabled=gate.type!=="ready"||decision.type!=="recommend";
    if(gate.type!=="ready") {projected=false;$("approved").checked=false;$("projectionMessage").className="projection-message error";$("projectionMessage").textContent="Pilot tidak diizinkan pada demonstrator ini: "+gate.title+".";}
    else if(decision.type!=="recommend") {$("projectionMessage").className="projection-message error";$("projectionMessage").textContent="Tidak ada intervensi layak untuk diproyeksikan.";}
    else if(projected) {$("projectionMessage").className="projection-message success";$("projectionMessage").textContent="Proyeksi hipotetis ditampilkan. Efek muncul setelah jeda 3 minggu; gunakan hanya sebagai alat diskusi asumsi.";}
    else {$("projectionMessage").className="projection-message";$("projectionMessage").textContent="Centang persetujuan pilot hipotetis, lalu klik Jalankan proyeksi. Tidak ada tindakan pada sistem nyata.";}
  }
  function fillPreset(name) {
    if(!presets[name]) return;
    const preset=presets[name]; selectedPreset=name;
    fields.forEach(k=>$(k).value=preset[k]);
    $("evidence").value=preset.evidence;$("matured").checked=preset.matured;$("transition").checked=preset.transition;
    projected=false;$("approved").checked=false;
    document.querySelectorAll("[data-preset]").forEach(btn=>btn.classList.toggle("active",btn.dataset.preset===name));
    render();
  }
  function changeInput() {
    selectedPreset=null;projected=false;$("approved").checked=false;
    document.querySelectorAll("[data-preset]").forEach(btn=>btn.classList.remove("active"));
    render();
  }
  fields.forEach(k=>$(k).addEventListener("input",changeInput));
  ["evidence","matured","transition"].forEach(k=>$(k).addEventListener("change",changeInput));
  document.querySelectorAll("[data-preset]").forEach(btn=>btn.addEventListener("click",()=>fillPreset(btn.dataset.preset)));
  $("reset").addEventListener("click",()=>fillPreset("backlog"));
  $("approved").addEventListener("change",()=>{projected=false;render()});
  $("run").addEventListener("click",()=>{
    if(!state||state.gate.type!=="ready"||state.decision.type!=="recommend")return;
    if(!$("approved").checked) {$("projectionMessage").className="projection-message error";$("projectionMessage").textContent="Persetujuan pilot hipotetis belum diberikan. Centang kotak persetujuan terlebih dahulu.";return;}
    projected=true;render();
  });
  function report() {
    const s=state;
    return {artefact:"AISM Lab",version:"0.1 demo",createdAt:new Date().toISOString(),scenario:selectedPreset||"custom",dataType:"synthetic only",input:s.input,evidenceGate:s.gate,mechanismScores:s.mechanisms,decision:s.decision,recommendedIntervention:s.decision.id?config[s.decision.id]:null,pilotApproved:$("approved").checked,projectionExecuted:projected,projection:projected?s.model:null,disclaimer:"Heuristic scores and dynamic coefficients are illustrative, uncalibrated and unvalidated. Not a clinical decision tool or SATUSEHAT policy."};
  }
  $("download").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(report(),null,2)],{type:"application/json;charset=utf-8"});
    const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="aism-simulation-"+(selectedPreset||"custom")+".json";link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  });
  $("copy").addEventListener("click",()=>{
    const s=state;const rec=s.decision.id?config[s.decision.id].title:"HOLD / INVESTIGATE";
    const content="AISM Lab (simulasi sintetis)\nKelengkapan: "+s.input.completeness+"% / "+s.input.episodes+" eligible matured\nEvidence gate: "+s.gate.label+"\nHipotesis mekanisme: "+s.mechanisms[0].id+" · "+config[s.mechanisms[0].id].label+" ("+s.mechanisms[0].score+"/100, heuristik)\nRekomendasi: "+rec+"\nPilot: "+(projected?"proyeksi hipotetis dijalankan":"belum dijalankan")+"\nCatatan: bukan hasil empiris, keputusan klinis, atau kebijakan SATUSEHAT.";
    const btn=$("copy");if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(content).then(()=>{btn.textContent="✓ Disalin";setTimeout(()=>btn.textContent="Salin ringkasan ↗",1800)}).catch(()=>{btn.textContent="Tidak dapat menyalin";setTimeout(()=>btn.textContent="Salin ringkasan ↗",1800)})}else{btn.textContent="Salin tidak didukung";setTimeout(()=>btn.textContent="Salin ringkasan ↗",1800)}
  });
  fillPreset("backlog");
})();
