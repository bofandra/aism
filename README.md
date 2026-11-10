# AISM Lite — Kelengkapan Episode Diagnostik SATUSEHAT

**Aplikasi:** https://bofandra.github.io/aism/

AISM Lite adalah prototipe penelitian untuk mengubah profil kelengkapan episode laboratorium/radiologi menjadi assessment kontekstual dan **opsi intervensi yang dapat ditelusuri alasannya**. Ini bukan sistem audit, diagnosis klinis, ataupun bukti efektivitas intervensi.

## Alur aplikasi

1. **Unggah CSV agregat** dari diagnostic_episode (atau sumber setara) yang telah dikelompokkan per bulan dan jenis layanan. Periksa validasi denominator, kelengkapan core/strict, ketidakadaan bukti downstream, dan tren.
2. **Assessment berjenjang**: enam pertanyaan dasar dan pertanyaan pendalaman kondisional. Pilihan *Belum tahu* tersedia.
3. **Opsi prioritas**: status HOLD, INVESTIGATE, RECOMMEND, REVIEW, atau VERIFY dengan pemicu, langkah, prasyarat, kondisi pengecualian, owner, indikator evaluasi, dan CLD.

## Template upload v0.4

[CSV contoh sintetis](samples/contoh-data-pengiriman-rme.csv). Satu baris = satu periode YYYY-MM × jenis_layanan (laboratorium/radiologi) pada konteks fasyankes yang sama. Semua angka adalah **jumlah episode unik**, bukan jumlah resource/API request. Jangan mencampur beberapa fasilitas dalam satu analisis tanpa protokol yang eksplisit.

| Kolom | Makna |
|---|---|
| periode | Bulan request pada cohort episode |
| jenis_layanan | laboratorium atau radiologi |
| total_order | Seluruh order dalam cohort |
| not_yet_eligible | Belum cukup matang/eligible |
| excluded_order | Dikecualikan, termasuk order batal sesuai protokol |
| unverified_linkage | Keterhubungan identifier/resource belum tervalidasi |
| eligible_mature | Episode matang yang layak menjadi denominator |
| complete_core | Episode eligible yang memenuhi definisi core |
| complete_strict | Subset complete_core yang memenuhi aturan strict |
| incomplete_with_downstream | Bukti downstream tersedia tetapi episode belum lengkap |
| completed_without_result | Selesai namun data hasil tidak ditemukan |
| no_downstream_evidence | Belum ditemukan bukti downstream pada snapshot data |

**Validasi jumlah:**

- total_order = not_yet_eligible + excluded_order + unverified_linkage + eligible_mature
- eligible_mature = complete_core + incomplete_with_downstream + completed_without_result + no_downstream_evidence
- complete_strict tidak boleh lebih besar dari complete_core
- Angka bulat non-negatif, tanpa duplikasi bulan/layanan atau kolom tambahan.

**Penting:** Kontrak CSV adalah bentuk agregat **sementara untuk prototipe**, bukan klasifikasi status yang telah difinalisasi bersama ahli. Status research_episode_status, indikator has_execution_evidence dan is_complete_core/strict, serta aturan pematangan dan snapshot perlu direkonsiliasi terhadap data sumber. Jika kategori masih tumpang tindih, jangan mengubah data agar cocok dengan rumus; perbaiki aturan kategorisasi terlebih dahulu.

## Definisi indikator

- Kelengkapan core = complete_core / eligible_mature.
- Kelengkapan strict = complete_strict / eligible_mature.
- Proporsi tanpa bukti downstream = no_downstream_evidence / eligible_mature. Tidak adanya bukti di platform **tidak membuktikan pemeriksaan klinis tidak dilakukan**.
- Episode belum matang, dikecualikan, dan linkage belum pasti tidak masuk denominator.
- Kategori assessable-with-downstream (complete_core + incomplete_with_downstream + completed_without_result) dapat dihitung sebagai indikator terpisah, bukan denominator default untuk kelengkapan pada halaman ini.
- Tren minimal tiga periode; ambang 5 dan 10 poin persentase adalah aturan bentuk pola **eksploratif**, bukan standar atau target.
- Linkage belum terverifikasi atau denominator nol menghasilkan **HOLD** dan menunda rekomendasi teknis.

Satu unit analisis = satu episode diagnostik berbasis satu ServiceRequest. Kelengkapan tidak disamakan dengan keberhasilan HTTP/API. Kewajiban Observation, DiagnosticReport, ImagingStudy (bila berlaku), relasi dan temporalitas harus dinilai sesuai alur diagnostik.

## Pengaman keputusan

Aturan prioritas bersifat deterministik dan belum tervalidasi kausal:
- Bukti episode memicu pertanyaan sesuai layanan, status downstream, dan perubahan sistem;
- DICOM yang belum diterima sumber/VM **bukan** masalah yang diselesaikan dengan retry API;
- Retry hanya menjadi kandidat ketika sumber tersedia dan log membuktikan error retryable;
- Perbaikan mapping tidak direkomendasikan tanpa bukti error semantik;
- HOLD untuk data tak valid; INVESTIGATE untuk mekanisme belum jelas; RECOMMEND adalah kandidat awal; REVIEW untuk persetujuan manusia; VERIFY untuk menilai hasil;
- Setiap opsi memuat kondisi berlaku, kondisi tidak berlaku, owner, bukti, dan CLD terkait.

CLD R1–R5/B1–B3 adalah hipotesis kondisional berdasarkan pra-wawancara, wawancara, GMB dan respons member checking awal. Keterkaitan dan efek tidak boleh dianggap telah divalidasi tanpa pengujian lanjutan. Peringkat aturan merupakan **urutan triase**, bukan estimasi manfaat atau efektivitas.

## Privasi

Seluruh CSV diproses di browser, tidak dikirim atau disimpan di backend AISM. Jangan unggah nama/NIK/nomor rekam medis, ID organisasi, raw log, identitas fasilitas tanpa izin, atau data per pasien. Ekspor hasil JSON hanya berjalan melalui tindakan pengguna.

## Halaman dan QA

- [Lab riset lama](https://bofandra.github.io/aism/legacy.html)
- [Literature Review](https://bofandra.github.io/aism/literature.html)
- [Dokumentasi lab terdahulu](RESEARCH_LAB.md)
- Unit/regression: node --test tests/*.test.mjs
- Browser QA: tests/mobile-smoke.mjs (6 viewport)
