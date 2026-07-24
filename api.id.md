# Dokumentasi API window preload.js

Dokumen ini merangkum API utama yang dipasang ke `window` oleh `src/preload.js`, berdasarkan `src/preload.js`, `src/userData.js`, `src/DomUtils.js`, `src/main.js`, dan `src/Api.js`.

## 1. Ringkasan

| API | Window | Tujuan |
| --- | --- | --- |
| `window.fileApi` | Jendela utama | Komunikasi dengan main process: buka/simpan file, jalankan jendela uji, baca/simpan konfigurasi, event menu, dan ganti bahasa. |
| `window.api` | Jendela halaman uji dan iframe yang dapat diakses | API user script: data pengguna, query dan observasi DOM, overlay, utilitas, header request/response, dan konfigurasi produk. |

Halaman uji juga dapat membungkus `window.EventSource`, `window.fetch`, dan mengirim event kustom `urlchange`.

## 2. `window.fileApi`

`window.fileApi` diekspos melalui `contextBridge.exposeInMainWorld('fileApi', ...)` dan hanya digunakan di jendela utama.

| Metode | Signature | Deskripsi |
| --- | --- | --- |
| `launch` | `launch(url: string, saForm: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Membuka atau memakai ulang jendela uji untuk memuat URL. Konfigurasi disimpan; jika jendela sudah ada, jendela dipakai ulang. Implementasi saat ini mengosongkan `saForm`, jadi biasanya hanya untuk membuka halaman. |
| `runScript` | `runScript(url: string, form: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Membuka atau memakai ulang jendela uji, memuat URL, dan mengirim form serta skrip. Menerapkan User-Agent dan proxy bila diatur. |
| `openFile` | `Promise<{ canceled: true } \| { canceled: false, content: string, filePath: string }>` | Membuka file picker dan membaca file terpilih. |
| `saveFile` | `saveFile(filePath: string \| undefined, content: string): Promise<{ canceled: true } \| { canceled: false, filePath: string }>` | Menyimpan teks; menampilkan dialog simpan jika `filePath` kosong. |
| `getConfig` | `Promise<object>` | Membaca `~/.sa.config`. Jika `filePath` ada, isinya disinkronkan ke `config.form.script`. Mengembalikan `{}` bila tidak ada atau invalid. |
| `saveConfig` | `saveConfig(config: object): Promise<void>` | Menggabungkan dan menyimpan konfigurasi, mempertahankan `config.language` dari main process. |
| `updateLanguage` | `updateLanguage(language: string): Promise<void>` | Menyimpan bahasa, memperbarui i18n, membangun ulang menu, dan me-reload jendela utama. Contoh: `zh`, `en`, `vi`, `ja`, `ru`, `es`, `fr`, `in`. |

Event menu: `onMenuOpenFile(callback)`, `onMenuSaveFile(callback)`, `onMenuChangeLanguage(callback)`, dan `onAbout(callback)` mengembalikan `Electron.IpcRenderer`.

## 3. `window.api`

`window.api` dipasang pada jendela uji dan iframe yang dapat diakses.

```ts
interface Window {
  api: {
    user: UserApi;
    config: Record<string, unknown>;
    dom: DomApi;
    utils: UtilsApi;
    header(headerName: string, isRequestHeader: boolean): Promise<string | string[] | undefined>;
  };
}
```

`api.config` membaca konfigurasi produk: `api.config === saForm.product || {}`.

## 4. `api.user`

`api.user` membaca dan menulis data terkait pengguna. Saat ini data ditopang array memori di main process dan tidak persisten seperti database setelah restart.

Parameter opsional umum: `site`, `account`, dan `did` adalah boolean default `false`. Main process menerima parameter ini, tetapi belum benar-benar melakukan partisi data.

| Metode | Signature | Deskripsi |
| --- | --- | --- |
| `put` | `put(name: string, value: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Menyimpan pasangan key-value. |
| `get` | `get(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ value: string \| null, status: boolean }>` | Membaca nilai. |
| `remove` | `remove(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Menghapus nilai. |
| `incr` | `incr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Menambah `step` ke `Number(value)`; jika key belum ada, dibuat dengan nilai `step`. |
| `decr` | `decr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Mengurangi `step`; jika key belum ada, dibuat dengan `step * -1`. |
| `startsWith` | `startsWith(prefix: string, site?: boolean, account?: boolean, did?: boolean): Promise<Array<{ name: string, value: string }>>` | Mencari key yang diawali `prefix`. |
| `countAll` | `countAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Menghitung record dengan nama tersebut. |
| `sumAll` | `sumAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Menjumlahkan nilai numerik dari record bernama tersebut. |

## 5. `api.dom`

`api.dom` menyediakan pencarian DOM, cek visibility, listener koneksi, listener ukuran, dan pembuatan overlay.

Selector yang didukung: CSS (`.class-name`), XPath (`xpath://div[@id="app"]`), suffix parent `:p`/`:p2`, serta suffix edge `:top`, `:right`, `:bottom`, `:left`.

| Metode | Signature | Deskripsi |
| --- | --- | --- |
| `createMutationObserver` | `createMutationObserver(ele: Element, bindStr: string, childList: boolean, subtree: boolean, attributes: boolean, characterData: boolean, fn: (mutations: MutationRecord[]) => void): MutationObserver` | Membuat dan menyimpan cache `MutationObserver` pada `ele[bindStr]`; callback berjalan dalam `requestAnimationFrame`. |
| `querySelector` | `querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement \| null` | Mengembalikan elemen pertama yang cocok. |
| `querySelectorAll` | `querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[]` | Mengembalikan semua elemen yang cocok. |
| `isVisible` | `isVisible(ele: HTMLElement): Promise<boolean>` | Memakai `IntersectionObserver` dan mengembalikan `entry.isIntersecting`. |
| `getVisibleRect` | `getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>` | Mengembalikan rect terlihat: `left`, `top`, `right`, `bottom`, `width`, `height`, `x`, `y`. |
| `getConnectListeners` | `getConnectListeners(): Array<{ querySelector: string; callback: (isConnected: boolean) => void; isConnected?: boolean; }>` | Mengembalikan listener koneksi; dapat gagal jika observer internal belum dibuat. |
| `addConnectListener` | `addConnectListener(cssOrXPathSelector: string, callback: (isConnected: boolean) => void): void` | Memantau elemen muncul atau hilang dari dokumen. Registrasi ulang selector memperbarui callback. |
| `removeConnectListener` | `removeConnectListener(cssOrXPathSelectors: string[]): void` | Menghapus listener untuk selector tersebut. |
| `addResizeListener` | `addResizeListener(cssOrXPathSelector: string, bindWindowStr: string, callback: (rect: DOMRect) => void, createObserver?: boolean, delayTime?: number): ResizeObserver \| (() => void)` | Memantau ukuran dan posisi. Jika elemen tidak ada, callback dipanggil dengan `new DOMRect(0,0,0,0)`. Default: `true`, `500`. |
| `createOverlayBy` | `createOverlayBy(cssOrXPathSelector: string, bindWindowStr: string, createObserver?: boolean, delayTime?: number, fn?: (rect: DOMRectReadOnly) => void): HTMLElement` | Membuat `div` fixed yang mengikuti area terlihat target. Memakai ulang `window[bindWindowStr]`. |
| `createOverlayByBorder` | `createOverlayByBorder(bindWindowStr: string, top: string \| number, right: string \| number, bottom: string \| number, left: string \| number, createObserver?: boolean, delayTime?: number): HTMLElement` | Membuat overlay dari empat batas; tiap batas bisa pixel atau selector. |

Overlay ditambahkan ke `document.documentElement`, menjadi `0px` jika target hilang, dan diperbarui melalui `ResizeObserver`, `resize`, dan `scroll`.

## 6. `api.utils`

| Metode | Signature | Deskripsi |
| --- | --- | --- |
| `wait` | `wait(fn: () => boolean, timeoutMs: number, intervalMs?: number): Promise<void>` | Polling sampai `fn` bernilai truthy. `intervalMs` default `100`. Timeout menolak dengan `Error("Timeout: function did not return true in time.")`. |
| `runScript` | `runScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>` | Menjalankan JavaScript di halaman melalui `webFrame.executeJavaScript`. |

## 7. `api.header(headerName, isRequestHeader)`

```ts
header(headerName: string, isRequestHeader: boolean): Promise<string | string[] | undefined>
```

Membaca header yang dicatat jendela uji. `headerName` diubah ke huruf kecil; `true` membaca request header, `false` membaca response header. Hanya nama yang dikonfigurasi di `requestHeaders` atau `responseHeaders` yang dicatat.

## 8. Injeksi dan Event Global

- `urlchange`: jika `saForm.urlchangeEvent` benar dan window adalah top-level, `pushState`, `replaceState`, dan `popstate` dibungkus; event berisi `{ oldUrl, url }`.
- `window.EventSource`: dalam mode SSE, `addEventListener('message', fn)` dan `onmessage` dibungkus; jika `matchUrl` cocok, data diproses script dan hasilnya mengganti `MessageEvent.data`.
- `window.fetch`: dalam mode SSE, hanya memproses response `text/event-stream` dengan URL cocok; membaca chunk, menjalankan script, encode ulang, dan menulis ke `ReadableStream`.
- `postIpcMessage(type, data)`: fungsi internal untuk komunikasi page/preload lewat `window.postMessage`, terutama untuk `doSSE` dan `doReplySSE`.

## 9. Kontrol Halaman

- `saForm.hide`: saat inisialisasi dan perubahan DOM, elemen cocok diberi `__ignore__="true"` dan `display: none`.
- `saForm.remove`: saat inisialisasi dan perubahan DOM, elemen cocok dihapus dari parent.

## 10. Tipe

Lihat `api.md` untuk blok TypeScript lengkap; signature publik sama seperti yang tercantum di atas.
