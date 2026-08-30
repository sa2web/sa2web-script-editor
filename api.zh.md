# preload.js Window API 文档

本文档根据 `src/preload.js`、`src/userData.js`、`src/DomUtils.js`、`src/main.js` 和 `src/Api.js` 整理，覆盖预加载脚本挂载到 `window` 上的主要 API。

## 1. API 总览

`preload.js` 暴露两类 API：

| API | 所在窗口 | 用途 |
| --- | --- | --- |
| `window.fileApi` | 应用主窗口 | 主窗口和主进程通信：打开/保存文件、启动测试窗口、读取/保存配置、菜单事件、语言切换。 |
| `window.api` | 测试页面窗口和可访问 iframe | 用户脚本 API：用户数据、HTTP 请求、DOM 查询和观察、覆盖层、工具函数、请求/响应头读取、产品配置读取。 |

另外，测试页面中还会被注入或改写：

- `window.EventSource`：SSE 模式下包装 message 事件，允许脚本改写 SSE 数据。
- `window.fetch`：SSE 模式下包装 `text/event-stream` 响应流，允许脚本改写 chunk。
- `window` 的 `urlchange` 自定义事件：开启 `urlchangeEvent` 后触发。

## 2. `window.fileApi`

`window.fileApi` 通过 `contextBridge.exposeInMainWorld('fileApi', ...)` 暴露，只用于应用主窗口。

### 2.1 `fileApi.launch(url, saForm)`

打开或复用测试窗口加载目标 URL。

```ts
launch(url: string, saForm: object): Promise<{ canceled: false, status: 'success' | 'already_opened' }>
```

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | string | 是 | 要加载的目标页面 URL。 |
| `saForm` | object | 是 | 当前表单配置。 |

说明：

- 主进程会保存 `saForm` 到配置。
- 如果测试窗口已存在，则复用窗口并重新加载 URL。
- 当前实现中 `launch` 会将主进程的 `saForm` 置空，因此通常只用于打开页面，不用于注入并执行脚本。

示例：

```js
await window.fileApi.launch('https://example.com', form);
```

### 2.2 `fileApi.runScript(url, form)`

打开或复用测试窗口加载目标 URL，并把当前表单和脚本传给测试页面执行。

```ts
runScript(url: string, form: object): Promise<{ canceled: false, status: 'success' | 'already_opened' }>
```

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | string | 是 | 要加载的目标页面 URL。 |
| `form` | object | 是 | 当前表单配置，通常包含 `script`。 |

说明：

- 会保存配置。
- 会设置 `saForm`，使测试窗口预加载脚本能初始化 `window.api`。
- 如果配置了 `form.userAgent`，会更新 User-Agent。
- 会应用 `form.proxy` 代理配置。

示例：

```js
await window.fileApi.runScript(SaForm.url, {
  ...SaForm,
  script: editor.getValue()
});
```

### 2.3 `fileApi.openFile()`

打开系统文件选择框，并读取选中文件内容。

```ts
openFile(): Promise<
  | { canceled: true }
  | { canceled: false, content: string, filePath: string }
>
```

返回值：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `canceled` | boolean | 用户是否取消。 |
| `content` | string | 文件内容。取消时不存在。 |
| `filePath` | string | 文件路径。取消时不存在。 |

示例：

```js
const result = await window.fileApi.openFile();
if (!result.canceled) {
  editor.setValue(result.content);
}
```

### 2.4 `fileApi.saveFile(filePath, content)`

保存文件。如果未传 `filePath`，会弹出系统保存对话框。

```ts
saveFile(filePath: string | undefined, content: string): Promise<
  | { canceled: true }
  | { canceled: false, filePath: string }
>
```

参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `filePath` | string | 否 | 保存路径。为空时弹出保存对话框。 |
| `content` | string | 是 | 要写入的文本内容。 |

示例：

```js
const result = await window.fileApi.saveFile(filePath, editor.getValue());
```

### 2.5 `fileApi.getConfig()`

读取应用配置。

