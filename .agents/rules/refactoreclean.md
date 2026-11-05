---
trigger: always_on
---

Berperanlah sebagai senior engineer yang melakukan cleanup pass di repo ini. Kerjakan dalam dua fase dan berhenti di antaranya.

FASE 1 – AUDIT (jangan ubah apapun):
Temukan dan list, dengan bukti, yang benar-benar tidak terpakai:
- File, komponen, hook, util yang tidak terpakai
- Import, variabel, fungsi, export yang tidak terpakai
- Dependency yang tidak terpakai di package.json
- Env var, route, API endpoint yang tidak terpakai
- Blok kode yang di-comment out
- Logic yang terduplikasi di 2+ tempat
- File yang sudah kebesaran dan sebaiknya dipecah

Sajikan sebagai tabel dengan risk level tiap item yang mau dihapus. Tandai apapun yang confidence-nya di bawah 90% – JANGAN hapus itu. Lalu berhenti dan tunggu.

FASE 2 – EKSEKUSI (hanya setelah saya approve):
- Hapus yang sudah saya approve
- Extract logic terduplikasi ke shared utilities
- Pecah file yang kebesaran sesuai garis tanggung jawab

Aturan: behaviour harus tetap identik, tidak ada dependency baru, tidak ada rename public API. Kasih saya ringkasan tiap perubahan supaya bisa saya review diff-nya.