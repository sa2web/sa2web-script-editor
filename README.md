# Sa2web Script Development Tool User Manual

## 1. Project Overview

This project is a desktop script development tool built with Electron Forge, Vue, Bootstrap, and Monaco Editor. The main application window is used to edit scripts and configure the target page. The test window opens the target URL and uses `preload.js` to inject a script runtime, DOM helper APIs, user-data APIs, request/response header access, and page, SSE, or API response rewriting capabilities.

The project is suitable for:

- Writing and debugging page-enhancement scripts.
- Hiding, removing, or positioning overlays on target page elements.
- Intercepting and rewriting normal API responses.
- Intercepting and rewriting SSE stream data.
- Providing scripts with simple configuration items and user-data read/write support.

## 2. Technology Stack

- Electron 37: desktop shell, main process, renderer process, and test window.
- Electron Forge + Webpack: development, packaging, and publishing.
- Vue 3: main-window form and state management.
- Bootstrap: UI styling.
- Monaco Editor: JavaScript editor, with API type hints injected from `src/Api.js`.
- i18next: multilingual UI text.

## 3. Directory Guide

```text
src/
  main.js                Electron main process: windows, menus, IPC, proxy, request interception.
  preload.js             Preload script exposing window.fileApi and in-page window.api.
  renderer.js            Main-window renderer logic: Vue, Monaco, menu events.
  Api.js                 Source for Monaco api type declarations and comments.
  DomUtils.js            DOM utilities for CSS/XPath lookup, visibility checks, debounce, and more.
  userData.js            Renderer-side user-data IPC wrapper.
  Dialogs.js             Main-window dialog helpers.
  i18n.js                Main-process i18n initialization.
  i18n.renderer.js       Renderer-process i18n initialization.
  index.html             Main-window page template.
  css/                   Bootstrap and application styles.
  locales/               Multilingual JSON messages.
  vendors/               Local Vue, Bootstrap, and Monaco assets.
assets/
  icon.ico               Application icon.
package.json             npm scripts, dependencies, and application metadata.
forge.config.js          Electron Forge configuration.
webpack.*.config.js      Webpack configuration.
```

## 4. Start and Build

Install dependencies:

```bash
npm install
```

Start development mode:

```bash
npm start
```

Package the application:

```bash
npm run package
```

Create installers:

```bash
npm run make
```

Publish:

```bash
npm run publish
```

The current `lint` script is only a placeholder:

```bash
npm run lint
```

## 5. Main Window Features

The main window contains these primary areas:

- URL: enter the target page address.
- Launch: open the target URL. The current implementation saves the form configuration and loads the page, but does not put `saForm` into script-injection state.
- Run Script: open the target URL and pass the current form plus editor script to the test window.
- Show/Hide Settings: expand or collapse advanced configuration.
- Open File: open a script file and load its content into Monaco Editor.
- Save File: save the current Monaco Editor content.
- Script Editor: write JavaScript. In page-script mode, the `api` object is injected. Normal response mode and SSE mode run scripts with different parameters.

The menu provides:

- File / New File: clear the current script path and form script, then reload the main window.
- File / Open File: trigger file opening in the main window.
- File / Save File: trigger file saving in the main window.
- Help / Change Language: switch UI language, then reload the menu and renderer window.
- Help / About: show version information.

## 6. Configuration Fields

The main-window form maps to `config.form` and is saved in `.sa.config` under the user home directory.

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Target page URL. |
| `script` | string | Script content in Monaco Editor. |
| `hide` | string[] | Selectors of elements to hide in page-script mode. Matching elements get `display: none`. |
| `remove` | string[] | Selectors of elements to remove in page-script mode. |
| `requestHeaders` | string | Comma-separated request header names. The test window records matching request headers for `api.header(name, true)`. |
| `responseHeaders` | string | Comma-separated response header names. The test window records matching response headers for `api.header(name, false)`. |
| `product` | object | User-defined configuration, readable in page scripts through `api.config`. |
| `userAgent` | string | Custom User-Agent for the test window. |
| `urlchangeEvent` | boolean | Whether to inject the `urlchange` event. When enabled, `history.pushState`, `history.replaceState`, and `popstate` are wrapped. |
| `isPage` | boolean | Whether to run as a page script. |
| `scriptSelector` | string | Execution condition in page-script mode. The editor script runs only when this CSS/XPath selector matches an element. |
| `isSSE` | boolean | Whether non-page mode should be handled as an SSE script. |
| `matchUrl` | string | API or SSE URL to match in non-page mode. |
| `proxy.method` | string | Electron proxy mode, commonly `direct`, `fixed_servers`, or `system`. |
| `proxy.server` | string | Proxy server rule, for example `http://127.0.0.1:7890`. |
| `proxy.bypassList` | string | Proxy bypass rules. The default includes local and private network ranges. |