```ts
getConfig(): Promise<object>
```

说明：

- 配置文件位于 `~/.sa.config`。
- 如果配置中存在 `filePath`，主进程会尝试读取该文件，并把内容同步到 `config.form.script`。
- 配置不存在或解析失败时返回空对象。

示例：

```js
const config = await window.fileApi.getConfig();
```

### 2.6 `fileApi.saveConfig(config)`

保存应用配置。

```ts
saveConfig(config: object): Promise<void>
```

说明：

- 主进程会合并传入配置。
- 当前语言字段会保留主进程中已有的 `config.language`。

示例：

```js
await window.fileApi.saveConfig(config);
```

### 2.7 `fileApi.updateLanguage(language)`

更新应用语言。

```ts
updateLanguage(language: string): Promise<void>
```

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `language` | string | 语言代码，例如 `zh`、`en`、`vi`、`ja`、`ru`、`es`、`fr`、`in`。 |

说明：

- 保存语言到配置。
- 更新主进程 i18n。
- 重建菜单。
- 重载主窗口。

示例：

```js
await window.fileApi.updateLanguage('zh');
```

### 2.8 `fileApi.onMenuOpenFile(callback)`

监听主菜单“打开文件”事件。

```ts
onMenuOpenFile(callback: (event: Electron.IpcRendererEvent) => void): Electron.IpcRenderer
```

示例：

```js
window.fileApi.onMenuOpenFile(() => {
  app.openFile();
});
```

### 2.9 `fileApi.onMenuSaveFile(callback)`

监听主菜单“保存文件”事件。

```ts
onMenuSaveFile(callback: (event: Electron.IpcRendererEvent) => void): Electron.IpcRenderer
```

示例：

```js
window.fileApi.onMenuSaveFile(() => {
  app.saveFile();
});
```

### 2.10 `fileApi.onMenuChangeLanguage(callback)`

监听主菜单“切换语言”事件。

```ts
onMenuChangeLanguage(callback: (event: Electron.IpcRendererEvent) => void): Electron.IpcRenderer
```

示例：

```js
window.fileApi.onMenuChangeLanguage(async () => {
  await window.fileApi.updateLanguage('en');
});
```

### 2.11 `fileApi.onAbout(callback)`

监听主菜单“关于”事件。

```ts
onAbout(callback: (event: Electron.IpcRendererEvent) => void): Electron.IpcRenderer
```

示例：

```js
window.fileApi.onAbout(() => {
  Dialogs.openAbout('1.0.0');
});
```

## 3. `window.api`

`window.api` 挂载到测试页面窗口和可访问的 iframe 窗口上，供页面脚本使用。

类型总览：

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

读取主窗口“产品配置”中维护的键值对。

```ts
config: Record<string, unknown>
```

来源：

```js
api.config === saForm.product || {}
```

示例：

```js
const apiBase = api.config.apiBase;
```

## 4. `api.http`

`api.http` 为用户脚本提供 HTTP 请求工具。`api.http.ajax` 会在浏览器主进程中执行实际请求，因此不受页面 CORS 策略限制。

### 4.1 `api.http.ajax(options)`

发送 HTTP 请求。

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

参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | string | - | 请求 URL。 |
| `method` | string | `GET` | HTTP 请求方法。 |
| `data` | any | - | 请求数据。`GET` / `HEAD` 请求会序列化到查询字符串，其它请求会写入请求体。 |
| `headers` | `Record<string, string>` | `{}` | 请求头键值对。 |
| `timeout` | number | - | 超时时间，单位为毫秒；大于 `0` 时生效。 |
| `dataType` | `'json' \| 'text' \| 'html' \| 'arrayBuffer'` | `json` | 响应解析方式。 |
| `contentType` | string | `application/x-www-form-urlencoded; charset=UTF-8` | 请求体 Content-Type。 |
| `processData` | boolean | `true` | 是否自动序列化 `data`；设为 `false` 时会将 `data` 直接作为请求体。 |

