# Panduan Penggunaan Alat Pengembangan Skrip Sa2web

## 1. Gambaran Proyek

Proyek ini adalah alat desktop untuk pengembangan skrip, dibangun dengan Electron Forge, Vue, Bootstrap, dan Monaco Editor. Jendela utama digunakan untuk mengedit skrip dan mengonfigurasi halaman target. Jendela uji membuka URL target dan memakai `preload.js` untuk menyuntikkan runtime skrip, API bantuan DOM, API data pengguna, pembacaan header request/response, serta kemampuan menulis ulang halaman, aliran SSE, atau respons API.

Cocok untuk:

- menulis dan men-debug skrip peningkatan halaman;
- menyembunyikan, menghapus, atau memosisikan overlay pada elemen halaman target;
- mencegat dan menulis ulang respons API biasa;
- mencegat dan menulis ulang data aliran SSE;
- menyediakan konfigurasi sederhana dan akses data pengguna untuk skrip.

## 2. Teknologi

- Electron 37: shell desktop, main process, renderer process, dan jendela uji.
- Electron Forge + Webpack: pengembangan, packaging, dan publikasi.
- Vue 3: form dan manajemen state jendela utama.
- Bootstrap: gaya antarmuka.
- Monaco Editor: editor JavaScript dengan type hint dari `src/Api.js`.
- i18next: teks multibahasa.

## 3. Struktur Direktori

```text
src/
  main.js                Main process: window, menu, IPC, proxy, intersepsi request.
  preload.js             Mengekspos window.fileApi dan window.api.
  renderer.js            Logika Vue, Monaco, dan event menu.
  Api.js                 Deklarasi tipe dan komentar api untuk Monaco.
  DomUtils.js            Utilitas DOM: CSS/XPath, visibility, debounce, dan lainnya.
  userData.js            Wrapper IPC data pengguna di sisi renderer.
  Dialogs.js             Helper dialog.
  i18n.js                Inisialisasi i18n main process.
  i18n.renderer.js       Inisialisasi i18n renderer process.
  index.html             Template jendela utama.
  css/                   Bootstrap dan style aplikasi.
  locales/               Pesan JSON multibahasa.
  vendors/               Aset lokal Vue, Bootstrap, dan Monaco.
assets/
  icon.ico               Ikon aplikasi.
package.json             npm scripts, dependensi, dan metadata.
forge.config.js          Konfigurasi Electron Forge.
webpack.*.config.js      Konfigurasi Webpack.
```

## 4. Menjalankan dan Membangun

```bash
npm install
npm start
npm run package
npm run make
npm run publish
npm run lint
```

Script `lint` saat ini hanya placeholder.

## 5. Fitur Jendela Utama

- URL: alamat halaman target.
- Launch: membuka URL, menyimpan form, dan memuat halaman, tetapi tidak mengaktifkan status injeksi skrip pada `saForm`.
- Run Script: membuka URL dan mengirim form saat ini serta skrip editor ke jendela uji.
- Show/Hide Settings: membuka atau menutup konfigurasi lanjutan.
- Open File: membuka file skrip ke Monaco Editor.
- Save File: menyimpan isi editor.
- Script Editor: menulis JavaScript. Dalam mode page script, objek `api` disuntikkan; mode respons biasa dan SSE memakai parameter berbeda.

Menu menyediakan pembuatan file baru, buka file, simpan file, ganti bahasa, dan informasi versi.

## 6. Konfigurasi

Form jendela utama sesuai dengan `config.form` dan disimpan ke `.sa.config` di direktori pengguna.

