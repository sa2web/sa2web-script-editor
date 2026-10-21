# Sa2web Plugin Editor

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Sa2web Plugin Editor adalah aplikasi desktop untuk mengedit plugin situs sa2web secara lengkap. Edit konfigurasi dan skrip dengan saran `api.` di Monaco, uji di situs terpasang, lalu ekspor JSON plugin.

## Debug daring

1. Di platform sa2web yang sudah terpasang, buka halaman **Plugins** situs. Buat plugin dengan nama yang sama seperti di editor dan buat **token debug**. Jaga kerahasiaan token.
2. Masukkan **nama plugin**, **token**, dan **URL pengujian** HTTP(S) situs tersebut di editor. Edit konfigurasi dan skrip; draf disimpan secara lokal.
3. Klik **Launch**. Masuk sebagai administrator situs di jendela baru jika diperlukan. Cookie login tetap tersimpan untuk peluncuran berikutnya.
4. Saat jendela mencapai `/app/index`, draf disinkronkan ke plugin dengan nama dan token yang cocok. Ketidakcocokan menampilkan kesalahan; keberhasilan menampilkan pemberitahuan selama lima detik di jendela tersebut.
5. Uji situs di jendela itu. Hanya sesi bertoken yang memuat konfigurasi debug; pengunjung lain tidak terpengaruh. Klik **Launch** lagi setelah mengubah draf.

## Ekspor plugin

Isi **nama**, **versi** (`ver`), dan **deskripsi** (`remark`), lalu klik **Export**. JSON berisi metadata, konfigurasi, dan skrip.

## Lisensi

Berlisensi [Apache License 2.0](LICENSE).
