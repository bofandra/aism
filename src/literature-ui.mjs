
import {curatedStudies,dimensions,families,noveltyClaims,reviewProtocol,filterStudies} from "./literature-data.mjs";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key="aism-literature-notes-v1";
function load(){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x&&Array.isArray(x.custom)&&x.notes&&x.status?x:{custom:[],notes:{},status:{}};}catch{return {custom:[],notes:{},status:{}};}}
const saved=load(),state={custom:saved.custom,notes:saved.notes,status:saved.status,view:"matrix",selected:"fernandez2019",claim:"integration",search:"",family:"all",dimension:"all",adding:false};
const papers=()=>[...curatedStudies,...state.custom];
const selectedPaper=()=>papers().find(p=>p.id===state.selected);
const fam=id=>families.find(f=>f.id===id)?.label||id;
const score=n=>n===2?"Fokus kuat":n===1?"Terkait":"Belum dinilai";
const filtered=()=>filterStudies(papers(),{search:state.search,family:state.family,dimension:state.dimension,minLevel:state.dimension==="all"?0:1});
function persist(){try{localStorage.setItem(key,JSON.stringify({custom:state.custom,notes:state.notes,status:state.status}));}catch{say("Penyimpanan lokal tidak tersedia; ekspor JSON agar catatan tidak hilang.");}}
function say(v){$("lit-feedback").textContent=v;}
function buttonPaper(p){return '<button class="lit-row-link" type="button" data-paper="'+esc(p.id)+'">'+esc(p.author)+" ("+p.year+")</button>";}
function renderMatrix(rows){
  if(!rows.length)return '<p class="lit-empty">Tidak ada paper untuk filter ini.</p>';
  const legend='<div class="lit-legend"><span class="lit-level lit-level-2">● Fokus kuat</span><span class="lit-level lit-level-1">◐ Terkait</span><span class="lit-level">— Belum dinilai</span></div>';
  const header='<thead><tr><th>Studi / kelompok metode</th>'+dimensions.map(d=>'<th title="'+esc(d.question)+'">'+esc(d.short)+'</th>').join("")+'</tr></thead>';
  const body=rows.map(p=>'<tr class="'+(p.id===state.selected?"lit-current":"")+'"><th>'+buttonPaper(p)+'<small>'+esc(fam(p.family))+'</small></th>'+
    dimensions.map(d=>{const n=Number(p.coverage?.[d.id]||0);return '<td><button type="button" data-paper="'+esc(p.id)+'" class="lit-cell lit-cell-'+n+'" aria-label="'+esc(p.author+"; "+d.label+": "+score(n))+'" title="'+esc(d.label+": "+score(n))+'">'+(n===2?"●":n===1?"◐":"—")+'</button></td>';}).join("")+'</tr>').join("");
  return legend+'<div class="lit-scroller" role="region" tabindex="0" aria-label="Matriks telaah paper dapat digeser horizontal"><table class="lit-matrix">'+header+'<tbody>'+body+'</tbody></table></div><p class="lit-footnote">Koding sementara berdasarkan abstrak/uraian penerbit. Tanda — bukan bukti ketiadaan kemampuan dalam paper; klik sel untuk analisis dan DOI.</p>';
}
function renderPapers(rows){
  if(!rows.length)return '<p class="lit-empty">Tidak ada paper sesuai pencarian.</p>';
  return '<div class="lit-paper-grid">'+rows.map(p=>'<article class="lit-paper-card"><div class="lit-paper-meta">'+p.year+' · '+esc(fam(p.family))+' · '+esc(state.status[p.id]||"belum dibaca")+'</div><h3>'+esc(p.title)+'</h3><p>'+esc(p.summary)+'</p><div class="lit-paper-actions"><button class="lit-action" type="button" data-paper="'+esc(p.id)+'">Tinjau paper</button><a href="'+esc(p.link)+'" target="_blank" rel="noopener noreferrer">DOI ↗</a></div></article>').join("")+'</div>';
}
function renderNovelty(){
 const c=noveltyClaims.find(q=>q.id===state.claim)||noveltyClaims[0];
 const tabs='<div class="lit-claim-picker">'+noveltyClaims.map(q=>'<button class="lit-claim '+(q.id===c.id?"lit-claim-active":"")+'" type="button" data-claim="'+q.id+'" aria-pressed="'+(q.id===c.id)+'"><strong>'+esc(q.label)+'</strong><small>'+esc(q.subtitle)+'</small></button>').join("")+'</div>';
 return tabs+'<article class="lit-claim-detail"><span class="lit-caution">HIPOTESIS KONTRIBUSI · BELUM TERBUKTI</span><h3>'+esc(c.label)+'</h3><div class="lit-claim-columns"><div><h4>Kontribusi yang diusulkan</h4><p>'+esc(c.hypothesis)+'</p></div><div><h4>Overlap / bantahan yang perlu dijawab</h4><p>'+esc(c.risk)+'</p></div></div><h4>Evaluasi untuk menguji novelty</h4><p>'+esc(c.test)+'</p><h4>Paper pembanding terdekat</h4><div class="lit-near">'+c.near.map(id=>{const p=papers().find(x=>x.id===id);return p?'<button type="button" data-paper="'+esc(p.id)+'">'+esc(p.author+" · "+p.year)+' ↗</button>':"";}).join("")+'</div></article><p class="lit-footnote">Ini adalah peta posisi riset, bukan bukti originalitas. Klaim novelty perlu review sistematis, pemeriksaan full text, serta perbandingan empiris dengan metode terdahulu.</p>';
}
function detail(p){
 if(!p)return '<p class="lit-empty">Pilih paper untuk analisis.</p>';
 const levels=dimensions.map(d=>{const n=Number(p.coverage?.[d.id]||0);return '<div><span>'+esc(d.label)+'</span><span class="lit-level lit-level-'+n+'">'+score(n)+'</span></div>';}).join("");
 const status=state.status[p.id]||"unread";
 return '<div class="lit-detail-head"><div><span class="lit-kicker">'+(p.origin==="custom"?"ADDED BY USER":"CURATED READING")+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.author+" · "+p.year+" · "+p.venue)+'</p></div><a class="lit-doi" href="'+esc(p.link)+'" target="_blank" rel="noopener noreferrer">Buka sumber ↗</a></div>'+
 '<div class="lit-detail-split"><div><h4>Isi / kontribusi literatur</h4><p>'+esc(p.summary)+'</p><h4>Persamaan dengan AISM</h4><p>'+esc(p.overlap)+'</p></div><div><h4>Batas interpretasi dan pertanyaan kritis</h4><p>'+esc(p.caveat)+'</p><h4>Posisi kemampuan</h4><div class="lit-dimensions">'+levels+'</div></div></div>'+
 '<div class="lit-note-editor"><label>Status pembacaan<select id="lit-reading"><option value="unread" '+(status==="unread"?"selected":"")+'>Belum dibaca</option><option value="abstract" '+(status==="abstract"?"selected":"")+'>Abstrak diperiksa</option><option value="fulltext" '+(status==="fulltext"?"selected":"")+'>Full text diperiksa oleh peneliti</option></select></label><label>Catatan ilmiah (halaman, keterbatasan, pertanyaan pembimbing)<textarea id="lit-notes" rows="4" placeholder="Tuliskan hasil telaah Anda; tersimpan hanya di browser...">'+esc(state.notes[p.id]||"")+'</textarea></label><div class="lit-paper-actions"><button class="lit-primary" id="lit-save" type="button">Simpan catatan</button>'+(p.origin==="custom"?'<button class="lit-delete" type="button" data-remove="'+esc(p.id)+'">Hapus sumber tambahan</button>':"")+'</div></div>';
}
function addForm(){
 return '<form class="lit-add-form" id="lit-add-form"><h3>Tambahkan literatur pembanding</h3><p>Paper tidak otomatis dianggap tervalidasi. Koding sementara perlu dicek kembali terhadap full text.</p><div class="lit-add-grid">'+
 '<label>Judul<input name="title" maxlength="240" required></label><label>Penulis<input name="author" maxlength="120" required></label>'+
 '<label>Tahun<input name="year" type="number" min="1900" max="2030" required></label><label>DOI<input name="doi" placeholder="10.xxxx/..." maxlength="160" required></label>'+
 '<label>Kategori<select name="family">'+families.map(f=>'<option value="'+f.id+'">'+esc(f.label)+'</option>').join("")+'</select></label><label>Jurnal / venue<input name="venue" maxlength="150"></label>'+
 '<label class="lit-wide">Inti penelitian<textarea name="summary" maxlength="500" required></textarea></label><label class="lit-wide">Overlap dengan AISM<textarea name="overlap" maxlength="500" required></textarea></label><label class="lit-wide">Batas / kritik<textarea name="caveat" maxlength="500" required></textarea></label>'+
 '</div><h4>Koding dimensi (opsional)</h4><div class="lit-rating-grid">'+dimensions.map(d=>'<label>'+esc(d.label)+'<select name="dim-'+d.id+'"><option value="0">Belum dinilai</option><option value="1">Terkait</option><option value="2">Fokus kuat</option></select></label>').join("")+'</div><div class="lit-paper-actions"><button class="lit-primary" type="submit">Tambahkan paper</button><button class="lit-action" type="button" id="lit-cancel-add">Batal</button></div></form>';
}
function render(){
 const rows=filtered();
 $("lit-count").textContent=papers().length;$("lit-filtered").textContent=rows.length;$("lit-reviewed").textContent=Object.values(state.status).filter(x=>x==="fulltext").length;
 $("lit-content").innerHTML=state.view==="matrix"?renderMatrix(rows):state.view==="papers"?renderPapers(rows):renderNovelty();
 $("lit-detail").innerHTML=detail(selectedPaper());
 $("lit-add").innerHTML=state.adding?addForm():"";
 $("lit-filter-controls").hidden=state.view==="novelty";
 $("lit-search").value=state.search;$("lit-family").value=state.family;$("lit-dimension").value=state.dimension;
 document.querySelectorAll("[data-lit-tab]").forEach(b=>{const active=b.dataset.litTab===state.view;b.classList.toggle("lit-tab-active",active);b.setAttribute("aria-pressed",String(active));});
}
function download(filename,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function exportJson(){download("aism-literature-review.json",JSON.stringify({schemaVersion:"literature-v1",exportedAt:new Date().toISOString(),protocol:reviewProtocol,dimensions,curatedStudies,custom:state.custom,notes:state.notes,status:state.status,noveltyClaims},null,2),"application/json");say("JSON literatur dan catatan berhasil disiapkan.");}
function exportCsv(){const names=["author","year","title","family","doi","reading","note",...dimensions.map(x=>x.id)],q=x=>'"'+String(x??"").replaceAll('"','""')+'"';const lines=[names.map(q).join(",")];for(const p of papers())lines.push([p.author,p.year,p.title,p.family,p.doi,state.status[p.id]||"unread",state.notes[p.id]||"",...dimensions.map(d=>p.coverage?.[d.id]||0)].map(q).join(","));download("aism-literature-matrix.csv","\ufeff"+lines.join("\r\n"),"text/csv;charset=utf-8");say("CSV matriks berhasil disiapkan.");}
function parseNew(form){
 const x=Object.fromEntries(new FormData(form).entries());
 const doi=String(x.doi||"").trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"");
 if(!/^10\.\d{4,9}\/\S+$/i.test(doi))throw Error("DOI tidak valid.");
 if(papers().some(p=>p.doi.toLowerCase()===doi.toLowerCase()))throw Error("DOI sudah tercatat.");
 if(!families.some(f=>f.id===x.family))throw Error("Kategori tidak valid.");
 const year=Number(x.year);if(!Number.isInteger(year)||year<1900||year>2030)throw Error("Tahun tidak valid.");
 const coverage=Object.fromEntries(dimensions.map(d=>[d.id,Number(x["dim-"+d.id]||0)]));
 return {id:"user-"+Date.now(),origin:"custom",year,doi,link:"https://doi.org/"+encodeURI(doi),family:x.family,coverage,author:String(x.author||"").trim().slice(0,120),title:String(x.title||"").trim().slice(0,240),venue:String(x.venue||"").trim().slice(0,150),summary:String(x.summary||"").trim().slice(0,500),overlap:String(x.overlap||"").trim().slice(0,500),caveat:String(x.caveat||"").trim().slice(0,500)};
}
$("literature").addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.litTab){state.view=b.dataset.litTab;state.adding=false;render();return;}
 if(b.dataset.claim){state.claim=b.dataset.claim;render();return;}
 if(b.dataset.paper){state.selected=b.dataset.paper;render();$("lit-detail").scrollIntoView({block:"nearest",behavior:"smooth"});return;}
 if(b.dataset.remove){if(!confirm("Hapus paper tambahan ini beserta catatannya?"))return;state.custom=state.custom.filter(x=>x.id!==b.dataset.remove);delete state.notes[b.dataset.remove];delete state.status[b.dataset.remove];state.selected="fernandez2019";persist();render();say("Paper tambahan dihapus.");return;}
 if(b.id==="lit-add-toggle"){state.adding=!state.adding;state.view="papers";render();if(state.adding)$("lit-add").scrollIntoView({block:"nearest"});return;}
 if(b.id==="lit-cancel-add"){state.adding=false;render();return;}
 if(b.id==="lit-save"){state.notes[state.selected]=$("lit-notes").value.slice(0,6000);state.status[state.selected]=$("lit-reading").value;persist();render();say("Catatan disimpan lokal di browser ini.");return;}
 if(b.id==="lit-export-json"){exportJson();return;}if(b.id==="lit-export-csv"){exportCsv();return;}
});
$("lit-search").addEventListener("input",e=>{state.search=e.target.value;render();$("lit-search").focus();});
$("lit-family").addEventListener("change",e=>{state.family=e.target.value;render();});
$("lit-dimension").addEventListener("change",e=>{state.dimension=e.target.value;render();});
$("literature").addEventListener("submit",e=>{if(e.target.id!=="lit-add-form")return;e.preventDefault();try{if(state.custom.length>=250)throw Error("Batas 250 paper tambahan tercapai.");const p=parseNew(e.target);if(!p.author||!p.title||!p.summary||!p.overlap||!p.caveat)throw Error("Analisis ringkas wajib diisi.");state.custom.push(p);state.selected=p.id;state.adding=false;state.search="";state.family="all";state.dimension="all";persist();render();say("Paper berhasil ditambahkan. Validasi full text masih diperlukan.");}catch(err){say("Gagal menambah paper: "+err.message);}});
render();
