# preload.js Window API Documentation

This document summarizes the main APIs mounted on `window` by `src/preload.js`, based on `src/preload.js`, `src/userData.js`, `src/DomUtils.js`, `src/main.js`, and `src/Api.js`.

## 1. API Overview

`preload.js` exposes two API groups:

| API | Window | Purpose |
| --- | --- | --- |
| `window.fileApi` | Main application window | Communicates with the main process: open/save files, launch the test window, read/save configuration, handle menu events, and switch language. |
| `window.api` | Test page window and accessible iframes | User-script API: user data, HTTP requests, DOM lookup and observation, overlays, utilities, request/response headers, and product configuration. |

The test page may also inject or wrap:

- `window.EventSource`: in SSE mode, wraps message events so scripts can rewrite SSE data.
- `window.fetch`: in SSE mode, wraps `text/event-stream` response streams so scripts can rewrite chunks.
- `urlchange`: a custom `window` event emitted when `urlchangeEvent` is enabled.

## 2. `window.fileApi`

`window.fileApi` is exposed through `contextBridge.exposeInMainWorld('fileApi', ...)` and is intended for the main application window only.

### 2.1 `fileApi.launch(url, saForm)`

Opens or reuses the test window and loads the target URL.

```ts
launch(url: string, saForm: object): Promise<{ canceled: false, status: 'success' | 'already_opened' }>
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | Target page URL. |
| `saForm` | object | Yes | Current form configuration. |

Notes:

- The main process saves `saForm` into configuration.
- If the test window already exists, it is reused and the URL is reloaded.
- The current implementation clears main-process `saForm`, so this method is normally used only to open a page, not to inject and run a script.

### 2.2 `fileApi.runScript(url, form)`

Opens or reuses the test window, loads the target URL, and passes the current form and script to the test page.

```ts
runScript(url: string, form: object): Promise<{ canceled: false, status: 'success' | 'already_opened' }>
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | Target page URL. |
| `form` | object | Yes | Current form configuration, usually containing `script`. |

It saves configuration, sets `saForm` for `window.api` initialization, updates the User-Agent if `form.userAgent` is set, and applies `form.proxy`.

### 2.3 File and Configuration APIs

| Method | Signature | Description |
| --- | --- | --- |
| `openFile()` | `Promise<{ canceled: true } \| { canceled: false, content: string, filePath: string }>` | Opens the system file picker and reads the selected file. |
| `saveFile(filePath, content)` | `Promise<{ canceled: true } \| { canceled: false, filePath: string }>` | Saves text. If `filePath` is empty, a save dialog is shown. |
| `getConfig()` | `Promise<object>` | Reads `~/.sa.config`. If `filePath` exists, the file content is synchronized into `config.form.script`. Returns `{}` if missing or invalid. |
| `saveConfig(config)` | `Promise<void>` | Merges and saves configuration. The current `config.language` in the main process is preserved. |
| `updateLanguage(language)` | `Promise<void>` | Saves the language, updates main-process i18n, rebuilds menus, and reloads the main window. Language examples: `zh`, `en`, `vi`, `ja`, `ru`, `es`, `fr`, `in`. |

### 2.4 Menu Event APIs

| Method | Description |
| --- | --- |
| `onMenuOpenFile(callback)` | Listens for the main-menu Open File event. |
| `onMenuSaveFile(callback)` | Listens for the main-menu Save File event. |
| `onMenuChangeLanguage(callback)` | Listens for the main-menu Change Language event. |
| `onAbout(callback)` | Listens for the About menu event. |

Each method returns `Electron.IpcRenderer`.

## 3. `window.api`

`window.api` is mounted on the test page window and accessible iframe windows for page scripts.

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

### 3.1 `api.config`

Reads key-value pairs maintained in the main-window Product Configuration.

```ts
config: Record<string, unknown>
```

Equivalent source:

```js
api.config === saForm.product || {}
```

## 4. `api.http`

`api.http` provides HTTP helpers for user scripts. `api.http.ajax` executes the actual request in the browser main process, so it is not restricted by the page's CORS policy.

### 4.1 `api.http.ajax(options)`

Sends an HTTP request.