返回值：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | HTTP 2xx 时为 `true`；解析失败、HTTP 错误、超时、中止或网络错误时为 `false`。 |
| `status` | number | HTTP 状态码。`0` 表示超时、中止或网络层错误。 |
| `statusText` | string | HTTP 状态文本；非 HTTP 失败时可能为 `timeout`、`abort` 或 `error`。 |
| `data` | any | 解析后的响应数据；解析成功时存在。 |
| `error` | string | 错误信息；解析失败或非 HTTP 失败时存在。 |
| `timeout` | boolean | 请求被超时配置中止时为 `true`。 |

示例：

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

`api.user` 用于读写用户关联数据。当前实现由主进程内存数组支撑，重启后不会作为数据库持久化。

所有方法都通过 IPC 调用主进程：

- `userData.put`
- `userData.get`
- `userData.remove`
- `userData.incr`
- `userData.decr`
- `userData.startsWith`
- `userData.countAll`
- `userData.sumAll`

通用参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `site` | boolean | `false` | 是否分站点存储。当前主进程实现接收该参数，但未实际分区。 |
| `account` | boolean | `false` | 是否分账号存储。当前主进程实现接收该参数，但未实际分区。 |
| `did` | boolean | `false` | 是否分设备存储。当前主进程实现接收该参数，但未实际分区。 |

### 5.1 `api.user.put(name, value, site, account, did)`

保存指定键值。

```ts
put(
  name: string,
  value: string,
  site?: boolean,
  account?: boolean,
  did?: boolean
): Promise<{ status: boolean }>
```

示例：

```js
await api.user.put('token', 'abc123');
```

### 5.2 `api.user.get(name, site, account, did)`

读取指定键值。

```ts
get(
  name: string,
  site?: boolean,
  account?: boolean,
  did?: boolean
): Promise<{ value: string | null, status: boolean }>
```

示例：

```js
const ret = await api.user.get('token');
console.log(ret.value);
```

### 5.3 `api.user.remove(name, site, account, did)`

删除指定键值。

```ts
remove(
  name: string,
  site?: boolean,
  account?: boolean,
  did?: boolean
): Promise<{ status: boolean }>
```

示例：

```js
await api.user.remove('token');
```

### 5.4 `api.user.incr(name, step, site, account, did)`

按步长增加指定键的数值。

```ts
incr(
  name: string,
  step?: number,
  site?: boolean,
  account?: boolean,
  did?: boolean
): Promise<{ status: boolean, value: number | string }>
```

说明：

- 如果键存在，会执行 `Number(value) + step`。
- 如果键不存在，会创建该键，值为 `step`。

示例：

```js
const ret = await api.user.incr('count', 1);
console.log(ret.value);
```

### 5.5 `api.user.decr(name, step, site, account, did)`

按步长减少指定键的数值。

```ts
decr(
  name: string,
  step?: number,
  site?: boolean,
  account?: boolean,
  did?: boolean
): Promise<{ status: boolean, value: number | string }>
```

说明：

- 如果键存在，会执行 `Number(value) - step`。
- 如果键不存在，会创建该键，值为 `step * -1`。

示例：

```js
const ret = await api.user.decr('count', 1);
console.log(ret.value);
```

### 5.6 `api.user.startsWith(prefix, site, account, did)`

查找所有键名以指定前缀开头的数据。

```ts
startsWith(
  prefix: string,
  site?: boolean,
  account?: boolean,
  did?: boolean
): Promise<Array<{ name: string, value: string }>>
```

示例：

```js
const items = await api.user.startsWith('cache:');
```

### 5.7 `api.user.countAll(name, site, account)`

统计指定键名的记录数量。

```ts
countAll(
  name: string,
  site?: boolean,
  account?: boolean
): Promise<{ value: number, status: boolean }>
```

示例：

```js
const ret = await api.user.countAll('token');
console.log(ret.value);
```

### 5.8 `api.user.sumAll(name, site, account)`

统计指定键名对应值的数值总和。

```ts
sumAll(
  name: string,
  site?: boolean,
  account?: boolean
): Promise<{ value: number, status: boolean }>
```

