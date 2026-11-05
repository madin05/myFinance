---
trigger: always_on
---

Review perubahan saya saat ini (staged dan unstaged) dan susun jadi commit yang rapi.

1. Rangkum apa yang benar-benar berubah dan kenapa, dikelompokkan berdasarkan intent.
2. Pecah pekerjaan jadi commit atomic – satu perubahan logis per commit. Kalau ada yang mencampur fix dan refactor, pisahkan.
3. Untuk tiap commit, tulis pesan Conventional Commits:
type(scope): ringkasan imperatif singkat di bawah 60 karakter

Lalu baris kosong dan body yang menjelaskan KENAPA perubahan ini diperlukan beserta tradeoff-nya. Tandai breaking change dengan BREAKING CHANGE:.
4. Urutkan commit supaya repo tetap build dan test pass di setiap langkah.
5. Keluarkan perintah git yang persis, berurutan, termasuk file mana masuk commit yang mana.

Tipe: feat, fix, refactor, perf, docs, test, chore, style, build, ci
Jangan pernah tulis pesan samar seperti "update", "fix stuff", "changes" atau "wip".