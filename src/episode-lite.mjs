/**
 * AISM Lite v0.4: transparent, research-aligned processing of aggregate
 * diagnostic episodes. Illustrative decision rules; no causal validation.
 * One episode = one ServiceRequest, pre-aggregated without identifiers.
 */
export const FIELDS = [
  "periode","jenis_layanan","total_order","not_yet_eligible","excluded_order",
  "unverified_linkage","eligible_mature","complete_core","complete_strict",
  "incomplete_with_downstream","completed_without_result","no_downstream_evidence"
];
const NUMERIC = FIELDS.slice(2);
export const SERVICES = ["laboratorium","radiologi"];
const QUESTION_OPTIONS = ["ya","sebagian","tidak","tidak_tahu"];
export const BASE_QUESTIONS = [
  {id:"monitoring",label:"Apakah kelengkapan episode dipantau rutin per laboratorium/radiologi?",hint:"Pemantauan mencakup status hasil, bukan hanya HTTP sukses."},
  {id:"mapping",label:"Apakah mapping kode dan versi terminologi ditinjau saat ada perubahan?",hint:"LOINC dan terminologi lain sesuai kebutuhan jenis pemeriksaan."},
  {id:"capacity",label:"Apakah PIC memiliki alokasi waktu untuk koreksi dan penelusuran masalah?",hint:"Perhatikan hambatan operator alat, LIS/RIS/PACS, middleware, dan IT."},
  {id:"escalation",label:"Apakah ada PIC, log insiden yang disanitasi, dan alur eskalasi yang jelas?",hint:"Eskalasi ke unit/vendor yang berwenang terhadap penyebab."},
  {id:"changes",label:"Apakah terjadi perubahan LIS, RIS, PACS, middleware, atau mapping dalam tiga bulan?",hint:"Contoh: penambahan PACS, pergantian vendor atau routing.",binary:true},
  {id:"leadership",label:"Apakah pengelola meninjau tindak lanjut indikator mutu pengiriman?",hint:"Bukti tindak lanjut tidak harus berasal dari audit kepatuhan."}
];
export const DEEP_QUESTIONS = [
  {id:"dicom_received",label:"Untuk episode radiologi bermasalah, apakah log membuktikan DICOM sumber diterima di PACS/VM?",hint:"Jawab Tidak hanya jika pemeriksaan log menunjukkan sumber tidak diterima; jangan menyimpulkan dari absennya ImagingStudy.",when:(m,a)=>m.radiologi && (m.radiologi.no_downstream_evidence+m.radiologi.completed_without_result>0)},
  {id:"retryable",label:"Apakah log middleware/queue menunjukkan error yang aman untuk di-retry sesudah sumber tersedia?",hint:"Jawab Ya jika log mendukung retryable; tidak semua exception bisa dikirim ulang.",when:(m,a)=>m.aggregate.incomplete_with_downstream+m.aggregate.completed_without_result>0 || a.dicom_received==="ya" || a.dicom_received==="sebagian"},
  {id:"semantic_error",label:"Apakah log/kode error membuktikan kesalahan terminologi atau mapping?",hint:"Jangan menganggap setiap data belum lengkap adalah masalah mapping.",when:(m,a)=>m.aggregate.incomplete_with_downstream>0 || a.mapping!=="ya"},
  {id:"change_log",label:"Apakah perubahan sistem tercatat, dibagikan, dan diverifikasi hingga resource hasil?",hint:"Change log, konfigurasi, dan uji lintas vendor.",when:(m,a)=>a.changes==="ya"},
  {id:"backlog_isolation",label:"Apakah kasus blocked-upstream dipisah dari exception retryable?",hint:"Contoh DICOM belum ada tidak masuk antrean retry tanpa batas.",when:(m,a)=>a.capacity!=="ya" || m.aggregate.no_downstream_evidence>0},
  {id:"ticket_complete",label:"Apakah tiket masalah menyertakan waktu, PIC, log tersanitasi, serta bukti penutupan?",hint:"Eskalasi tidak dapat dianggap mempercepat perbaikan tanpa waktu respons/closure.",when:(m,a)=>a.escalation!=="ya"},
  {id:"recurrence",label:"Apakah masalah yang sudah diperbaiki diperiksa ulang pada periode berikutnya?",hint:"Verifikasi kekambuhan dan potensi dampak samping perbaikan.",when:(m,a)=>a.monitoring!=="ya" || m.trajectories.some(x=>["menurun","fluktuatif"].includes(x.label))},
  {id:"approval",label:"Apakah perubahan teknis/operasional memiliki pemilik keputusan, izin, dan jadwal?",hint:"Tanpa persetujuan pengelola, pilihan tindakan harus melalui REVIEW.",when:(m,a)=>true}
];
export function csvMatrix(input) {
  const raw=String(input).replace(/^\uFEFF/,"");
  const first=raw.split(/\r?\n/,1)[0]||"";
  const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?";":",";
  let field="",row=[],quoted=false;const output=[];
  for(let i=0;i<raw.length;i++){
    const ch=raw[i];
    if(ch==='"'){if(quoted&&raw[i+1]==='"'){field+='"';i++}else quoted=!quoted;}
    else if(ch===delimiter&&!quoted){row.push(field.trim());field="";}
    else if((ch==="\r"||ch==="\n")&&!quoted){
      if(ch==="\r"&&raw[i+1]==="\n")i++;
      row.push(field.trim());field="";
      if(row.some(v=>v))output.push(row);
      row=[];
    }else field+=ch;
  }
  if(quoted)throw Error("Tanda kutip CSV tidak tertutup.");
  row.push(field.trim());if(row.some(v=>v))output.push(row);
  return output;
}
export function parseAggregateCsv(content) {
  const matrix=csvMatrix(content);
  if(matrix.length<2)throw Error("CSV harus berisi header dan minimal satu baris.");
  if(matrix.length>301)throw Error("Maksimum 300 baris per unggahan.");
  const header=matrix[0].map(s=>s.toLowerCase().trim());
  if(new Set(header).size!==header.length)throw Error("Header CSV mengandung kolom duplikat.");
  const missing=FIELDS.filter(x=>!header.includes(x));
  if(missing.length)throw Error("Kolom belum tersedia: "+missing.join(", "));
  const extra=header.filter(x=>!FIELDS.includes(x));
  if(extra.length)throw Error("Hanya kolom agregat pada template yang diperbolehkan. Kolom tambahan: "+extra.join(", "));
  const seen=new Set();
  return matrix.slice(1).map((values,i)=>{
    const line=i+2;if(values.length!==header.length)throw Error("Baris "+line+": jumlah kolom tidak sama dengan header.");
    const row=Object.fromEntries(header.map((key,j)=>[key,values[j].trim()]));
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.periode))throw Error("Baris "+line+": periode harus YYYY-MM.");
    row.jenis_layanan=row.jenis_layanan.toLowerCase();
    if(!SERVICES.includes(row.jenis_layanan))throw Error("Baris "+line+": jenis_layanan tidak dikenali.");
    const key=row.periode+"|"+row.jenis_layanan;
    if(seen.has(key))throw Error("Baris "+line+": kombinasi periode/layanan duplikat.");
    seen.add(key);
    for(const col of NUMERIC){
      if(!/^\d+$/.test(row[col]))throw Error("Baris "+line+": "+col+" harus bilangan bulat non-negatif.");
      row[col]=Number(row[col]);
      if(!Number.isSafeInteger(row[col]))throw Error("Baris "+line+": "+col+" melebihi batas bilangan aman.");
    }
    if(row.total_order<=0)throw Error("Baris "+line+": total_order harus lebih besar dari nol.");
    if(row.total_order!==row.not_yet_eligible+row.excluded_order+row.unverified_linkage+row.eligible_mature)
      throw Error("Baris "+line+": total_order ≠ not_yet_eligible + excluded_order + unverified_linkage + eligible_mature.");
    if(row.eligible_mature!==row.complete_core+row.incomplete_with_downstream+row.completed_without_result+row.no_downstream_evidence)
      throw Error("Baris "+line+": status episode eligible tidak menjumlah ke eligible_mature.");
    if(row.complete_strict>row.complete_core)
      throw Error("Baris "+line+": complete_strict tidak boleh melebihi complete_core.");
    return row;
  });
}
const sum=(data,field)=>data.reduce((a,r)=>a+r[field],0);
export function counts(rows){
  return Object.fromEntries(NUMERIC.map(field=>[field,sum(rows,field)]));
}
export function metrics(c){
  const e=c.eligible_mature;
  return {...c,coreRate:e?c.complete_core/e:null,strictRate:e?c.complete_strict/e:null,
    noEvidenceRate:e?c.no_downstream_evidence/e:null,
    assessableWithDownstream:c.complete_core+c.incomplete_with_downstream+c.completed_without_result,
    dataValidated:c.unverified_linkage===0&&e>0};
}
export function trajectory(rows,service) {
  const monthly=rows.filter(r=>r.jenis_layanan===service).sort((a,b)=>a.periode.localeCompare(b.periode))
    .map(row=>({period:row.periode,eligible:row.eligible_mature,
      core:row.eligible_mature?row.complete_core/row.eligible_mature:null,
      strict:row.eligible_mature?row.complete_strict/row.eligible_mature:null}));
  const points=monthly.filter(x=>x.core!==null);let label="data belum cukup";
  let delta=null,spread=null;
  if(points.length>=3){
    delta=points.at(-1).core-points[0].core;
    spread=Math.max(...points.map(p=>p.core))-Math.min(...points.map(p=>p.core));
    // Exploratory shape thresholds (not standards or success targets).
    if(spread>=.10 && Math.abs(delta)<.05)label="fluktuatif";
    else if(delta>=.05)label="membaik";
    else if(delta<=-.05)label="menurun";
    else if(spread>=.10)label="fluktuatif";
    else label="relatif stabil";
  }
  return {service,monthly,label,delta,spread,thresholds_exploratory:{change:.05,spread:.10}};
}
export function summarize(rows) {
  if(!Array.isArray(rows)||!rows.length)throw Error("Data agregat belum tersedia.");
  const aggregate=metrics(counts(rows));
  const byService=Object.fromEntries(SERVICES.map(name=>[name,metrics(counts(rows.filter(r=>r.jenis_layanan===name)))]));
  const trajectories=SERVICES.map(service=>trajectory(rows,service))
    .filter(item=>item.monthly.length>0);
  const periods=[...new Set(rows.map(r=>r.periode))].sort();
  const gate=aggregate.eligible_mature===0?"HOLD":aggregate.unverified_linkage>0?"HOLD":"READY";
  const problems=[];
  if(aggregate.eligible_mature===0)problems.push("Belum tersedia episode eligible dan matang untuk dinilai.");
  if(aggregate.unverified_linkage>0)problems.push(aggregate.unverified_linkage+" order masih belum terverifikasi keterhubungan resource; denominator belum layak dijadikan dasar keputusan.");
  return {aggregate,byService,trajectories,periods,gate,problems};
}
export function activeDeepQuestions(summary,answers={}) {
  return DEEP_QUESTIONS.filter(q=>q.when({aggregate:summary.aggregate,radiologi:summary.byService.radiologi,
    trajectories:summary.trajectories},answers));
}
const labels={ya:"Ya",sebagian:"Sebagian",tidak:"Tidak",tidak_tahu:"Belum diketahui"};
export function answerLabel(value){return labels[value]||"Belum dijawab";}
export function decisionOptions(summary,answers={}) {
  const a={...answers};
  const relevant=new Set([...BASE_QUESTIONS,...activeDeepQuestions(summary,a)].map(q=>q.id));
  for(const k of Object.keys(a))if(!relevant.has(k))delete a[k];
  const options=[];
  const push=(o)=>options.push({...o,why:o.why||[],status:o.status||"INVESTIGATE",priority:o.priority||20,
    owner:o.owner||"PIC integrasi/layanan terkait",check:o.check||"Periksa bukti tambahan sebelum tindakan.",
    condition:o.condition||"Bergantung pada verifikasi akar masalah.",
    avoid:o.avoid||"Hindari perubahan tanpa bukti penyebab.",
    verify:o.verify||"Ukur outcome pada periode setelah perubahan.",
    loops:o.loops||[]});
  const e=summary.aggregate;
  if(summary.gate==="HOLD"){
    push({title:"Validasi denominator dan relasi episode",status:"HOLD",priority:100,scope:"Seluruh data",loops:[],
      why:summary.problems,action:"Audit pematangan episode, identifier, keterhubungan resource, dan cakupan ekstraksi agregat.",
      check:"Perbaiki pencatatan linkage dan unggah agregat tervalidasi.",owner:"Tim data dan PIC integrasi",
      condition:"Episode eligible dan matang telah terdefinisi dengan benar.",
      avoid:"Jangan klasifikasikan episode belum matang sebagai tidak lengkap.",
      verify:"Pastikan total order dan kategori status saling konsisten."});
    return options;
  }
  const rad=summary.byService.radiologi;
  const lab=summary.byService.laboratorium;
  const radMissing=rad.no_downstream_evidence+rad.completed_without_result;
  if(rad.eligible_mature>0&&radMissing>0){
    const why=["Data radiologi: "+radMissing+" episode tanpa bukti downstream atau selesai tanpa hasil."];
    if(a.dicom_received==="tidak"){
      push({title:"Perbaiki penerimaan DICOM dari sumber",status:"RECOMMEND",priority:95,scope:"Radiologi",loops:["R1","R2","R5"],
        why:[...why,"Assessment: log pemeriksaan menyatakan DICOM tidak diterima PACS/VM."],
        action:"Checklist pengiriman operator alat, alert missing DICOM, audit accession dan jalur kirim; evaluasi otomasi bila layak.",
        check:"Cocokkan log alat, accession, dan penerimaan PACS/VM.",owner:"PIC radiologi, operator alat, RIS/PACS dan vendor",
        condition:"Terbukti ada sumber citra yang tidak sampai ke penyimpanan.",
        avoid:"Jangan mengutamakan retry API atau perbaikan mapping ketika file sumber belum tersedia.",
        verify:"Bukti DICOM diterima dan ImagingStudy/DiagnosticReport terhubung ke order pada periode berikutnya."});
    }else if(a.dicom_received==="ya" && a.retryable==="ya"){
      push({title:"Tangani exception middleware yang dapat di-retry",status:"RECOMMEND",priority:90,scope:"Radiologi",loops:["R2","B3"],
        why:[...why,"Assessment: DICOM diterima dan log queue membuktikan error retryable."],
        action:"Perbaiki queue dan retry terkontrol dengan idempotency; rekonsiliasi ke resource hasil.",
        check:"Review response code, DLQ dan status file sumber.",owner:"PIC integrasi, middleware dan vendor RIS/PACS",
        condition:"Source tersedia dan error retryable terkonfirmasi.",
        avoid:"Jangan retry tanpa batas pada DICOM yang tidak pernah diterima.",
        verify:"Rasio episode lengkap dan backlog retryable yang terselesaikan."});
    }else{
      push({title:"Telusuri letak putusnya alur radiologi",status:"INVESTIGATE",priority:92,scope:"Radiologi",loops:["R2","B2","B3"],
        why:[...why,"Bukti penerimaan DICOM dan/atau jenis error middleware belum cukup untuk membedakan mekanisme."],
        action:"Periksa alur alat → PACS/VM → RIS/middleware → FHIR, log dan accession tanpa identitas pasien.",
        check:"Pastikan DICOM diterima; jika diterima, periksa queue dan referensi resource.",owner:"PIC radiologi, RIS/PACS dan integrasi",
        condition:"Keterhubungan sumber dan bukti downstream belum bisa dijelaskan.",
        avoid:"Jangan menyimpulkan pemeriksaan klinis tidak dilakukan atau langsung menyarankan retry.",
        verify:"Klasifikasi hambatan berdasarkan bukti sumber, log queue, dan status resource."});
    }
  }
  if(lab.eligible_mature>0&&(lab.no_downstream_evidence+lab.completed_without_result>0)){
    push({title:"Telusuri hasil laboratorium yang belum terhubung",status:a.retryable==="ya"?"RECOMMEND":"INVESTIGATE",priority:81,scope:"Laboratorium",loops:["R1","R2","B3"],
      why:["Data laboratorium: "+(lab.no_downstream_evidence+lab.completed_without_result)+" episode tanpa bukti downstream atau selesai tanpa hasil.",
        a.retryable==="ya"?"Log middleware dilaporkan mendukung retry terkendali.":"Belum terkonfirmasi apakah hasil sumber atau middleware yang bermasalah."],
      action:a.retryable==="ya"?"Rekonsiliasi order, hasil LIS dan antrean; lakukan retry hanya pada error yang telah diklasifikasikan aman.":"Telusuri order → LIS → Observation/DiagnosticReport, status hasil dan jejak pengiriman.",
      check:"Uji relasi ServiceRequest dengan Observation dan DiagnosticReport serta timestamp.",
      condition:"Permasalahan muncul pada relasi order-hasil atau pengiriman lanjutan.",
      avoid:"Jangan menganggap setiap ServiceRequest tanpa hasil berarti pemeriksaan tidak dilakukan.",
      owner:"PIC laboratorium/LIS dan tim integrasi",
      verify:"Episode eligible dengan hasil lab lengkap dan tertaut setelah penanganan."});
  }
  if(e.incomplete_with_downstream>0){
    if(a.semantic_error==="ya"){
      push({title:"Perbaiki error terminologi dan versi mapping",status:"RECOMMEND",priority:86,scope:"Lab/radiologi sesuai log",loops:["R3"],
        why:["Data: "+e.incomplete_with_downstream+" episode memiliki bukti downstream tetapi belum lengkap.","Log/kode error semantik dikonfirmasi melalui assessment."],
        action:"Audit mapping kode dan versi, uji regresi pada resource terkait, lalu verifikasi hasil setelah perubahan.",
        check:"Cocokkan error semantik dengan versi mapping dan konfigurasi sumber.",
        condition:"Kesalahan terminologi atau mapping terbukti sebagai penyebab.",
        avoid:"Tidak memperbaiki DICOM sumber yang tidak tersedia; jangan mengubah mapping tanpa bukti error.",
        owner:"PIC terminologi, LIS/RIS, vendor SIMRS",
        verify:"Jumlah error mapping, episode lengkap, dan regresi pascaperubahan."});
    }else if(a.semantic_error!=="tidak"){
      push({title:"Periksa kemungkinan error semantik",status:"INVESTIGATE",priority:69,scope:"Lab/radiologi",loops:["R3"],
        why:["Terdapat "+e.incomplete_with_downstream+" episode dengan bukti lanjutan tetapi belum lengkap.","Belum ada bukti error terminologi yang tegas."],
        action:"Kelompokkan kekurangan resource dan log error. Pisahkan masalah kode dari keterlambatan hasil atau sumber.",
        check:"Minta contoh kode error tersanitasi dan versi mapping.",owner:"PIC integrasi dan terminologi",
        condition:"Kelengkapan belum bisa dijelaskan oleh jenis resource yang hilang.",
        avoid:"Jangan merekomendasikan perubahan mapping sebelum ada error semantik.",
        verify:"Daftar penyebab terklasifikasi dan bukti perubahan indikator."});
    }
  }
  if(a.changes==="ya"){
    if(a.change_log==="tidak"){
      push({title:"Perbaiki change log dan verifikasi konfigurasi",status:"RECOMMEND",priority:83,scope:"Sistem yang berubah",loops:["B2"],
        why:["Ada perubahan sistem dan proses change log lintas tim belum tersedia menurut assessment."],
        action:"Terapkan notifikasi perubahan, uji routing vendor, dan verifikasi resource diagnostik end-to-end.",
        check:"Periksa waktu perubahan, konfigurasi lama/baru dan alur data yang terdampak.",owner:"PIC LIS/RIS/PACS, vendor dan integrasi",
        condition:"Perubahan konfigurasi memengaruhi alur data.",
        avoid:"Jangan menganggap semua missing DICOM berasal dari migrasi sistem.",
        verify:"Uji pascarilis, kelengkapan resource dan insiden berulang."});
    }else if(a.change_log==="tidak_tahu"||!a.change_log){
      push({title:"Audit dampak perubahan sistem",status:"INVESTIGATE",priority:65,scope:"Sistem terkait",loops:["B2"],
        why:["Ada perubahan sistem tetapi pengaruhnya terhadap integrasi belum ditelusuri."],
        action:"Kumpulkan change log dan cocokkan tanggal gangguan dengan konfigurasi dan bukti FHIR.",
        owner:"PIC sistem/vendor",verify:"Koreksi routing dibuktikan dengan resource hasil yang dapat ditelusuri."});
    }
  }
  if(a.capacity==="tidak"||a.capacity==="sebagian"||a.backlog_isolation==="tidak"){
    push({title:"Pisahkan backlog blocked-upstream dan retryable",status:a.backlog_isolation==="tidak"?"RECOMMEND":"INVESTIGATE",priority:72,scope:"Proses koreksi",loops:["R2","R5"],
      why:["Kapasitas penanganan atau isolasi exception dilaporkan belum memadai."],
      action:"Triase backlog berdasarkan sumber, tipe error, kewenangan PIC, dan lama kasus; tidak semua masalah bisa diselesaikan IT.",
      check:"Hitung backlog blocked-upstream vs retryable dan umur tiket.",owner:"Koordinator operasional, PIC unit dan integrasi",
      condition:"Antrian koreksi menghambat penanganan.",
      avoid:"Jangan meningkatkan retry untuk sumber yang memang belum tersedia.",
      verify:"Backlog tiap kategori, waktu koreksi dan kejadian berulang."});
  }
  if(a.escalation==="tidak"||a.ticket_complete==="tidak"){
    push({title:"Lengkapi format tiket dan routing eskalasi",status:"RECOMMEND",priority:70,scope:"Tata kelola insiden",loops:["B3"],
      why:["Pelaporan insiden/PIC atau bukti penutupan masih kurang menurut assessment."],
      action:"Wajibkan waktu kejadian, PIC, kategori, log tersanitasi, pemilik sebab dan bukti uji ulang.",
      check:"Audit beberapa tiket berdasarkan kelengkapan informasi dan jalur eskalasi.",owner:"PIC operasional dan tim vendor/integrasi",
      condition:"Eskalasi sering terhambat informasi insiden yang kurang.",
      avoid:"Jangan mengklaim percepatan eskalasi tanpa data waktu respons dan closure.",
      verify:"Kelengkapan tiket serta waktu resolusi yang terukur."});
  }
  if(a.monitoring==="tidak"||a.monitoring==="sebagian"){
    push({title:"Bangun monitoring kelengkapan tingkat episode",status:"RECOMMEND",priority:62,scope:"Pengukuran dan pembelajaran",loops:["R1","B1"],
      why:["Pemantauan episode belum rutin atau baru sebagian."],
      action:"Pantau complete core/strict, no-downstream, backlog dan tren bulanan per jenis layanan.",
      check:"Tentukan definisi denominator dan sumber data yang sama di semua periode.",owner:"PIC data mutu, LIS/RIS dan integrasi",
      condition:"Definisi indikator dapat diverifikasi.",
      avoid:"HTTP 200 tidak boleh dianggap bukti kelengkapan.",
      verify:"Deteksi masalah, tindakan korektif, dan kejadian berulang."});
  }
  if(a.leadership==="tidak"){
    push({title:"Tinjau alokasi perbaikan dan pemilik keputusan",status:"REVIEW",priority:49,scope:"Tata kelola",loops:["R4","B1"],
      why:["Pengelola belum secara rutin meninjau tindak lanjut mutu pengiriman."],
      action:"Presentasikan bukti gap per layanan dan opsi yang dapat dikerjakan sesuai kapasitas serta perizinan.",
      owner:"Pengelola layanan dan PIC implementasi",avoid:"Jangan menyimpulkan perhatian pimpinan otomatis menghasilkan sumber daya.",
      verify:"Keputusan tindak lanjut dan perubahan alokasi yang dapat ditelusuri."});
  }
  if(!options.length){
    push({title:"Pertahankan pemantauan dan audit bukti",status:"VERIFY",priority:30,scope:"Semua layanan",loops:["R1","R4"],
      why:["Belum terdapat mekanisme spesifik yang cukup jelas untuk menjadi kandidat tindakan."],
      action:"Tinjau data periode berikutnya dan audit contoh relasi resource serta pengecualian.",
      owner:"Tim data mutu dan integrasi",verify:"Tren episode, akurasi linkage, dan masalah berulang."});
  }
  if(a.approval!=="ya"){
    for(const opt of options)if(opt.status==="RECOMMEND"){
      opt.status="REVIEW";
      opt.why.push("Implementasi memerlukan keputusan manusia mengenai PIC, izin, dan jadwal.");
    }
  }
  return options.sort((x,y)=>y.priority-x.priority);
}