```ts
ajax(options: {
  url: string;
  method?: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  dataType?: 'json' | 'text' | 'html' | 'arrayBuffer';
  contentType?: string;
  processData?: boolean;
}): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  data?: any;
  error?: string;
  timeout?: boolean;
}>
```

Parameters:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | string | - | Request URL. |
| `method` | string | `GET` | HTTP method. |
| `data` | any | - | Request data. For `GET` and `HEAD`, it is serialized into the query string. For other methods, it is written to the request body. |
| `headers` | `Record<string, string>` | `{}` | Request headers. |
| `timeout` | number | - | Timeout in milliseconds. It takes effect only when greater than `0`. |
| `dataType` | `'json' \| 'text' \| 'html' \| 'arrayBuffer'` | `json` | Response parsing mode. |
| `contentType` | string | `application/x-www-form-urlencoded; charset=UTF-8` | Request body Content-Type. |
| `processData` | boolean | `true` | Whether to automatically serialize `data`. Set to `false` to pass `data` directly as the request body. |

Return value:

| Field | Type | Description |
| --- | --- | --- |
| `ok` | boolean | `true` for HTTP 2xx responses; `false` for parsing errors, HTTP errors, timeout, abort, or network errors. |
| `status` | number | HTTP status code. `0` indicates timeout, abort, or network-level failure. |
| `statusText` | string | HTTP status text, or `timeout`, `abort`, or `error` for non-HTTP failures. |
| `data` | any | Parsed response data, present when parsing succeeds. |
| `error` | string | Error message, present for parsing failures or non-HTTP failures. |
| `timeout` | boolean | `true` when the request was aborted by the configured timeout. |

Examples:

```js
const ret = await api.http.ajax({
  url: 'https://example.com/api/profile',
  method: 'GET',
  dataType: 'json',
  timeout: 10000
});

if (ret.ok) {
  console.log(ret.data);
}
```

```js
const ret = await api.http.ajax({
  url: 'https://example.com/api/items',
  method: 'POST',
  contentType: 'application/json',
  data: { name: 'demo' }
});
```

## 5. `api.user`

`api.user` reads and writes user-related data. The current implementation is backed by an in-memory array in the main process and is not persisted as a database after restart.

All methods call the main process through IPC:

- `userData.put`
- `userData.get`
- `userData.remove`
- `userData.incr`
- `userData.decr`
- `userData.startsWith`
- `userData.countAll`
- `userData.sumAll`

Common optional parameters:

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `site` | boolean | `false` | Whether to store by site. The main process accepts the parameter but does not currently partition data. |
| `account` | boolean | `false` | Whether to store by account. Accepted but not currently partitioned. |
| `did` | boolean | `false` | Whether to store by device. Accepted but not currently partitioned. |

