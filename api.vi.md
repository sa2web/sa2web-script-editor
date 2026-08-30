# Tài liệu API window của preload.js

Tài liệu này tóm tắt các API chính được `src/preload.js` gắn lên `window`, dựa trên `src/preload.js`, `src/userData.js`, `src/DomUtils.js`, `src/main.js` và `src/Api.js`.

## 1. Tổng quan

| API | Cửa sổ | Mục đích |
| --- | --- | --- |
| `window.fileApi` | Cửa sổ chính | Giao tiếp với main process: mở/lưu file, mở cửa sổ kiểm thử, đọc/lưu cấu hình, xử lý menu và đổi ngôn ngữ. |
| `window.api` | Cửa sổ trang kiểm thử và iframe truy cập được | API cho user script: dữ liệu người dùng, HTTP request, truy vấn và quan sát DOM, overlay, tiện ích, header request/response và cấu hình sản phẩm. |

Trang kiểm thử cũng có thể bọc `window.EventSource`, `window.fetch` và phát sự kiện tùy chỉnh `urlchange`.

## 2. `window.fileApi`

`window.fileApi` được expose bằng `contextBridge.exposeInMainWorld('fileApi', ...)` và chỉ dùng trong cửa sổ chính.

| Phương thức | Chữ ký | Mô tả |
| --- | --- | --- |
| `launch` | `launch(url: string, saForm: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Mở hoặc dùng lại cửa sổ kiểm thử để tải URL. Cấu hình được lưu; nếu cửa sổ đã tồn tại thì dùng lại. Hiện tại `saForm` bị làm rỗng, nên thường chỉ dùng để mở trang. |
| `runScript` | `runScript(url: string, form: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Mở hoặc dùng lại cửa sổ kiểm thử, tải URL và truyền form cùng script để chạy. Áp dụng User-Agent và proxy nếu có. |
| `openFile` | `Promise<{ canceled: true } \| { canceled: false, content: string, filePath: string }>` | Mở hộp chọn file và đọc nội dung file đã chọn. |
| `saveFile` | `saveFile(filePath: string \| undefined, content: string): Promise<{ canceled: true } \| { canceled: false, filePath: string }>` | Lưu văn bản; hiện hộp thoại lưu nếu `filePath` rỗng. |
| `getConfig` | `Promise<object>` | Đọc `~/.sa.config`. Nếu có `filePath`, nội dung file được đồng bộ vào `config.form.script`. Trả `{}` nếu thiếu hoặc lỗi. |
| `saveConfig` | `saveConfig(config: object): Promise<void>` | Gộp và lưu cấu hình, giữ nguyên `config.language` trong main process. |
| `updateLanguage` | `updateLanguage(language: string): Promise<void>` | Lưu ngôn ngữ, cập nhật i18n, dựng lại menu và tải lại cửa sổ chính. Ví dụ: `zh`, `en`, `vi`, `ja`, `ru`, `es`, `fr`, `in`. |

Sự kiện menu: `onMenuOpenFile(callback)`, `onMenuSaveFile(callback)`, `onMenuChangeLanguage(callback)` và `onAbout(callback)` trả về `Electron.IpcRenderer`.

## 3. `window.api`

`window.api` được gắn vào cửa sổ kiểm thử và iframe truy cập được.

```ts
interface Window {
  api: {
    user: UserApi;
    http: HttpApi;
    config: Record<string, unknown>;
    dom: DomApi;
    utils: UtilsApi;
    header(headerName: string, isRequestHeader: boolean): Promise<string | string[] | undefined>;
  };
}
```

`api.config` đọc cấu hình sản phẩm: `api.config === saForm.product || {}`.

## 4. `api.http`

`api.http` cung cấp công cụ HTTP request cho user script. `api.http.ajax` thực thi request thực tế trong browser main process, nên không bị giới hạn bởi chính sách CORS của trang.

| Phương thức | Chữ ký | Mô tả |
| --- | --- | --- |
| `ajax` | `ajax(options: { url: string; method?: string; data?: any; headers?: Record<string, string>; timeout?: number; dataType?: 'json' \| 'text' \| 'html' \| 'arrayBuffer'; contentType?: string; processData?: boolean }): Promise<{ ok: boolean, status: number, statusText: string, data?: any, error?: string, timeout?: boolean }>` | Gửi HTTP request. `method` mặc định `GET`; `dataType` mặc định `json`; `contentType` mặc định `application/x-www-form-urlencoded; charset=UTF-8`; `processData` mặc định `true`. Dữ liệu `GET`/`HEAD` được serialize vào query string, các request khác ghi vào body. |

Kết quả gồm `ok`, `status`, `statusText`. `data` là response đã parse khi có thể, `error` là thông báo lỗi, và `timeout` là `true` nếu request bị hủy do timeout.

## 5. `api.user`

`api.user` đọc và ghi dữ liệu liên quan đến người dùng. Hiện tại dữ liệu nằm trong mảng bộ nhớ của main process và không được lưu bền vững như database sau khi khởi động lại.

Tham số tùy chọn chung: `site`, `account`, `did` là boolean, mặc định `false`. Main process nhận các tham số này nhưng chưa phân vùng dữ liệu thực sự.

| Phương thức | Chữ ký | Mô tả |
| --- | --- | --- |
| `put` | `put(name: string, value: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Lưu cặp key-value. |
| `get` | `get(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ value: string \| null, status: boolean }>` | Đọc giá trị. |
| `remove` | `remove(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Xóa giá trị. |
| `incr` | `incr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Cộng `step` vào `Number(value)`; nếu key chưa có, tạo với giá trị `step`. |
| `decr` | `decr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Trừ `step`; nếu key chưa có, tạo với `step * -1`. |
| `startsWith` | `startsWith(prefix: string, site?: boolean, account?: boolean, did?: boolean): Promise<Array<{ name: string, value: string }>>` | Tìm các key bắt đầu bằng `prefix`. |
| `countAll` | `countAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Đếm bản ghi có tên này. |
| `sumAll` | `sumAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Tính tổng giá trị số của các bản ghi có tên này. |

## 6. `api.dom`

`api.dom` cung cấp truy vấn DOM, kiểm tra visibility, listener kết nối, listener kích thước và tạo overlay.

Selector hỗ trợ: CSS (`.class-name`), XPath (`xpath://div[@id="app"]`), hậu tố parent `:p`/`:p2`, và hậu tố cạnh `:top`, `:right`, `:bottom`, `:left`.

| Phương thức | Chữ ký | Mô tả |
| --- | --- | --- |
| `createMutationObserver` | `createMutationObserver(ele: Element, bindStr: string, childList: boolean, subtree: boolean, attributes: boolean, characterData: boolean, fn: (mutations: MutationRecord[]) => void): MutationObserver` | Tạo và cache `MutationObserver` vào `ele[bindStr]`; callback chạy trong `requestAnimationFrame`. |
| `querySelector` | `querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement \| null` | Trả về phần tử khớp đầu tiên. |
| `querySelectorAll` | `querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[]` | Trả về tất cả phần tử khớp. |
| `isVisible` | `isVisible(ele: HTMLElement): Promise<boolean>` | Dùng `IntersectionObserver`, trả `entry.isIntersecting`. |
| `getVisibleRect` | `getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>` | Trả về rect đang nhìn thấy gồm `left`, `top`, `right`, `bottom`, `width`, `height`, `x`, `y`. |
| `getConnectListeners` | `getConnectListeners(): Array<{ querySelector: string; callback: (isConnected: boolean) => void; isConnected?: boolean; }>` | Trả về listener kết nối; có thể lỗi nếu observer nội bộ chưa tạo. |
| `addConnectListener` | `addConnectListener(cssOrXPathSelector: string, callback: (isConnected: boolean) => void): void` | Theo dõi phần tử xuất hiện hoặc biến mất khỏi document. Đăng ký lại cùng selector sẽ cập nhật callback. |
| `removeConnectListener` | `removeConnectListener(cssOrXPathSelectors: string[]): void` | Xóa listener của các selector. |
| `addResizeListener` | `addResizeListener(cssOrXPathSelector: string, bindWindowStr: string, callback: (rect: DOMRect) => void, createObserver?: boolean, delayTime?: number): ResizeObserver \| (() => void)` | Theo dõi kích thước và vị trí. Nếu không có phần tử, gọi callback với `new DOMRect(0,0,0,0)`. Mặc định: `true`, `500`. |
| `createOverlayBy` | `createOverlayBy(cssOrXPathSelector: string, bindWindowStr: string, createObserver?: boolean, delayTime?: number, fn?: (rect: DOMRectReadOnly) => void): HTMLElement` | Tạo `div` fixed đi theo vùng nhìn thấy của target. Dùng lại `window[bindWindowStr]` nếu có. |
| `createOverlayByBorder` | `createOverlayByBorder(bindWindowStr: string, top: string \| number, right: string \| number, bottom: string \| number, left: string \| number, createObserver?: boolean, delayTime?: number): HTMLElement` | Tạo overlay từ bốn cạnh; mỗi cạnh là pixel hoặc selector. |

Overlay được thêm vào `document.documentElement`, đổi kích thước thành `0px` khi target biến mất, và cập nhật qua `ResizeObserver`, `resize`, `scroll`.

## 7. `api.utils`

| Phương thức | Chữ ký | Mô tả |
| --- | --- | --- |
| `wait` | `wait(fn: () => boolean, timeoutMs: number, intervalMs?: number): Promise<void>` | Poll đến khi `fn` trả truthy. `intervalMs` mặc định `100`. Timeout reject `Error("Timeout: function did not return true in time.")`. |
| `runScript` | `runScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>` | Chạy JavaScript trong trang bằng `webFrame.executeJavaScript`. |

## 8. `api.header(headerName, isRequestHeader)`

```ts
header(headerName: string, isRequestHeader: boolean): Promise<string | string[] | undefined>
```

Đọc header đã được cửa sổ kiểm thử ghi lại. `headerName` được chuyển về chữ thường; `true` đọc request header, `false` đọc response header. Chỉ những header khai báo trong `requestHeaders` hoặc `responseHeaders` mới được ghi.

## 9. Injection và sự kiện toàn cục

- `urlchange`: nếu `saForm.urlchangeEvent` là true và cửa sổ là top-level, `pushState`, `replaceState`, `popstate` được bọc; event chứa `{ oldUrl, url }`.
- `window.EventSource`: trong chế độ SSE, bọc `addEventListener('message', fn)` và `onmessage`; khi `matchUrl` khớp, dữ liệu message được đưa cho script và kết quả thay thế `MessageEvent.data`.
- `window.fetch`: trong chế độ SSE, chỉ xử lý response `text/event-stream` có URL khớp; đọc chunk, chạy script, encode lại và ghi vào `ReadableStream`.
- `postIpcMessage(type, data)`: hàm nội bộ để giao tiếp page/preload qua `window.postMessage`, chủ yếu dùng cho `doSSE` và `doReplySSE`.

## 10. Điều khiển trang

- `saForm.hide`: khi khởi tạo và khi DOM thay đổi, phần tử khớp nhận `__ignore__="true"` và `display: none`.
- `saForm.remove`: khi khởi tạo và khi DOM thay đổi, phần tử khớp bị xóa khỏi parent.

## 11. Kiểu

Xem `api.md` để có block TypeScript đầy đủ; các chữ ký public giống như đã liệt kê ở trên.