## 7. Selector Syntax

The tool uses `DomUtils.findElements` internally and supports CSS selectors and XPath:

- Normal CSS: `.button.primary`
- XPath: `xpath://div[@id="app"]`
- Parent selection: append `:p` to get the parent of the matched element, or `:p2` to go two levels up.
- Border direction: overlay APIs can append `:top`, `:right`, `:bottom`, or `:left` to select which edge of the target element should be used as an overlay boundary.

## 8. Script Modes

### 8.1 Page Script Mode

When `isPage = true`:

1. Click Run Script to open the target page.
2. The test-window `preload.js` obtains the current `saForm`.
3. The page and iframes initialize `window.api`.
4. If `scriptSelector` is set and the page matches it, the script runs in an isolated world.
5. `hide` and `remove` rules are continuously applied during DOM initialization and later DOM changes.

Page scripts can use:

```js
const btn = api.dom.querySelector(document, '.submit');
const value = await api.user.get('token');
```

### 8.2 Normal API Response Rewriting

When `isPage = false` and `isSSE = false`:

1. The test window enables Chrome DevTools Protocol `Fetch` interception.
2. When the response URL matches `matchUrl`, the response body is read.
3. The script is executed as:

```js
async (data, api, url) => {
  // Script content from the editor
}
```

The script should return the new response body string.

Example:

```js
const obj = JSON.parse(data);
obj.debug = true;
return JSON.stringify(obj);
```

### 8.3 SSE Script Mode

When `isPage = false` and `isSSE = true`:

1. The preload script wraps in-page `EventSource` and `fetch`.
2. If the target URL matches `matchUrl` and the data is SSE, each SSE chunk is sent back to the preload context for processing.
3. The script is executed as:

```js
async (data) => {
  // Script content from the editor
}
```

The script should return the new SSE text.

Example:

```js
return data.replace('old text', 'new text');
```

### 8.4 URL Matching Rules

`matchUrl` supports:

- `*`: match every URL.
- `regex:<expression>`: regular-expression matching, for example `regex:/api/chat`.
- `exact:<fullURL>`: exact match.
- `script:<expression>`: execute an expression with `url`, for example `script:url.includes('/api/')`.
- Normal string: checks whether the target URL starts with this string.

## 9. Request and Response Headers

In advanced settings, enter values such as:

- Request headers: `authorization,cookie`
- Response headers: `content-type,set-cookie`

The test window records matching headers when requests are sent and responses are received. Scripts read them with:

```js
const authorization = await api.header('authorization', true);
const contentType = await api.header('content-type', false);
```

Notes:

- Names are converted to lowercase before lookup.
- Electron usually represents response headers as arrays. The current implementation serializes them as JSON and parses them again before returning.
- Only headers that were configured and actually passed through the test window can be read.

## 10. Proxy and User-Agent

Proxy settings are applied to the test-window session:

- `direct`: direct connection.
- `fixed_servers`: use the configured proxy server.
- `system`: use the system proxy.

If `userAgent` is set, clicking Run Script updates the User-Agent for the application and the test-window session.

## 11. Configuration Persistence

The application saves configuration at:

```text
~/.sa.config
```

Save strategy:

- Form changes are saved automatically with debounce.
- Editor changes are saved automatically with debounce.
- If `filePath` is already bound, script content is also saved to that file.
- After opening a file, `config.filePath` stores its path.

## 12. Important Implementation Notes

- The main window exposes `window.fileApi` through `contextBridge.exposeInMainWorld('fileApi', ...)`.
- Test pages expose `window.api` through `initUserScriptApis(win)`.
- Newly added iframes attempt the same initialization.
- Element hiding/removal and script triggering depend on `MutationObserver`.
- Visibility and visible rectangles depend on `IntersectionObserver`.
- Overlay positioning depends on `ResizeObserver`, `resize`, and `scroll`.
- The user-data API is currently backed by an in-memory main-process array named `dataList`; it is not a persistent database.
- The test window modifies response CSP to allow `connect-src` to include `http://localhost:3000`; if CSP cannot be parsed, the `content-security-policy` response header is removed.

## 13. Common Script Snippets

Wait for an element:

```js
await api.utils.wait(() => !!api.dom.querySelector(document, '.target'), 10000);
```

Hide an element:

```js
const el = api.dom.querySelector(document, '.banner');
if (el) el.style.display = 'none';
```

Create an overlay that follows a target element:

```js
const overlay = api.dom.createOverlayBy('.target', '__targetOverlay__');
overlay.style.border = '2px solid red';
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '999999';
```

Listen for element connection state:

```js
api.dom.addConnectListener('.modal', (isConnected) => {
  console.log('modal connected:', isConnected);
});
```

Read and write user data:

```js
await api.user.put('lastUrl', location.href);
const ret = await api.user.get('lastUrl');
console.log(ret.value);
```