| Field | Tipe | Deskripsi |
| --- | --- | --- |
| `url` | string | URL halaman target. |
| `script` | string | Skrip di Monaco Editor. |
| `hide` | string[] | Selector yang disembunyikan dalam mode page script. |
| `remove` | string[] | Selector yang dihapus dalam mode page script. |
| `requestHeaders` | string | Header request dipisahkan koma, dibaca dengan `api.header(name, true)`. |
| `responseHeaders` | string | Header response dipisahkan koma, dibaca dengan `api.header(name, false)`. |
| `product` | object | Konfigurasi kustom yang dapat dibaca lewat `api.config`. |
| `userAgent` | string | User-Agent kustom. |
| `urlchangeEvent` | boolean | Menyuntikkan event `urlchange` dengan membungkus `history.pushState`, `history.replaceState`, dan `popstate`. |
| `isPage` | boolean | Menjalankan sebagai page script. |
| `scriptSelector` | string | Kondisi CSS/XPath untuk menjalankan page script. |
| `isSSE` | boolean | Memperlakukan mode non-page sebagai SSE script. |
| `matchUrl` | string | URL API atau SSE yang dicocokkan. |
| `proxy.method` | string | Mode proxy: `direct`, `fixed_servers`, atau `system`. |
| `proxy.server` | string | Aturan server proxy, contoh `http://127.0.0.1:7890`. |
| `proxy.bypassList` | string | Aturan bypass proxy. |

## 7. Selector

`DomUtils.findElements` mendukung CSS dan XPath:

- CSS: `.button.primary`
- XPath: `xpath://div[@id="app"]`
- Parent: suffix `:p` atau `:p2`.
- Edge overlay: `:top`, `:right`, `:bottom`, `:left`.

## 8. Mode Skrip

### 8.1 Page Script

Saat `isPage = true`, Run Script membuka halaman, `preload.js` membaca `saForm`, menginisialisasi `window.api` pada halaman dan iframe, lalu menjalankan skrip jika `scriptSelector` cocok. Aturan `hide` dan `remove` terus diterapkan saat DOM berubah.

```js
const btn = api.dom.querySelector(document, '.submit');
const value = await api.user.get('token');
```

### 8.2 Penulisan Ulang Respons API Biasa

Saat `isPage = false` dan `isSSE = false`, jendela uji memakai intersepsi `Fetch` dari Chrome DevTools Protocol. Jika URL cocok dengan `matchUrl`, body dibaca dan skrip harus mengembalikan body baru:

```js
async (data, api, url) => {
  // isi skrip
}
```

### 8.3 SSE Script

Saat `isPage = false` dan `isSSE = true`, `EventSource` dan `fetch` dibungkus. Chunk SSE yang cocok dengan `matchUrl` diproses dengan:

```js
async (data) => {
  // isi skrip
}
```

### 8.4 Pencocokan URL

`matchUrl` mendukung `*`, `regex:<ekspresi>`, `exact:<URL lengkap>`, `script:<ekspresi>`, dan string biasa untuk mencocokkan prefix URL.

## 9. Header

Contoh:

- Request: `authorization,cookie`
- Response: `content-type,set-cookie`

```js
const authorization = await api.header('authorization', true);
const contentType = await api.header('content-type', false);
```

Nama header diubah ke huruf kecil. Hanya header yang dikonfigurasi dan benar-benar melewati jendela uji yang dapat dibaca.

## 10. Proxy dan User-Agent

Proxy session uji dapat berupa `direct`, `fixed_servers`, atau `system`. Jika `userAgent` disetel, Run Script memperbarui User-Agent aplikasi dan session uji.

## 11. Persistensi

```text
~/.sa.config
```

Perubahan form dan editor disimpan otomatis dengan debounce. Jika `filePath` sudah terikat, isi skrip juga disimpan ke file tersebut.

## 12. Catatan Implementasi

`window.fileApi` diekspos melalui `contextBridge.exposeInMainWorld('fileApi', ...)`, dan `window.api` melalui `initUserScriptApis(win)`. Iframe baru juga dicoba untuk diinisialisasi. Alat ini memakai `MutationObserver`, `IntersectionObserver`, `ResizeObserver`, `resize`, dan `scroll`. API data pengguna saat ini berbasis array memori `dataList`, bukan database persisten.

## 13. Cuplikan Umum

```js
await api.utils.wait(() => !!api.dom.querySelector(document, '.target'), 10000);

const el = api.dom.querySelector(document, '.banner');
if (el) el.style.display = 'none';

const overlay = api.dom.createOverlayBy('.target', '__targetOverlay__');
overlay.style.border = '2px solid red';
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '999999';

api.dom.addConnectListener('.modal', (isConnected) => {
  console.log('modal connected:', isConnected);
});

await api.user.put('lastUrl', location.href);
const ret = await api.user.get('lastUrl');
console.log(ret.value);
```
