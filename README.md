# AISM Lab v0.3 — Explainable Intervention Decision Lab

**Demo:** https://bofandra.github.io/aism/

AISM Lab adalah demonstrator penelitian **Adaptive Intervention Selection Method**: pengguna dapat mendefinisikan variabel, menelusuri hipotesis hubungan, membentuk rumus, dan menguji skenario intervensi. Metode umum sama pada semua kasus; model matematis tiap domain berbeda.

> **Peringatan ilmiah:** Semua contoh kasus, koefisien, perubahan parameter intervensi, biaya, dan risiko adalah **sintetis**. Mesin dapat memeriksa sintaks, dimensi satuan dan beberapa invarians numerik, namun **tidak membuktikan kausalitas atau efektivitas intervensi**. Tidak ada data pasien, koneksi SATUSEHAT, rekomendasi klinis, atau kebijakan Kemenkes.

## Literature Review Lab — interactive novelty mapping (v0.3+)

Section **Literature Review** tersedia di halaman publik melalui anchor `#literature`. Ini adalah **curated exploratory mapping**, bukan systematic/scoping review formal dan **tidak membuktikan kebaruan**.

- **Matriks 6 dimensi:** diagnosis konteks, mekanisme perubahan, seleksi intervensi, simulasi dinamis, evaluasi adaptif, dan jejak bukti. Tiap paper diberi kode `0 = belum diklasifikasikan sebagai fokus`, `1 = terkait`, `2 = fokus kuat`, dengan tautan DOI asli. **Angka 0 bukan bukti ketidakadaan suatu fitur.** Coding berbasis abstrak/uraian penerbit dan wajib diaudit lewat full text.
- **Daftar paper terfilter:** filter kelompok metodologi, dimensi, dan pencarian berdasarkan kata kunci, penulis, judul, venue atau DOI.
- **Novelty Workbench:** tiga **hipotesis kontribusi** (integrasi diagnosis–simulasi–keputusan, evaluasi adaptif tingkat organisasi, transfer prosedur antar-domain). Setiap hipotesis mencantumkan prior work terdekat, argumen bantahan, dan rancangan pengujian empiris.
- **Research notebook lokal:** catatan untuk masing-masing paper, status pembacaan, penambahan paper baru dengan DOI dan koding mandiri; catatan tersimpan pada browser saja, **bukan** sinkronisasi cloud.
- **Ekspor JSON dan CSV:** menyimpan seluruh daftar pembanding, coding dimensi, status baca, dan catatan peneliti agar review dapat direproduksi dan dikembangkan.
- **Tinjauan ilmiah:** Implementation Mapping (Fernandez 2019), CFIR–ERIC (Waltz 2019), SMART/JITAI, System Dynamics, MCDA, dan SELECT-IT 2025 menegaskan bahwa AISM **tidak** dapat mengklaim menemukan diagnosis-ke-intervensi atau adaptasi untuk pertama kalinya. Novelty yang **diusulkan**, bukan dibuktikan, harus diuji sebagai kontribusi integrasi dan kegunaan keputusan dalam konteks fasyankes.

**Protokol review berikutnya yang diperlukan:** definisikan pertanyaan/strategi pencarian (database, query, tanggal), kriteria inklusi-eksklusi, screening dua reviewer, telaah full-text, penilaian kualitas, ekstraksi evidensi dan pembanding langsung. Catat mengapa suatu paper dinilai fokus/terkait beserta halaman dukungan; jangan menyimpulkan tidak adanya penelitian dari matriks sementara.

## Fitur baru v0.3 — diagnose, decide, adapt

- **Diagnosis eksplisit:** aturan per variabel berisi arah target (minimal/maksimal), nilai ambang, dan provenance. Indikator diberi status `GAP` atau `WITHIN_TARGET` berdasarkan perhitungan deterministik. Semua target bawaan **sintetis** dan dapat diubah (Advanced Mode); gap bukan bukti kausal.
- **Pemetaan tindakan:** setiap intervensi membawa `targets` yang menunjukkan indikator mana yang dituju. Hubungan mekanisme tetap hipotesis dan **tidak** otomatis menghasilkan persamaan atau estimasi efek.
- **Explainable Decision Gate:** pertimbangkan kenaikan outcome pada horizon simulasi, gap yang relevan, batas biaya ordinal, risiko ordinal, dan provenance efek. Status `HOLD` berarti batas keputusan gagal, `INVESTIGATE` berarti masih butuh bukti, dan `REVIEW_PILOT` berarti kandidat ditinjau manusia — **bukan rekomendasi implementasi**.
- **Adaptive Evaluation:** pengguna memasukkan outcome **agregat** teramati pada minggu/skenario tertentu. Aplikasi menyimpan prediksi pada saat entri, menghitung deviasi dalam poin persentase, menampilkan prediksi model yang telah berubah, dan menandai penyimpangan yang melewati toleransi.
- **Kalibrasi dengan persetujuan:** pencarian terbatas atas **satu** parameter/flow untuk satu pengamatan. Nilai kandidat dipratinjau tanpa mengubah model, lalu diterapkan hanya bila tombol persetujuan dipilih. Riwayat before/after disimpan dan ikut diekspor; parameter yang langsung diganti oleh intervensi tidak bisa dikalibrasi dari skenario itu.
- **Kompatibilitas:** draf `v0.2.1` yang tersimpan di browser dan JSON lama dilengkapi metadata v0.3 secara non-destruktif.
- **Cross-domain:** SATUSEHAT (episode diagnostik), pendidikan (retensi), dan logistik (pengiriman) memakai mesin yang sama tetapi masing-masing mempunyai model, diagnosis, dan tindakan tersendiri.

