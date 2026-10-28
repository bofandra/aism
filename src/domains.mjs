// AISM Lab v0.2 — SYNTHETIC domain model library.
// No patient-level or production SATUSEHAT data is loaded.
const v=(id,label,unit,value,kind,definition,extra={})=>({id,label,unit,value,kind,definition,source:"synthetic",reference:"Assumsi demonstrasi v0.2; belum dikalibrasi",min:0,...extra});
const f=(id,label,expr,unit,why,kind="structural")=>({id,label,expr,unit,why,kind,source:"structural hypothesis",reference:"Persamaan ilustratif; perlu validasi struktur dan perilaku"});
const e=(from,to,sign,why,lag=0)=>({id:"edge-"+from+"-"+to,from,to,sign,lag,why,source:"hypothesis",reference:"Perlu triangulasi data, wawancara, dan kajian literatur"});
const a=(id,label,desc,changes,cost,risk,delay=0)=>({id,label,desc,changes,cost,risk,delay,source:"synthetic",reference:"Asumsi respons intervensi; bukan estimasi kausal"});
const COMMON={schemaVersion:"0.2.0",validationStatus:"not_tested",causalStatus:"hypothesis",decisionReadiness:"demo_only",timeUnit:"week",horizon:12,dt:1};
export const domains={
  satusehat:{
    ...COMMON,id:"satusehat",label:"SATUSEHAT · diagnostik",sector:"Kesehatan",
    question:"Bagaimana meningkatkan kelengkapan episode diagnostik yang eligible dan sudah matang?",
    caution:"Model cohort akumulatif; bukan rolling window. Tiket exception bukan episode dan tidak dapat dikonversi 1:1.",
    outcome:{id:"R",label:"Kelengkapan episode",unit:"ratio",numerator:"E-U",denominator:"E",definition:"Episode lengkap dibagi episode eligible matang pada cohort kumulatif."},
    variables:[
      v("E","Episode eligible matang","episode",500,"stock","Jumlah episode dalam cohort eligible matang yang diamati.",{min:1,max:100000}),
      v("U","Episode belum lengkap","episode",150,"stock","Anggota cohort E yang belum memenuhi aturan bukti inti per modul.",{max:100000}),
      v("Q","Tiket exception terbuka","ticket",90,"stock","Jumlah tiket terbuka. Tidak otomatis sama dengan U.",{max:100000}),
      v("N","Episode eligible matang baru","episode/week",50,"flow","Masuknya anggota baru ke cohort matang per minggu.",{max:10000}),
      v("p","Fraksi episode baru belum lengkap","ratio",0.30,"parameter","Proporsi ketidaklengkapan pada episode baru yang sudah matang.",{max:1}),
      v("K","Kapasitas koreksi episode","episode/week",20,"flow","Episode yang dapat diverifikasi selesai per minggu.",{max:10000}),
      v("Qin","Tiket exception baru","ticket/week",25,"flow","Tiket masuk per minggu.",{max:10000}),
      v("Qout","Kapasitas penutupan tiket","ticket/week",20,"flow","Tiket yang dapat ditutup per minggu; berbeda dari koreksi episode.",{max:10000}),
      v("mapping_err","Kesalahan mapping terminologi","ratio",0.15,"indicator","Proporsi transaksi yang diaudit dengan mapping bermasalah.",{max:1,reference:"Contoh 15% bukan proporsi episode dan tidak otomatis menentukan p."}),
      v("pic_coverage","Cakupan PIC jelas","ratio",0.65,"indicator","Proporsi tiket eligible dengan PIC yang memiliki kewenangan tindak lanjut.",{max:1}),
      v("visibility","Observabilitas proses","ratio",0.60,"indicator","Skor checklist observabilitas; belum ukuran empiris baku.",{max:1}),
      v("correction_days","Median waktu koreksi","day",7,"indicator","Hari dari deteksi exception sampai penyelesaian terverifikasi.",{max:365})
    ],
    edges:[
      e("N","U","+","Episode baru yang tidak lengkap menambah stok U."),
      e("p","U","+","Fraksi episode baru yang tidak lengkap menentukan incidence."),
      e("K","U","-","Koreksi efektif mengurangi stok U."),
      e("U","R","-","Lebih banyak episode belum lengkap menurunkan kelengkapan jika E tetap."),
      e("mapping_err","p","+","Hipotesis: kesalahan mapping dapat menaikkan p; besaran efek belum diestimasi."),
      e("pic_coverage","correction_days","-","Hipotesis: PIC yang jelas mempercepat tindak lanjut."),
      e("visibility","Q","+","Deteksi lebih baik sementara dapat menambah tiket baru yang tercatat."),
      e("Qin","Q","+","Tiket baru menambah antrean."),
      e("Qout","Q","-","Tiket yang selesai ditutup mengurangi antrean.")
    ],
    formulas:[
      f("incidence","Episode baru tidak lengkap","N*p*dt","episode","Episode baru matang × fraksi belum lengkap × interval waktu."),
      f("K_eff","Episode terkoreksi efektif","min(K*dt,U+incidence)","episode","Koreksi tidak boleh melebihi stok yang tersedia."),
      f("E_next","Eligible sesudah satu langkah","E+N*dt","episode","Akumulasi anggota cohort; tidak ada outflow dalam model demo."),
      f("U_next","Belum lengkap sesudah satu langkah","U+incidence-K_eff","episode","Konservasi episode belum lengkap."),
      f("C_next","Episode lengkap sesudah langkah","E_next-U_next","episode","Identitas kelengkapan: eligible minus belum lengkap.","definition"),
      f("R_next","Rasio kelengkapan","C_next/E_next","ratio","Rasio, denominator harus lebih besar dari nol.","definition"),
      f("Q_closed","Tiket efektif ditutup","min(Qout*dt,Q+Qin*dt)","ticket","Kapasitas penutupan dibatasi tiket tersedia."),
      f("Q_next","Tiket terbuka sesudah langkah","Q+Qin*dt-Q_closed","ticket","Aliran tiket terpisah dari aliran episode.")
    ],
    updates:{E:"E_next",U:"U_next",Q:"Q_next"},output:"R_next",
    interventions:[
      a("mapping","Audit dan koreksi mapping","Asumsikan perbaikan mapping menurunkan p dari 0,30 ke 0,20.",{p:0.20},2,2,0),
      a("capacity","Tambahkan kapasitas koreksi","Asumsikan kapasitas koreksi K meningkat dari 20 ke 25 episode/minggu.",{K:25},3,1,0),
      a("combined","Mapping + kapasitas","Asumsikan dua perubahan terjadi bersamaan.",{p:0.20,K:25},4,3,0)
    ]
  },
  education:{
    ...COMMON,id:"education",label:"Pendidikan · retensi",sector:"Pendidikan",
    question:"Bagaimana mengurangi mahasiswa yang tidak bertahan dalam satu cohort?",
    caution:"Cohort tetap; tidak ada intake, transfer, atau kelulusan baru selama horizon demo.",
    outcome:{id:"retention",label:"Tingkat retensi cohort",unit:"ratio",numerator:"S-L",denominator:"S",definition:"Mahasiswa dalam cohort awal yang belum keluar / jumlah cohort awal."},
    variables:[
      v("S","Mahasiswa cohort awal","student",1000,"stock","Ukuran cohort tetap pada awal pengamatan.",{min:1,max:100000}),
      v("L","Mahasiswa tidak bertahan kumulatif","student",120,"stock","Jumlah mahasiswa dalam cohort awal yang telah keluar.",{max:100000}),
      v("d","Laju putus studi","student/week",8,"flow","Mahasiswa keluar per minggu (asumsi agregat).",{max:1000}),
      v("mentoring_coverage","Cakupan pendampingan","ratio",0.35,"indicator","Proporsi mahasiswa berisiko yang memperoleh pendampingan.",{max:1}),
      v("financial_risk","Risiko kesulitan biaya","ratio",0.28,"indicator","Proporsi pada asesmen risiko keuangan; bukan data pribadi.",{max:1})
    ],
    edges:[
      e("d","L","+","Laju putus studi menambah kumulatif yang keluar."),
      e("L","retention","-","Mahasiswa keluar menurunkan retensi."),
      e("mentoring_coverage","d","-","Hipotesis: pendampingan menekan laju putus studi."),
      e("financial_risk","d","+","Hipotesis: hambatan biaya berkaitan dengan risiko putus studi.")
    ],
    formulas:[
      f("dropouts","Putus studi pada periode","min(d*dt,S-L)","student","Tidak dapat keluar melebihi mahasiswa yang masih berada dalam cohort."),
      f("L_next","Kumulatif keluar","L+dropouts","student","Akumulasi mahasiswa yang tidak bertahan."),
      f("active_next","Mahasiswa bertahan","S-L_next","student","Sisa cohort awal.","definition"),
      f("retention_next","Tingkat retensi","active_next/S","ratio","Rasio terhadap cohort awal.","definition")
    ],
    updates:{L:"L_next"},output:"retention_next",
    interventions:[
      a("mentoring","Program pendampingan","Laju putus studi diasumsikan turun dari 8 menjadi 5 mahasiswa/minggu.",{d:5},2,1,2),
      a("aid","Dukungan finansial","Laju putus studi diasumsikan turun dari 8 menjadi 6 mahasiswa/minggu.",{d:6},4,2,1),
      a("combo","Pendampingan + bantuan","Laju putus studi diasumsikan turun menjadi 3 mahasiswa/minggu.",{d:3},5,2,2)
    ]
  },
  logistics:{
    ...COMMON,id:"logistics",label:"Logistik · tepat waktu",sector:"Operasional",
    question:"Bagaimana mengurangi antrean dan meningkatkan proporsi pengiriman tepat waktu?",
    caution:"Fraksi tepat waktu pOnTime adalah parameter skenario, bukan diturunkan otomatis dari panjang antrean.",
    outcome:{id:"onTimeRate",label:"Pengiriman tepat waktu",unit:"ratio",numerator:"T",denominator:"D",definition:"Pengiriman tepat waktu / seluruh pengiriman terselesaikan sampai periode itu."},
    variables:[
      v("Q","Antrean pengiriman","shipment",160,"stock","Kiriman yang belum selesai diproses.",{max:100000}),
      v("D","Pengiriman terselesaikan kumulatif","shipment",600,"stock","Total yang telah dikirim pada awal observasi.",{min:1,max:100000}),
      v("T","Pengiriman tepat waktu kumulatif","shipment",420,"stock","Pengiriman terselesaikan yang memenuhi SLA.",{max:100000}),
      v("A","Kiriman masuk","shipment/week",100,"flow","Permintaan pengiriman baru per minggu.",{max:10000}),
      v("S","Kapasitas penyelesaian","shipment/week",95,"flow","Batas kiriman yang dapat diselesaikan tiap minggu.",{max:10000}),
      v("pOnTime","Fraksi kiriman selesai tepat waktu","ratio",0.75,"parameter","Proporsi kiriman selesai pada minggu berjalan yang memenuhi SLA.",{max:1}),
      v("fleet","Kesiapan armada","ratio",0.70,"indicator","Proporsi armada siap dari total armada yang memenuhi kriteria.",{max:1})
    ],
    edges:[
      e("A","Q","+","Kiriman baru menambah antrean."),
      e("S","Q","-","Kiriman yang selesai mengurangi antrean."),
      e("S","D","+","Penyelesaian menambah jumlah kumulatif terkirim."),
      e("pOnTime","T","+","Ketepatan waktu kiriman baru menambah total tepat waktu."),
      e("fleet","S","+","Hipotesis kesiapan armada meningkatkan kapasitas.")
    ],
    formulas:[
      f("fulfilled","Kiriman terselesaikan periode","min(S*dt,Q+A*dt)","shipment","Pemrosesan dibatasi kapasitas dan kiriman tersedia."),
      f("Q_next","Antrean sesudah periode","Q+A*dt-fulfilled","shipment","Konservasi stok antrean."),
      f("D_next","Pengiriman kumulatif","D+fulfilled","shipment","Total terkirim."),
      f("T_next","Tepat waktu kumulatif","T+fulfilled*pOnTime","shipment","Pengiriman tepat waktu dengan fraksi asumsi."),
      f("onTime_next","Rasio tepat waktu","T_next/D_next","ratio","Rasio total tepat waktu terhadap total selesai.","definition")
    ],
    updates:{Q:"Q_next",D:"D_next",T:"T_next"},output:"onTime_next",
    interventions:[
      a("capacity","Tambahkan kapasitas sortir","Kapasitas S diasumsikan meningkat dari 95 ke 120 kiriman/minggu.",{S:120},4,2,1),
      a("routing","Optimalkan penjadwalan rute","Fraksi tepat waktu diasumsikan naik dari 0,75 ke 0,88.",{pOnTime:0.88},2,1,1),
      a("combo","Sortir + optimasi rute","Gabungkan perubahan kapasitas dan ketepatan waktu.",{S:120,pOnTime:0.88},5,3,1)
    ]
  }
};
export function getDomain(id){return JSON.parse(JSON.stringify(domains[id]||domains.satusehat));}
export const domainIds=Object.keys(domains);
