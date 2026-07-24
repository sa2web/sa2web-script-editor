# Hướng dẫn sử dụng công cụ phát triển script Sa2web

## 1. Tổng quan dự án

Dự án này là công cụ desktop để phát triển script, được xây dựng bằng Electron Forge, Vue, Bootstrap và Monaco Editor. Cửa sổ chính dùng để chỉnh sửa script và cấu hình trang đích. Cửa sổ kiểm thử mở URL đích và dùng `preload.js` để chèn môi trường chạy script, API hỗ trợ DOM, API dữ liệu người dùng, khả năng đọc header request/response, cũng như chỉnh sửa trang, luồng SSE hoặc phản hồi API.

Phù hợp cho:

- viết và gỡ lỗi script tăng cường trang;
- ẩn, xóa hoặc đặt overlay trên phần tử trang đích;
- chặn và sửa phản hồi API thông thường;
- chặn và sửa dữ liệu luồng SSE;
- cung cấp cấu hình đơn giản và dữ liệu người dùng cho script.

## 2. Công nghệ

- Electron 37: vỏ desktop, main process, renderer process và cửa sổ kiểm thử.
- Electron Forge + Webpack: phát triển, đóng gói và phát hành.
- Vue 3: form và quản lý trạng thái cửa sổ chính.
- Bootstrap: giao diện.
- Monaco Editor: trình soạn JavaScript, nhận gợi ý kiểu từ `src/Api.js`.
- i18next: nội dung đa ngôn ngữ.

## 3. Cấu trúc thư mục

```text
src/
  main.js                Main process: cửa sổ, menu, IPC, proxy, chặn request.
  preload.js             Expose window.fileApi và window.api.
  renderer.js            Logic Vue, Monaco và menu.
  Api.js                 Khai báo kiểu và chú thích api cho Monaco.
  DomUtils.js            Tiện ích DOM: CSS/XPath, visibility, debounce, v.v.
  userData.js            Wrapper IPC dữ liệu người dùng phía renderer.
  Dialogs.js             Hỗ trợ hộp thoại.
  i18n.js                Khởi tạo i18n main process.
  i18n.renderer.js       Khởi tạo i18n renderer process.
  index.html             Template cửa sổ chính.
  css/                   Bootstrap và style ứng dụng.
  locales/               JSON đa ngôn ngữ.
  vendors/               Tài nguyên Vue, Bootstrap, Monaco cục bộ.
assets/
  icon.ico               Icon ứng dụng.
package.json             npm scripts, dependencies và metadata.
forge.config.js          Cấu hình Electron Forge.
webpack.*.config.js      Cấu hình Webpack.
```

## 4. Chạy và đóng gói

```bash
npm install
npm start
npm run package
npm run make
npm run publish
npm run lint
```

Script `lint` hiện chỉ là lệnh giữ chỗ.

## 5. Chức năng cửa sổ chính

- URL: nhập địa chỉ trang đích.
- Launch: mở URL, lưu cấu hình form và tải trang, nhưng chưa đặt `saForm` vào trạng thái chèn script.
- Run Script: mở URL và truyền form hiện tại cùng script trong editor sang cửa sổ kiểm thử.
- Show/Hide Settings: mở hoặc thu gọn cấu hình nâng cao.
- Open File: mở file script và nạp vào Monaco Editor.
- Save File: lưu nội dung Monaco Editor.
- Script Editor: viết JavaScript. Ở chế độ page script sẽ có đối tượng `api`; chế độ response thường và SSE dùng tham số khác nhau.

Menu hỗ trợ tạo file mới, mở file, lưu file, đổi ngôn ngữ và xem thông tin phiên bản.

## 6. Cấu hình