示例：

```js
const ret = await api.user.sumAll('score');
console.log(ret.value);
```

## 6. `api.dom`

`api.dom` 提供 DOM 查询、可见性判断、连接监听、尺寸监听和覆盖层创建能力。

### 6.1 选择器规则

所有 `cssOrXPathSelector` 均支持：

- CSS 选择器：`.class-name`
- XPath 选择器：`xpath://div[@id="app"]`
- 父级后缀：`:p`、`:p2`，表示返回匹配元素的父级或更高层父级。

覆盖层边界相关方法还支持：

- `:top`
- `:right`
- `:bottom`
- `:left`

这些后缀用于指定取目标元素的哪一条边。

### 6.2 `api.dom.createMutationObserver(ele, bindStr, childList, subtree, attributes, characterData, fn)`

创建并缓存 `MutationObserver`。

```ts
createMutationObserver(
  ele: Element,
  bindStr: string,
  childList: boolean,
  subtree: boolean,
  attributes: boolean,
  characterData: boolean,
  fn: (mutations: MutationRecord[]) => void
): MutationObserver
```

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `ele` | Element | 被观察的元素。 |
| `bindStr` | string | 缓存到 `ele[bindStr]` 的键名。已存在时直接返回已有 observer。 |
| `childList` | boolean | 是否观察子节点增删。 |
| `subtree` | boolean | 是否观察整个子树。 |
| `attributes` | boolean | 是否观察属性变化。 |
| `characterData` | boolean | 是否观察文本变化。 |
| `fn` | function | 回调函数，会在 `requestAnimationFrame` 内执行。 |

示例：

```js
api.dom.createMutationObserver(
  document.body,
  '__bodyObserver__',
  true,
  true,
  false,
  false,
  (mutations) => console.log(mutations)
);
```

### 6.3 `api.dom.querySelector(doc, cssOrXPathSelector)`

查询第一个匹配元素。

```ts
querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement | null
```

示例：

```js
const el = api.dom.querySelector(document, 'xpath://button[contains(.,"提交")]');
```

### 6.4 `api.dom.querySelectorAll(doc, cssOrXPathSelector)`

查询所有匹配元素。

```ts
querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[]
```

示例：

```js
const buttons = api.dom.querySelectorAll(document, 'button.primary');
```

### 6.5 `api.dom.isVisible(ele)`

判断元素是否处于可见交叉区域。

```ts
isVisible(ele: HTMLElement): Promise<boolean>
```

说明：

- 内部使用 `IntersectionObserver`。
- 返回的是 `entry.isIntersecting`。

示例：

```js
if (await api.dom.isVisible(el)) {
  console.log('visible');
}
```

### 6.6 `api.dom.getVisibleRect(ele)`

获取元素当前可见区域矩形。

```ts
getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>
```

返回值包含常见 `DOMRect` 字段：

| 字段 | 类型 |
| --- | --- |
| `left` / `top` / `right` / `bottom` | number |
| `width` / `height` | number |
| `x` / `y` | number |

示例：

```js
const rect = await api.dom.getVisibleRect(el);
console.log(rect.left, rect.top, rect.width, rect.height);
```

### 6.7 `api.dom.getConnectListeners()`

获取当前连接监听器列表。

```ts
getConnectListeners(): Array<{
  querySelector: string;
  callback: (isConnected: boolean) => void;
  isConnected?: boolean;
}>
```

说明：

- 如果还没有创建内部 `NodeTreeMutationObserver`，直接调用可能因为 `internalMutationObserver` 为空而报错。
- 通常应在至少调用过 `addConnectListener`、`addResizeListener` 或覆盖层创建方法后使用。

示例：

```js
api.dom.addConnectListener('.modal', () => {});
console.log(api.dom.getConnectListeners());
```

### 6.8 `api.dom.addConnectListener(cssOrXPathSelector, callback)`

监听某个目标元素是否出现在文档中或从文档中消失。