| Method | Signature | Description |
| --- | --- | --- |
| `put` | `put(name: string, value: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Saves a key-value pair. |
| `get` | `get(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ value: string \| null, status: boolean }>` | Reads a key-value pair. |
| `remove` | `remove(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Removes a key-value pair. |
| `incr` | `incr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Adds `step` to `Number(value)`. If the key does not exist, creates it with `step`. |
| `decr` | `decr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Subtracts `step` from `Number(value)`. If the key does not exist, creates it with `step * -1`. |
| `startsWith` | `startsWith(prefix: string, site?: boolean, account?: boolean, did?: boolean): Promise<Array<{ name: string, value: string }>>` | Finds all records whose key starts with `prefix`. |
| `countAll` | `countAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Counts records with the specified key. |
| `sumAll` | `sumAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Sums numeric values for records with the specified key. |

Example:

```js
await api.user.put('token', 'abc123');
const ret = await api.user.get('token');
console.log(ret.value);
```

## 6. `api.dom`

`api.dom` provides DOM lookup, visibility checks, connection listeners, size listeners, and overlay creation.

### 6.1 Selector Rules

Every `cssOrXPathSelector` supports:

- CSS selectors, for example `.class-name`.
- XPath selectors, for example `xpath://div[@id="app"]`.
- Parent suffixes `:p` and `:p2`, returning the parent or higher ancestor of the matched element.

Overlay-boundary methods also support `:top`, `:right`, `:bottom`, and `:left` to choose the edge of the target element.

### 6.2 DOM Method Reference

| Method | Signature | Description |
| --- | --- | --- |
| `createMutationObserver` | `createMutationObserver(ele: Element, bindStr: string, childList: boolean, subtree: boolean, attributes: boolean, characterData: boolean, fn: (mutations: MutationRecord[]) => void): MutationObserver` | Creates and caches a `MutationObserver` on `ele[bindStr]`. If already present, returns the existing observer. The callback runs inside `requestAnimationFrame`. |
| `querySelector` | `querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement \| null` | Returns the first matching element. |
| `querySelectorAll` | `querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[]` | Returns all matching elements. |
| `isVisible` | `isVisible(ele: HTMLElement): Promise<boolean>` | Uses `IntersectionObserver` and returns `entry.isIntersecting`. |
| `getVisibleRect` | `getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>` | Returns the currently visible rectangle, including `left`, `top`, `right`, `bottom`, `width`, `height`, `x`, and `y`. |
| `getConnectListeners` | `getConnectListeners(): Array<{ querySelector: string; callback: (isConnected: boolean) => void; isConnected?: boolean; }>` | Returns connection listeners. Calling before internal observer creation may fail. Usually call after `addConnectListener`, `addResizeListener`, or overlay creation. |
| `addConnectListener` | `addConnectListener(cssOrXPathSelector: string, callback: (isConnected: boolean) => void): void` | Watches whether a target element appears in or disappears from the document. Re-registering the same selector updates the callback. |
| `removeConnectListener` | `removeConnectListener(cssOrXPathSelectors: string[]): void` | Removes connection listeners for the given selectors. |
| `addResizeListener` | `addResizeListener(cssOrXPathSelector: string, bindWindowStr: string, callback: (rect: DOMRect) => void, createObserver?: boolean, delayTime?: number): ResizeObserver \| (() => void)` | Watches target size and position. Missing targets call back with `new DOMRect(0,0,0,0)`. Defaults: `createObserver = true`, `delayTime = 500`. |
| `createOverlayBy` | `createOverlayBy(cssOrXPathSelector: string, bindWindowStr: string, createObserver?: boolean, delayTime?: number, fn?: (rect: DOMRectReadOnly) => void): HTMLElement` | Creates a fixed `div` overlay that follows the visible area of a target element. Existing `window[bindWindowStr]` is reused. |
| `createOverlayByBorder` | `createOverlayByBorder(bindWindowStr: string, top: string \| number, right: string \| number, bottom: string \| number, left: string \| number, createObserver?: boolean, delayTime?: number): HTMLElement` | Creates a fixed overlay from four boundaries. Each boundary can be a pixel value or a selector, with optional edge suffixes. |

Overlay notes:

- Overlays are appended to `document.documentElement`.
- When the target disappears, width and height become `0px`.
- Position updates listen to `ResizeObserver`, `resize`, and `scroll`.

## 7. `api.utils`

### 7.1 `api.utils.wait(fn, timeoutMs, intervalMs)`

Polls until the condition function returns a truthy value.

```ts
wait(fn: () => boolean, timeoutMs: number, intervalMs?: number): Promise<void>
```

`intervalMs` defaults to `100`. Timeout rejects with `Error("Timeout: function did not return true in time.")`; errors thrown by `fn` reject directly.

### 7.2 `api.utils.runScript(code, userGesture, callback)`

Executes JavaScript in the current page.

```ts
runScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>
```

Internally calls Electron `webFrame.executeJavaScript(code, userGesture, callback)`. `userGesture` controls whether execution simulates a user gesture.

## 8. `api.header(headerName, isRequestHeader)`

Reads request or response headers recorded by the test window.

```ts
header(headerName: string, isRequestHeader: boolean): Promise<string | string[] | undefined>
```

| Parameter | Type | Description |
| --- | --- | --- |
| `headerName` | string | Request or response header name. It is converted to lowercase before lookup. |
| `isRequestHeader` | boolean | `true` reads request headers; `false` reads response headers. |

Only headers configured in the main window's `requestHeaders` or `responseHeaders` are recorded. Request headers come from `webRequest.onSendHeaders`; response headers come from `webRequest.onHeadersReceived`. Response headers are JSON-serialized in the main process and parsed by the preload script.

## 9. Injection Behavior and Global Events

### 9.1 `urlchange`

When `saForm.urlchangeEvent` is truthy and the current window is the top-level window, the preload script wraps:

- `history.pushState`
- `history.replaceState`
- `popstate`

URL changes emit:

```ts
window.addEventListener('urlchange', (event: CustomEvent<{
  oldUrl: string | null;
  url: string;
}>) => void)
```

### 9.2 `window.EventSource` Wrapper

In SSE mode, the preload script proxies `EventSource`:

- wraps `addEventListener('message', fn)`;
- wraps `onmessage = fn`;
- when `saForm.matchUrl` matches the EventSource URL, passes message data to the script;
- the text returned by the script becomes the new `MessageEvent.data`.

Script shape:

```js
async (data) => {
  // editor script content
}
```

### 9.3 `window.fetch` Wrapper

In SSE mode, the preload script proxies `fetch` responses:

- only handles responses whose `Content-Type` includes `text/event-stream`;
- only handles response URLs matching `saForm.matchUrl`;
- reads stream chunks, passes text to the script, re-encodes the returned text, and writes it back into a `ReadableStream`.

### 9.4 `postIpcMessage(type, data)`

Injected page code creates a global async `postIpcMessage` function for request/response communication between the page context and preload context through `window.postMessage`.

```ts
postIpcMessage(type: string, data: object): Promise<any>
```

It is currently used internally for SSE communication with request type `doSSE` and response type `doReplySSE`. Business scripts should not rely on this internal function.

## 10. Page Control Behavior

### 10.1 `saForm.hide`

During page-script initialization and DOM changes, matching elements are marked with `__ignore__="true"` and hidden with `display: none`.

### 10.2 `saForm.remove`

During page-script initialization and DOM changes, matching elements are removed from their parent node.

## 11. Type Summary

```ts
type UserApi = {
  put(name: string, value: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>;
  get(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ value: string | null, status: boolean }>;
  remove(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>;
  incr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number | string }>;
  decr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number | string }>;
  startsWith(prefix: string, site?: boolean, account?: boolean, did?: boolean): Promise<Array<{ name: string, value: string }>>;
  countAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>;
  sumAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>;
};

type HttpApi = {
  ajax(options: {
    url: string;
    method?: string;
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
    dataType?: 'json' | 'text' | 'html' | 'arrayBuffer';
    contentType?: string;
    processData?: boolean;
  }): Promise<{ ok: boolean, status: number, statusText: string, data?: any, error?: string, timeout?: boolean }>;
};

type DomApi = {
  createMutationObserver(ele: Element, bindStr: string, childList: boolean, subtree: boolean, attributes: boolean, characterData: boolean, fn: (mutations: MutationRecord[]) => void): MutationObserver;
  querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement | null;
  querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[];
  isVisible(ele: HTMLElement): Promise<boolean>;
  getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>;
  getConnectListeners(): Array<{ querySelector: string, callback: (isConnected: boolean) => void, isConnected?: boolean }>;
  addConnectListener(cssOrXPathSelector: string, callback: (isConnected: boolean) => void): void;
  removeConnectListener(cssOrXPathSelectors: string[]): void;
  addResizeListener(cssOrXPathSelector: string, bindWindowStr: string, callback: (rect: DOMRect) => void, createObserver?: boolean, delayTime?: number): ResizeObserver | (() => void);
  createOverlayBy(cssOrXPathSelector: string, bindWindowStr: string, createObserver?: boolean, delayTime?: number, fn?: (rect: DOMRectReadOnly) => void): HTMLElement;
  createOverlayByBorder(bindWindowStr: string, top: string | number, right: string | number, bottom: string | number, left: string | number, createObserver?: boolean, delayTime?: number): HTMLElement;
};

type UtilsApi = {
  wait(fn: () => boolean, timeoutMs: number, intervalMs?: number): Promise<void>;
  runScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>;
};
```
