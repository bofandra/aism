// Curated exploratory reading list, 30 Oct 2026.
// Coding is provisional and derived from publicly available abstracts / publisher descriptions.
// 0 = not assessed as a primary focus in the consulted source, NOT "does not exist".
export const dimensions=[
 {id:"diag",label:"Diagnosis konteks",short:"Diagnosis",question:"Apakah faktor penghambat dan outcome diidentifikasi secara eksplisit?"},
 {id:"mech",label:"Mekanisme perubahan",short:"Mekanisme",question:"Apakah logika mekanisme / determinan perubahan dijelaskan?"},
 {id:"select",label:"Pemilihan strategi",short:"Seleksi",question:"Apakah ada prosedur memilih atau merancang strategi intervensi?"},
 {id:"sim",label:"Simulasi dinamis",short:"Simulasi",question:"Apakah perilaku sistem dan konsekuensi kebijakan disimulasikan?"},
 {id:"adapt",label:"Evaluasi dan adaptasi",short:"Adaptasi",question:"Apakah umpan balik digunakan untuk evaluasi / penyesuaian?"},
 {id:"trace",label:"Jejak bukti dan evaluasi",short:"Bukti",question:"Apakah keputusan/desain dan evaluasinya ditelusuri ke bukti atau protokol?"}
];
export const families=[
 {id:"dsr",label:"Design Science"},
 {id:"systems",label:"Systems Thinking"},
 {id:"implementation",label:"Implementation Science"},
 {id:"adaptive",label:"Adaptive Intervention"},
 {id:"decision",label:"Decision Analysis"}
];
const P=(id,author,year,title,family,venue,doi,summary,overlap,caveat,coverage)=>({
 id,author,year,title,family,venue,doi,link:"https://doi.org/"+doi,
 summary,overlap,caveat,coverage,origin:"curated"
});
export const curatedStudies=[
 P("hevner2004","Hevner et al.",2004,"Design Science in Information Systems Research","dsr","MIS Quarterly","10.2307/25148625",
   "Landasan pengembangan dan evaluasi artefak penelitian sistem informasi.",
   "AISM dapat memakai DSR sebagai pendekatan untuk merancang dan mengevaluasi artefak.",
   "DSR adalah metodologi riset, bukan secara spesifik mesin pemilihan intervensi.",
   {diag:1,mech:0,select:0,sim:0,adapt:1,trace:2}),
 P("peffers2007","Peffers et al.",2007,"A Design Science Research Methodology for Information Systems Research","dsr","Journal of Management Information Systems","10.2753/MIS0742-1222240302",
   "Proses DSRM meliputi identifikasi masalah, tujuan, desain, demonstrasi, evaluasi, dan komunikasi.",
   "Mengatur bagaimana AISM dikembangkan, didemonstrasikan, dan diuji secara akademik.",
   "DSRM tidak sendirinya menyediakan model kausal atau koefisien respons intervensi.",
   {diag:1,mech:0,select:0,sim:0,adapt:2,trace:2}),
 P("homer2006","Homer & Hirsch",2006,"System Dynamics Modeling for Public Health: Background and Opportunities","systems","American Journal of Public Health","10.2105/AJPH.2005.062059",
   "Menunjukkan kegunaan model stock-flow, umpan balik, dan simulasi untuk kompleksitas kesehatan publik.",
   "AISM perlu mengakui simulasi kebijakan dinamis sudah mapan dalam Systems Dynamics.",
   "Yang akan diuji adalah penghubungan model dinamis dengan tata kelola pemilihan intervensi yang eksplisit, bukan penemuan simulasi.",
   {diag:2,mech:2,select:1,sim:2,adapt:1,trace:1}),
 P("michie2011","Michie, van Stralen & West",2011,"The Behaviour Change Wheel: A New Method for Characterising and Designing Behaviour Change Interventions","implementation","Implementation Science","10.1186/1748-5908-6-42",
   "COM-B menghubungkan diagnosis perilaku dengan fungsi intervensi dan kategori kebijakan.",
   "Sudah ada pemetaan determinan masalah ke pilihan intervensi berbasis teori.",
   "AISM tidak boleh mengklaim diagnosis-ke-intervensi sebagai penemuan pertama.",
   {diag:2,mech:2,select:2,sim:0,adapt:1,trace:1}),
 P("nahum2012","Nahum-Shani et al.",2012,"Experimental Design and Primary Data Analysis Methods for Comparing Adaptive Interventions","adaptive","Psychological Methods","10.1037/a0029372",
   "SMART dan metode analisis untuk membandingkan aturan atau urutan intervensi adaptif.",
   "Adaptasi berbasis respons dan pembandingan strategi intervensi telah diteliti secara ketat.",
   "Kebaruan AISM harus dibedakan dari adaptive treatment regimes dan desain SMART.",
   {diag:1,mech:1,select:2,sim:0,adapt:2,trace:2}),
 P("powell2015","Powell et al.",2015,"A Refined Compilation of Implementation Strategies: Results from the ERIC Project","implementation","Implementation Science","10.1186/s13012-015-0209-1",
   "Menghasilkan taksonomi terstandardisasi strategi implementasi (ERIC).",
   "AISM dapat memakai ERIC sebagai katalog tindakan; inventaris strategi bukan kebaruan baru.",
   "Taksonomi strategi tidak identik dengan aturan pemilihan dinamis yang dikalibrasi dari data lokal.",
   {diag:0,mech:0,select:2,sim:0,adapt:0,trace:2}),
 P("marsh2016","Marsh et al.",2016,"Multiple Criteria Decision Analysis for Health Care Decision Making—Emerging Good Practices: Report 2","decision","Value in Health","10.1016/j.jval.2015.12.016",
   "Pedoman MCDA untuk trade-off multikriteria, preferensi, dan kendala anggaran pada keputusan kesehatan.",
   "Keputusan dengan manfaat, risiko dan biaya yang transparan sudah merupakan area penelitian matang.",
   "AISM harus menguji apa yang ditambahkan oleh model mekanisme dan pembelajaran adaptif dibanding MCDA biasa.",
   {diag:1,mech:0,select:2,sim:1,adapt:0,trace:2}),
 P("nahum2018","Nahum-Shani et al.",2018,"Just-in-Time Adaptive Interventions (JITAIs) in Mobile Health: Key Components and Design Principles","adaptive","Annals of Behavioral Medicine","10.1007/s12160-016-9830-8",
   "Komponen dan prinsip rancangan intervensi yang beradaptasi terhadap konteks dan waktu.",
   "JITAI adalah pembanding paling relevan untuk setiap klaim adaptasi berbasis feedback.",
   "AISM harus menegaskan unit analisisnya organisasi/fasyankes, bukan otomatis setara dengan intervensi individu real-time.",
   {diag:2,mech:1,select:2,sim:0,adapt:2,trace:1}),
 P("fernandez2019","Fernandez et al.",2019,"Implementation Mapping: Using Intervention Mapping to Develop Implementation Strategies","implementation","Frontiers in Public Health","10.3389/fpubh.2019.00158",
   "Prosedur iteratif mengidentifikasi kebutuhan, determinan, tujuan, metode perubahan, strategi dan evaluasi implementasi.",
   "Pembanding terdekat: sudah mengintegrasikan diagnosis, mekanisme, seleksi strategi, dan evaluasi.",
   "AISM harus menunjukkan manfaat tambahan yang terukur dari simulasi dinamis dan keputusan yang dapat diaudit dibanding proses ini.",
   {diag:2,mech:2,select:2,sim:0,adapt:2,trace:2}),
 P("waltz2019","Waltz et al.",2019,"Choosing Implementation Strategies to Address Contextual Barriers: Diversity in Recommendations and Future Directions","implementation","Implementation Science","10.1186/s13012-019-0892-4",
   "Memetakan hambatan kontekstual CFIR terhadap pilihan strategi ERIC berdasarkan rekomendasi ahli.",
   "Membantah klaim bahwa pemetaan hambatan-ke-strategi belum pernah diteliti.",
   "Perbedaan potensial AISM perlu diuji pada perubahan perilaku sistem dan pembelajaran setelah implementasi.",
   {diag:2,mech:1,select:2,sim:0,adapt:0,trace:2}),
 P("damschroder2022","Damschroder et al.",2022,"The Updated Consolidated Framework for Implementation Research Based on User Feedback","implementation","Implementation Science","10.1186/s13012-022-01245-0",
   "CFIR yang diperbarui menyediakan konstruk determinan konteks penerapan intervensi.",
   "AISM bisa memakai CFIR untuk menyusun kamus determinan dan bukti konteks fasyankes.",
   "CFIR bukan bukti bahwa simulasi dan rekomendasi otomatis sudah tervalidasi.",
   {diag:2,mech:1,select:1,sim:0,adapt:1,trace:2}),
 P("leeman2024","Leeman et al.",2024,"A Streamlined Approach to Classifying and Tailoring Implementation Strategies","implementation","Implementation Science Communications","10.1186/s43058-024-00606-8",
   "Mengklasifikasi strategi ERIC dan memberikan pendekatan pragmatis untuk memilih dan menyesuaikan strategi.",
   "Menjadi pembanding terbaru bagi klaim pemilihan dan penyesuaian strategi yang efisien.",
   "Belum boleh disimpulkan tidak memiliki simulasi hanya karena ringkasan publikasi tidak membahasnya.",
   {diag:2,mech:1,select:2,sim:0,adapt:1,trace:1}),
 P("fontaine2025","Fontaine et al.",2025,"Advancing the Selection of Implementation Science Theories, Models, and Frameworks: The SELECT-IT Meta-Framework","implementation","Implementation Science","10.1186/s13012-025-01436-5",
   "Scoping review dan meta-framework pemilihan teori, model, dan kerangka implementasi sesuai tujuan dan konteks.",
   "Memperkuat kebutuhan kriteria pemilihan yang transparan, bukti dan kecocokan konteks.",
   "SELECT-IT memilih kerangka konseptual, bukan memilih satu tindakan operasional; jangan menyamakan kedua tugas.",
   {diag:2,mech:1,select:2,sim:0,adapt:1,trace:2}),
 P("rabin2025","Rabin, Cain & Glasgow",2025,"Adapting Public Health and Health Services Interventions in Diverse, Real-World Settings","adaptive","Annual Review of Public Health","10.1146/annurev-publhealth-071321-041652",
   "Review mengenai dokumentasi perubahan intervensi dan panduan iterasi adaptasi di konteks nyata.",
   "Memastikan AISM tidak mengklaim dokumentasi adaptasi sebagai konsep pertama.",
   "AISM perlu diuji apakah pembaruan parameternya lebih bermanfaat daripada praktik adaptasi yang telah ada.",
   {diag:1,mech:1,select:1,sim:0,adapt:2,trace:2})
];
export const noveltyClaims=[
 {id:"integration",label:"Rantai diagnosis → simulasi → keputusan → evaluasi",subtitle:"Integrasi alur dapat dijelaskan dalam satu artefak",near:["fernandez2019","homer2006","waltz2019","marsh2016"],hypothesis:"AISM mungkin menawarkan manfaat integrasi alur diagnosis determinan, model dinamika, decision gate yang eksplisit, dan pengukuran pasca-implementasi dalam satu artefak yang dapat diaudit.",risk:"Implementation Mapping telah menghubungkan diagnosis, mekanisme, strategi dan evaluasi. Integrasi saja belum membuktikan novelty.",test:"Bandingkan kelengkapan traceability, konsistensi pilihan intervensi, dan kegunaan keputusan melawan Implementation Mapping + MCDA pada kasus yang sama."},
 {id:"adaptation",label:"Pemilihan ulang setelah feedback empiris",subtitle:"Perubahan keputusan berdasarkan hasil, bukan hanya perbandingan skenario",near:["nahum2012","nahum2018","rabin2025"],hypothesis:"AISM dapat dikaji sebagai siklus evaluasi outcome agregat, pembaruan ketidakpastian parameter, dan pemilihan ulang strategi tingkat fasyankes.",risk:"SMART, JITAI, dan literatur adaptation sudah memiliki teori serta desain evaluasi adaptif yang kuat. Fitting satu titik bukan bukti kausal.",test:"Uji prospektif multi-periode dengan pembanding kebijakan statis; evaluasi regret, stabilitas, akurasi prediksi, dan keselamatan keputusan."},
 {id:"transfer",label:"Generalisasi prosedur lintas domain",subtitle:"Metodenya ditransfer, bukan rumus dan koefisiennya",near:["peffers2007","fernandez2019","fontaine2025"],hypothesis:"Prosedur AISM (spesifikasi outcome, provenance, diagnosis, model, keputusan, evaluasi) mungkin dapat diterapkan pada beberapa organisasi/domain tanpa menyamakan formula.",risk:"Generalisasi metodologi juga menjadi tujuan banyak kerangka implementasi dan DSR; tiga demo sintetis belum membuktikan transferabilitas.",test:"Lakukan transfer studi kasus SATUSEHAT ke pendidikan/logistik dengan ahli domain, ukur waktu pemodelan, kesalahan satuan, dan validitas keputusan."}
];
export const reviewProtocol={
 kind:"exploratory curated mapping; not a systematic or exhaustive review",
 date:"2026-10-30",
 basis:"Abstract dan uraian metode pada halaman jurnal/penerbit atau PubMed; coding coverage masih provisional.",
 legend:{0:"Tidak dinilai sebagai fokus utama (bukan bukti ketiadaan)",1:"Terkait / dibahas sebagian",2:"Fokus kuat menurut sumber yang dibaca"},
 scope:"Menguji posisi AISM pada DSR, System Dynamics, implementation strategy selection, MCDA dan adaptive interventions.",
 warning:"Ketiadaan dalam matriks tidak membuktikan novelty. Perlu protokol systematic/scoping review, pencarian terdokumentasi, screening, ekstraksi, dan audit reviewer independen."
};
export function filterStudies(items,{search="",family="all",dimension="all",minLevel=0}={}){
 const q=String(search).trim().toLocaleLowerCase();
 return items.filter(p=>(family==="all"||p.family===family)&&
   (dimension==="all"||Number(p.coverage?.[dimension]||0)>=minLevel)&&
   (!q||[p.author,p.title,p.year,p.venue,p.doi,p.summary,p.overlap,p.caveat].some(v=>String(v||"").toLocaleLowerCase().includes(q))))
   .sort((a,b)=>b.year-a.year||a.author.localeCompare(b.author));
}
export function dimensionCoverage(items,dimension){
 const classified=items.filter(s=>Number(s.coverage?.[dimension])>=1);
 return {reviewed:items.length,related:classified.length,central:classified.filter(s=>s.coverage[dimension]===2).length};
}