```ts
addConnectListener(
  cssOrXPathSelector: string,
  callback: (isConnected: boolean) => void
): void
```

说明：

- 内部观察 `document.body` 的节点变化。
- 如果同一选择器重复注册，会更新已有监听项的 callback。
- 回调参数 `isConnected` 为 `true` 表示出现，`false` 表示消失。

示例：

```js
api.dom.addConnectListener('.dialog', (isConnected) => {
  console.log('dialog:', isConnected);
});
```

### 6.9 `api.dom.removeConnectListener(cssOrXPathSelectors)`

移除指定选择器对应的连接监听器。

```ts
removeConnectListener(cssOrXPathSelectors: string[]): void
```

示例：

```js
api.dom.removeConnectListener(['.dialog', '.toast']);
```

### 6.10 `api.dom.addResizeListener(cssOrXPathSelector, bindWindowStr, callback, createObserver, delayTime)`

监听目标元素尺寸和位置变化。

```ts
addResizeListener(
  cssOrXPathSelector: string,
  bindWindowStr: string,
  callback: (rect: DOMRect) => void,
  createObserver?: boolean,
  delayTime?: number
): ResizeObserver | (() => void)
```

参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `cssOrXPathSelector` | string | - | 目标元素选择器。 |
| `bindWindowStr` | string | - | 绑定到 `window[bindWindowStr]` 的键名。 |
| `callback` | function | - | 目标元素矩形变化回调。元素不存在时回调 `new DOMRect(0,0,0,0)`。 |
| `createObserver` | boolean | `true` | 是否创建元素出现/消失观察器。 |
| `delayTime` | number | `500` | 目标元素连接状态变化后的延迟更新时间，单位毫秒。 |

返回值：

- 如果 `window[bindWindowStr]` 已有值，返回已有值。
- 创建 `ResizeObserver` 后返回该 observer。
- 如果没有创建 observer，则返回绑定到窗口 `resize` 和 `scroll` 的同步函数。

示例：

```js
api.dom.addResizeListener('.target', '__targetResize__', (rect) => {
  console.log(rect.width, rect.height);
});
```

### 6.11 `api.dom.createOverlayBy(cssOrXPathSelector, bindWindowStr, createObserver, delayTime, fn)`

创建一个跟随目标元素可见区域的固定定位覆盖层。

```ts
createOverlayBy(
  cssOrXPathSelector: string,
  bindWindowStr: string,
  createObserver?: boolean,
  delayTime?: number,
  fn?: (rect: DOMRectReadOnly) => void
): HTMLElement
```

参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `cssOrXPathSelector` | string | - | 目标元素选择器。 |
| `bindWindowStr` | string | - | 覆盖层绑定到 `window` 的键名。 |
| `createObserver` | boolean | `true` | 是否观察目标元素出现/消失。 |
| `delayTime` | number | `500` | 连接状态变化后的延迟更新毫秒数。 |
| `fn` | function | `() => {}` | 每次更新目标可见区域时调用。 |

说明：

- 覆盖层为 `div`，样式 `position: fixed`。
- 覆盖层会追加到 `document.documentElement`。
- 目标元素存在时，覆盖层的 `top`、`left`、`width`、`height` 会跟随目标可见区域。
- 目标元素不存在时，覆盖层宽高会变为 `0px`。
- 创建后也会监听窗口 `resize` 和 `scroll`。
- 如果 `window[bindWindowStr]` 已存在，直接返回已有覆盖层，并恢复其观察项。

示例：

```js
const overlay = api.dom.createOverlayBy('.target', '__overlay__');
overlay.style.border = '2px solid #f00';
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '999999';
```

### 6.12 `api.dom.createOverlayByBorder(bindWindowStr, top, right, bottom, left, createObserver, delayTime)`

通过四条边创建一个固定定位覆盖层。每条边可以是数字像素值，也可以是选择器。

```ts
createOverlayByBorder(
  bindWindowStr: string,
  top: string | number,
  right: string | number,
  bottom: string | number,
  left: string | number,
  createObserver?: boolean,
  delayTime?: number
): HTMLElement
```