### Cara menjelaskan AISM kepada reviewer

1. Baca pertanyaan riset; verifikasi populasi, outcome dan boundary sistem.
2. Tinjau kamus variabel dan mekanisme. Bedakan data pengamatan, asumsi, dan hipotesis.
3. Periksa rantai persamaan dan unit checker. Setiap angka hasil harus dapat ditelusuri.
4. Diagnosa indikator terhadap target. Tanyakan dari mana target berasal; target demo bukan standar valid.
5. Buka Decision Gate dan uji biaya, risiko dan ambang manfaat. Baca alasan setiap status; **jangan** mengubah metadata bukti tanpa landasan.
6. Catat hasil implementasi aktual secara agregat. Bandingkan proyeksi, investigasi deviasi, dan jika perlu pratinjau kalibrasi yang memerlukan review manual.

### Batas ilmiah penting

- Mengubah `source` ke `expert` atau `observational` adalah **deklarasi pengguna**, bukan pemeriksaan keaslian sitasi. Status REVIEW_PILOT **tidak** berarti efek telah dibuktikan.
- Fitting satu outcome dapat menghasilkan banyak kombinasi parameter yang sama-sama masuk akal (**non-identifiability**); proses ini tidak memvalidasi arah panah mekanisme, estimasi kausal, generalisasi, ataupun keamanan tindakan.
- Biaya dan risiko bawaan adalah ordinal demonstrasi, bukan estimasi ekonomi atau penilaian risiko organisasi.
- Tidak ada data pasien, koneksi ke SATUSEHAT, sistem rekomendasi klinis, persetujuan organisasi, atau pengambilan keputusan operasional otomatis.
- Evaluasi empiris berikutnya memerlukan validasi pakar, estimasi parameter independen, kalibrasi multi-outcome/multi-periode, out-of-sample testing, evaluasi implementasi dan persetujuan tata kelola.

## Mobile-first refinement v0.2.1

- **320–850px:** Variable Dictionary tampil dalam bentuk kartu; tabel desktop tetap tersedia untuk layar besar.
- **Explain This Model:** inspector menjadi dialog bottom-sheet dengan tombol Tutup, overlay, Escape, focus-trap dan pengembalian fokus saat ditutup.
- **Navigasi:** stepper dapat digeser dengan tahap aktif berada di area terlihat; tombol utama dipertahankan dekat dasar panel.
- **Formula & grafik:** textarea persamaan dengan teks ramah sentuhan; grafik 12 minggu dapat digeser horizontal agar label tidak terlalu kecil.
- **Kontrol sentuh:** tombol/input minimal 44px di layar kecil, input 16px untuk mengurangi zoom paksa di iOS.
- **Proteksi pekerjaan:** model tersimpan lokal di browser (localStorage), per kasus; reset memakai konfirmasi dan satu tingkat undo. Penyimpanan lokal bukan sinkronisasi cloud dan akan hilang jika data situs dihapus.
- **Browser QA:** workflow `.github/workflows/mobile-qa.yml` menjalankan Chromium pada 320, 360, 390, 430, 768, dan 1280px, termasuk inspeksi, edit, autosave, reset, dan undo.
- **Batasan:** tidak ada perubahan model kausal/koefisien; data tetap sintetis. Jangan memasukkan data pasien atau informasi sensitif ke aplikasi publik atau penyimpanan browser.

## Fitur v0.2

- **Guided Builder:** alur variabel → mekanisme → formula → diagnosis → keputusan/simulasi → evaluasi adaptif. Tahap Problem Definition diwakili studi kasus, dan Simulation terintegrasi dalam Intervention.
- **Advanced Builder:** tambah/hapus variabel yang tidak digunakan, edit nama/definisi/provenance, buat/hapus hipotesis hubungan, edit ekspresi matematika, dan ubah parameter intervensi.
- **Variable Dictionary:** tipe, satuan, definisi, nilai, rentang, provenance.
- **Mechanism Graph (list editor):** polaritas, jeda, alasan dan status hipotesis. **Menambah panah tidak secara otomatis membuat persamaan**.
- **Formula Lineage:** jejak variabel dan persamaan upstream, alasan pemilihan persamaan, status asumsi.
- **Safe formula interpreter:** tidak memakai `eval`; hanya penjumlahan, pengurangan, perkalian, pembagian, `min`, `max`, dan `clamp`. Uji dimensi satuan dan pembagian nol.
- **Deterministic stock–flow simulator:** membandingkan 12 minggu baseline dan beberapa perubahan parameter; model dan parameter yang sama menghasilkan hasil yang sama.
- **Research evaluation:** BLOCK/WARN terpisah, uji sensitivitas univariat ±10%, ekspor/impor model JSON lokal.
- **Tiga domain sintetis:** episode diagnostik SATUSEHAT, retensi mahasiswa, dan ketepatan waktu logistik — memakai core yang sama.

