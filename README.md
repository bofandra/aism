# AISM Lite — Prioritas Perbaikan Pengiriman RME SATUSEHAT

**Aplikasi utama:** https://bofandra.github.io/aism/

AISM Lite adalah demonstrator *Adaptive Intervention Selection Method* untuk membantu pengguna mengidentifikasi **opsi prioritas perbaikan pengiriman data RME laboratorium dan radiologi ke SATUSEHAT**.

## Tiga langkah pengguna

1. **Unggah data agregat (CSV).** Unduh format contoh melalui tombol pada aplikasi atau ambil di [samples/contoh-data-pengiriman-rme.csv](samples/contoh-data-pengiriman-rme.csv). Aplikasi memvalidasi struktur dan menampilkan ringkasan eligible, terkirim, lengkap, dan gagal validasi.
2. **Isi assessment berjenjang.** Enam pertanyaan dasar, lalu pertanyaan pendalaman yang relevan dengan indikator dan kondisi operasional.
3. **Lihat opsi prioritas.** Maksimum tiga opsi utama dan opsi tambahan, masing-masing berisi alasan, langkah awal, indikator evaluasi, dan jejak ke draf CLD.

Semua proses berlangsung di **browser tanpa server pemrosesan data**. File yang diunggah tidak disimpan ke backend AISM. Jangan memasukkan NIK, nama pasien, nomor rekam medis, data per pasien atau informasi sensitif.

## Format data CSV

| Kolom wajib | Makna |
| --- | --- |
| periode | Bulan pengamatan, format YYYY-MM |
| jenis_layanan | laboratorium atau radiologi |
| total_eligible | Episode yang wajib dikirim ke SATUSEHAT |
| total_terkirim | Episode eligible yang berhasil dikirim |
| total_lengkap | Episode terkirim dengan komponen data yang disepakati lengkap |
| total_gagal_validasi | Episode unik yang mengalami kegagalan validasi |

Satu baris = satu kombinasi bulan dan layanan. Urutan jumlah harus **lengkap ≤ terkirim ≤ eligible**. Jumlah gagal validasi adalah ukuran terpisah yang bisa tumpang tindih; jangan dijumlahkan dengan kategori episode lain. Contoh data dalam repo adalah **sintetis**, bukan data RS tertentu.

## Mekanisme prioritas

Aturan eksploratif menggunakan:
- Indikator cakupan kirim, kelengkapan, dan kasus gagal validasi dari data;
- Assessment kondisi monitoring, tata kelola kode, kapasitas PIC, eskalasi, perubahan sistem, dan dukungan pimpinan;
- Hipotesis mekanisme draf CLD: **R1–R5** dan **B1–B3** (monitoring, backlog, terminologi, dukungan, kapasitas, kepatuhan, migrasi, eskalasi).

Ambang 90% keterkiriman, 90% kelengkapan di antara yang terkirim, dan 5% gagal validasi **hanya ilustrasi prototipe**. Skor aturan adalah **peringkat triase demonstrasi**, bukan prediksi dampak, estimasi kausal, standar kebijakan, atau hasil model yang sudah dikalibrasi. Draf CLD masih memerlukan member checking dan validasi empiris.

Pengguna dapat mengunduh ringkasan JSON dan mencetak hasil ke PDF dari browser.

## Halaman penelitian lainnya

- [Lab riset lama (Model Builder v0.3)](https://bofandra.github.io/aism/legacy.html): variabel, mekanisme, formula, simulasi, diagnosis, dan evaluasi adaptif.
- [Literature Review](https://bofandra.github.io/aism/literature.html): matriks penelitian dan novelty workbench.
- [Dokumentasi teknis lab lama](RESEARCH_LAB.md).

## QA

GitHub Actions menguji modul penelitian lama, responsivitas lintas ukuran layar, dan alur AISM Lite. Jalankan lokal dengan static server; aplikasi utama tidak memerlukan proses build.