参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `bindWindowStr` | string | - | 覆盖层绑定到 `window` 的键名。 |
| `top` | string \| number | - | 数字表示 `top` 像素；字符串表示顶部参考元素。默认取参考元素下边，可加 `:top` 改为上边。 |
| `right` | string \| number | - | 数字表示 `right` 像素；字符串表示右侧参考元素。默认取参考元素左边，可加 `:right` 改为右边。 |
| `bottom` | string \| number | - | 数字表示 `bottom` 像素；字符串表示底部参考元素。默认取参考元素上边，可加 `:bottom` 改为下边。 |
| `left` | string \| number | - | 数字表示 `left` 像素；字符串表示左侧参考元素。默认取参考元素右边，可加 `:left` 改为左边。 |
| `createObserver` | boolean | `true` | 是否观察目标元素出现/消失。 |
| `delayTime` | number | `500` | 连接状态变化后的延迟更新毫秒数。 |

说明：

- 覆盖层为 `div`，样式 `position: fixed`。
- 会根据四个边界更新 `top`、`left`、`right`、`bottom`、`width`、`height`。
- 字符串边界对应元素不存在时，相关宽高可能被置为 `0px`。
- 会对参考元素创建 `ResizeObserver`，并监听窗口 `resize` 和 `scroll`。

示例：

```js
const panel = api.dom.createOverlayByBorder(
  '__centerPanel__',
  'header:bottom',
  20,
  'footer:top',
  '.sidebar:right'
);
panel.style.background = 'rgba(0,0,0,.08)';
```

## 7. `api.utils`

### 7.1 `api.utils.wait(fn, timeoutMs, intervalMs)`

轮询等待条件函数返回真值。

```ts
wait(
  fn: () => boolean,
  timeoutMs: number,
  intervalMs?: number
): Promise<void>
```