Form tương ứng với `config.form` và được lưu vào `.sa.config` trong thư mục người dùng.

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `url` | string | URL trang đích. |
| `script` | string | Nội dung script trong Monaco Editor. |
| `hide` | string[] | Selector cần ẩn trong chế độ page script. |
| `remove` | string[] | Selector cần xóa trong chế độ page script. |
| `requestHeaders` | string | Header request phân tách bằng dấu phẩy, đọc bằng `api.header(name, true)`. |
| `responseHeaders` | string | Header response phân tách bằng dấu phẩy, đọc bằng `api.header(name, false)`. |
| `product` | object | Cấu hình tự định nghĩa, đọc qua `api.config`. |
| `userAgent` | string | User-Agent tùy chỉnh. |
| `urlchangeEvent` | boolean | Chèn sự kiện `urlchange` bằng cách bọc `history.pushState`, `history.replaceState` và `popstate`. |
| `isPage` | boolean | Chạy như page script. |
| `scriptSelector` | string | Điều kiện CSS/XPath để chạy page script. |
| `isSSE` | boolean | Xử lý chế độ không phải page như SSE script. |
| `matchUrl` | string | URL API hoặc SSE cần khớp. |
| `proxy.method` | string | Chế độ proxy: `direct`, `fixed_servers`, `system`. |
| `proxy.server` | string | Quy tắc proxy server, ví dụ `http://127.0.0.1:7890`. |
| `proxy.bypassList` | string | Quy tắc bỏ qua proxy. |

## 7. Selector

`DomUtils.findElements` hỗ trợ CSS và XPath:

- CSS: `.button.primary`
- XPath: `xpath://div[@id="app"]`
- Parent: hậu tố `:p` hoặc `:p2`.
- Cạnh overlay: `:top`, `:right`, `:bottom`, `:left`.

## 8. Chế độ chạy script

### 8.1 Page script

Khi `isPage = true`, Run Script mở trang, `preload.js` lấy `saForm`, khởi tạo `window.api` trong trang và iframe, rồi chạy script nếu `scriptSelector` khớp. Quy tắc `hide` và `remove` được áp dụng liên tục khi DOM thay đổi.

```js
const btn = api.dom.querySelector(document, '.submit');
const value = await api.user.get('token');
```

### 8.2 Sửa response API thông thường

Khi `isPage = false` và `isSSE = false`, cửa sổ kiểm thử dùng `Fetch` interception của Chrome DevTools Protocol. Nếu URL khớp `matchUrl`, body được đọc và script phải trả về body mới:

```js
async (data, api, url) => {
  // nội dung script
}
```

### 8.3 SSE script

Khi `isPage = false` và `isSSE = true`, `EventSource` và `fetch` được bọc lại. Các chunk SSE khớp `matchUrl` được xử lý bằng:

```js
async (data) => {
  // nội dung script
}
```

### 8.4 Quy tắc khớp URL

`matchUrl` hỗ trợ `*`, `regex:<biểu thức>`, `exact:<URL đầy đủ>`, `script:<biểu thức>` và chuỗi thường để so khớp tiền tố URL.

## 9. Header

Ví dụ:

- Request: `authorization,cookie`
- Response: `content-type,set-cookie`

```js
const authorization = await api.header('authorization', true);
const contentType = await api.header('content-type', false);
```

Tên header được chuyển về chữ thường. Chỉ các header đã cấu hình và thực sự đi qua cửa sổ kiểm thử mới đọc được.

## 10. Proxy và User-Agent

Proxy của session kiểm thử có thể là `direct`, `fixed_servers` hoặc `system`. Nếu đặt `userAgent`, Run Script sẽ cập nhật User-Agent của ứng dụng và session kiểm thử.

## 11. Lưu cấu hình

```text
~/.sa.config
```

Thay đổi form và editor được tự động lưu với debounce. Nếu đã có `filePath`, nội dung script cũng được lưu vào file đó.

## 12. Ghi chú triển khai

`window.fileApi` được expose bằng `contextBridge.exposeInMainWorld('fileApi', ...)`, còn `window.api` bằng `initUserScriptApis(win)`. Iframe mới cũng được cố gắng khởi tạo. Công cụ dùng `MutationObserver`, `IntersectionObserver`, `ResizeObserver`, `resize` và `scroll`. API dữ liệu người dùng hiện dựa trên mảng trong bộ nhớ `dataList`, không phải database bền vững.

## 13. Đoạn script thường dùng

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
