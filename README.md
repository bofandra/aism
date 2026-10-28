# AISM Lab — Adaptive Intervention Selection Method

Prototipe interaktif untuk mendemonstrasikan konsep **Adaptive Intervention Selection Method (AISM)**, artefak penelitian Design Science Research untuk membantu analisis dan pemilihan intervensi peningkatan kelengkapan episode diagnostik data FHIR pada interoperabilitas kesehatan.

## Akses
GitHub Pages (setelah aktivasi): https://bofandra.github.io/aism/

## Apa yang disimulasikan
1. Evidence gate: kelayakan bukti, denominator, dan kualitas data.
2. Deteksi awal mekanisme M1–M6 (observabilitas, ownership, retry/exception, terminologi, transisi sistem, kapasitas).
3. Rekomendasi intervensi yang dapat ditelusuri: indikator, pemilik, risiko, dan verifikasi.
4. Human-in-the-loop: persetujuan eksplisit sebelum menjalankan proyeksi pilot.
5. Dua lintasan sintetis selama 12 minggu (baseline vs pilot), dengan delay, tingkat correction, dan asumsi transparan.
6. Evaluasi DSR: expert review, uji skenario, usability, dan pilot lapangan bersyarat izin.

## Penting
**Ini adalah demonstrasi konseptual dengan data dan parameter sintetis**, bukan alat diagnosis pasien, keputusan klinis, kebijakan Kementerian Kesehatan, atau bukti efektivitas intervensi. Bobot klasifikasi dan persamaan proyeksi adalah asumsi demo yang **belum dikalibrasi dan belum divalidasi**. Tidak ada data pasien, rumah sakit nyata, atau data SATUSEHAT yang diambil.

## Teknologi
Situs statis HTML/CSS/JavaScript tanpa backend maupun dependensi eksternal; semua pemrosesan berlangsung lokal di browser. Workflow `.github/workflows/pages.yml` menerbitkan situs melalui GitHub Actions setelah Pages disetel ke **Source: GitHub Actions** pada Settings → Pages.

## Skenario
- Backlog koreksi dan exception
- PIC/ownership lemah
- Masalah terminologi
- Bukti belum memadai (HOLD/INVESTIGATE)

## Rujukan kerangka
Design Science Research Methodology (DSRM, Peffers et al.) dan Systems Thinking/System Dynamics sebagai kerangka konseptual; validasi empiris selanjutnya dibutuhkan.

Lisensi: © 2026 peneliti; prototipe untuk diskusi dan evaluasi metodologis.