参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fn` | function | - | 条件函数。返回真值时 Promise resolve。 |
| `timeoutMs` | number | - | 超时时间，单位毫秒。 |
| `intervalMs` | number | `100` | 轮询间隔，单位毫秒。 |

异常：

- 超时后 reject `Error("Timeout: function did not return true in time.")`。
- `fn` 抛出的错误会直接 reject。

示例：

```js
await api.utils.wait(
  () => !!api.dom.querySelector(document, '.ready'),
  10000,
  200
);
```

### 7.2 `api.utils.runScript(code, userGesture, callback)`

在当前页面执行 JavaScript 代码。

```ts
runScript(
  code: string,
  userGesture?: boolean,
  callback?: (result: any, error: Error) => void
): Promise<any>
```

说明：

- 内部调用 Electron `webFrame.executeJavaScript(code, userGesture, callback)`。
- `userGesture` 表示是否模拟用户手势执行。

示例：

```js
const title = await api.utils.runScript('document.title');
console.log(title);
```

## 8. `api.header(headerName, isRequestHeader)`

读取测试窗口记录的请求头或响应头。

```ts
header(
  headerName: string,
  isRequestHeader: boolean
): Promise<string | string[] | undefined>
```

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `headerName` | string | 请求头或响应头名称。读取时会转成小写。 |
| `isRequestHeader` | boolean | `true` 读取请求头，`false` 读取响应头。 |

说明：

- 只有在主窗口 `requestHeaders` 或 `responseHeaders` 中配置过的头才会被记录。
- 请求头来自 `webRequest.onSendHeaders`。
- 响应头来自 `webRequest.onHeadersReceived`。
- 响应头在主进程中 JSON 序列化后返回，预加载脚本会 `JSON.parse`。

示例：

```js
const cookie = await api.header('cookie', true);
const setCookie = await api.header('set-cookie', false);
```

## 9. 注入行为与全局事件

### 9.1 `urlchange` 事件

当 `saForm.urlchangeEvent` 为真，并且当前窗口是顶层窗口时，预加载脚本会包装：

- `history.pushState`
- `history.replaceState`
- `popstate`

页面 URL 变化时触发：

```ts
window.addEventListener('urlchange', (event: CustomEvent<{
  oldUrl: string | null;
  url: string;
}>) => void)
```

示例：

```js
window.addEventListener('urlchange', (event) => {
  console.log(event.detail.oldUrl, event.detail.url);
});
```

### 9.2 `window.EventSource` 包装

SSE 模式下，预加载脚本会代理 `EventSource`：

- 包装 `addEventListener('message', fn)`。
- 包装 `onmessage = fn`。
- 当 `saForm.matchUrl` 匹配 EventSource URL 时，把 message 数据交给脚本处理。
- 脚本返回的新文本会作为新的 `MessageEvent.data` 传给原监听器。

脚本执行形式：

```js
async (data) => {
  // 编辑器中的脚本内容
}
```

### 9.3 `window.fetch` 包装

SSE 模式下，预加载脚本会代理 `fetch` 返回值：

- 只处理 `Content-Type` 包含 `text/event-stream` 的响应。
- 只处理 `saForm.matchUrl` 匹配的响应 URL。
- 逐 chunk 读取流内容，把文本传给脚本处理。
- 脚本返回的新文本会重新编码并写回 `ReadableStream`。

### 9.4 `postIpcMessage(type, data)`

预加载脚本注入的页面代码中会创建一个全局异步函数 `postIpcMessage`，用于页面上下文和预加载上下文之间通过 `window.postMessage` 请求/响应。

```ts
postIpcMessage(type: string, data: object): Promise<any>
```

当前主要用于内部 SSE 通信：

- 请求类型：`doSSE`
- 响应类型：`doReplySSE`

不建议业务脚本直接依赖该内部函数。

## 10. 页面控制行为

### 10.1 `saForm.hide`

页面脚本模式初始化和 DOM 变化时，预加载脚本会遍历 `saForm.hide`：

```js
saForm.hide.forEach(selector => {
  const elements = DomUtils.findElements(win.document, selector, true);
  elements.forEach(el => {
    el.setAttribute('__ignore__', 'true');
    el.style.display = 'none';
  });
});
```

### 10.2 `saForm.remove`

页面脚本模式初始化和 DOM 变化时，预加载脚本会遍历 `saForm.remove`：

```js
saForm.remove.forEach(selector => {
  const elements = DomUtils.findElements(win.document, selector, true);
  elements.forEach(el => el.parentNode?.removeChild(el));
});
```

## 11. 类型汇总

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
  createMutationObserver(
    ele: Element,
    bindStr: string,
    childList: boolean,
    subtree: boolean,
    attributes: boolean,
    characterData: boolean,
    fn: (mutations: MutationRecord[]) => void
  ): MutationObserver;
  querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement | null;
  querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[];
  isVisible(ele: HTMLElement): Promise<boolean>;
  getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>;
  getConnectListeners(): Array<{ querySelector: string, callback: (isConnected: boolean) => void, isConnected?: boolean }>;
  addConnectListener(cssOrXPathSelector: string, callback: (isConnected: boolean) => void): void;
  removeConnectListener(cssOrXPathSelectors: string[]): void;
  addResizeListener(
    cssOrXPathSelector: string,
    bindWindowStr: string,
    callback: (rect: DOMRect) => void,
    createObserver?: boolean,
    delayTime?: number
  ): ResizeObserver | (() => void);
  createOverlayBy(
    cssOrXPathSelector: string,
    bindWindowStr: string,
    createObserver?: boolean,
    delayTime?: number,
    fn?: (rect: DOMRectReadOnly) => void
  ): HTMLElement;
  createOverlayByBorder(
    bindWindowStr: string,
    top: string | number,
    right: string | number,
    bottom: string | number,
    left: string | number,
    createObserver?: boolean,
    delayTime?: number
  ): HTMLElement;
};

type UtilsApi = {
  wait(fn: () => boolean, timeoutMs: number, intervalMs?: number): Promise<void>;
  runScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>;
};
```