## Contoh matematis utama

Studi kasus SATUSEHAT menggunakan **cohort akumulatif**, bukan rolling window:

```text
incidence = N * p * dt
K_eff     = min(K * dt, U + incidence)
E_next    = E + N * dt
U_next    = U + incidence - K_eff
C_next    = E_next - U_next
R_next    = C_next / E_next
Q_closed  = min(Qout * dt, Q + Qin * dt)
Q_next    = Q + Qin * dt - Q_closed
```

`E` adalah episode eligible matang, `U` episode belum lengkap, `N` episode baru/minggu, `p` fraksi tidak lengkap pada episode baru, `K` kapasitas koreksi episode/minggu. `Q`, `Qin`, dan `Qout` memiliki satuan **tiket**, bukan episode; penutupan tiket tidak otomatis menyelesaikan episode.

Dengan nilai sintetis E=500, U=150, N=50, p=.30, K=20, Q=90, Qin=25, Qout=20, dt=1 minggu:

- E₁ = 550
- U₁ = 145
- C₁ = 405
- R₁ = 73,64%
- Q₁ = 95 tiket (berbeda dari U₁)

Contoh skenario satu minggu: mapping `p=.20` → 74,55%; kapasitas `K=25` → 74,55%; keduanya → 75,45%. Efek ini **asumsi demonstrasi**, bukan hubungan yang diturunkan dari 15% error mapping atau koefisien empiris.

## Struktur

```text
index.html             # static GitHub Pages shell
styles.css             # responsive research workbench
src/domains.mjs        # schema, kamus variabel, hipotesis, rumus dan skenario
src/core.mjs           # parser, unit checker, provenance, validasi dan simulator
src/decision.mjs       # aturan diagnosis dan gerbang keputusan eksplisit
src/adaptive.mjs       # feedback observasi, deviasi, pratinjau fitting satu parameter
src/literature-data.mjs # literature corpus, DOI, method coverage, novelty hypotheses
src/literature-ui.mjs   # evidence matrix, filters, notes, paper addition, CSV/JSON export
literature.css          # responsive literature workbench
src/ui.mjs             # guided/advanced editor, inspector, grafik, ekspor/impor
tests/core.test.mjs    # regression, numerical and safeguards tests
tests/v03.test.mjs     # diagnosis, decision gates, adaptive calibration tests
tests/literature.test.mjs # sources, dimension coding, filtering and novelty assumptions
.github/workflows/pages.yml # Node tests + GitHub Pages deploy
```

## Menjalankan test

Node.js 20+:

```bash
node --test tests/*.test.mjs
node --check src/core.mjs
node --check src/decision.mjs
node --check src/adaptive.mjs
node --check src/ui.mjs
node --check src/literature-data.mjs
node --check src/literature-ui.mjs
```

Buka `index.html` melalui HTTP server statis lokal (ES modules tidak selalu didukung ketika dibuka dengan `file://`).

## Perlindungan dan keterbatasan

- **BLOCK:** unit tidak kompatibel, formula tidak valid, denominator nol, nilai di luar rentang, referensi tidak ada, dan outcome di luar batas.
- **WARN:** efek intervensi masih sintetis, provenance kosong, hubungan yang belum masuk formula atau masih hipotesis. Lulus pemeriksaan struktur **bukan** validasi ilmiah.
- Advanced editor adalah editor ekspresi matematika **terbatas**, bukan editor Python/JavaScript bebas; ada pratinjau fitting lokal satu parameter, tetapi tidak ada causal discovery, validasi kausal, atau kalibrasi multivariat otomatis.
- Model kohort SATUSEHAT tidak menangani exit/reclassification episode, masa tunggu koreksi, atau relasi tiket–episode otomatis.
- Model pendidikan tidak menangani intake dan graduation selama horizon. Model logistik memperlakukan fraksi tepat waktu sebagai input skenario.
- Sensitivitas ±10% adalah **one-at-a-time test**, bukan global sensitivity analysis.
- JSON hasil impor tidak diklaim tervalidasi; metadata validasi diturunkan ke not_tested.
- Tidak ada penyimpanan server atau integrasi data pasien. Hati-hati memilih file untuk impor pada komputer umum.

## Rencana pengujian penelitian

Validasi pakar atas model mekanisme; verifikasi operasional episode FHIR dan maturity per modul; estimasi parameter berbasis data; evaluasi model System Dynamics; uji sensitivitas; pembandingan keputusan dengan panel ahli/pendekatan existing; dan uji pilot bila memperoleh izin.

**Baseline:** versi sebelum Hybrid Builder disimpan di branch [archive/v0.1-demonstrator](https://github.com/bofandra/aism/tree/archive/v0.1-demonstrator).

© 2026 AISM research demonstrator.
