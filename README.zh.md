# Sa2web 脚本开发工具使用手册

## 1. 项目概览

本项目是一个基于 Electron Forge、Vue、Bootstrap 和 Monaco Editor 的桌面脚本开发工具。应用主窗口用于编辑脚本与配置目标页面；测试窗口用于打开目标 URL，并通过 `preload.js` 向页面注入脚本运行环境、DOM 辅助 API、用户数据 API、请求/响应头读取能力，以及页面/SSE/接口响应改写能力。

项目适合用于：

- 编写并调试页面增强脚本。
- 对目标页面元素做隐藏、删除、覆盖层定位等操作。
- 拦截并改写普通接口响应。
- 拦截并改写 SSE 流数据。
- 为脚本提供简单的配置项和用户数据读写能力。

## 2. 技术栈

- Electron 37：桌面应用外壳、主进程、渲染进程、测试窗口。
- Electron Forge + Webpack：开发、打包和发布。
- Vue 3：主窗口表单和状态管理。
- Bootstrap：界面样式。
- Monaco Editor：JavaScript 脚本编辑器，并通过 `src/Api.js` 给编辑器注入 API 类型提示。
- i18next：多语言文案。

## 3. 目录说明

```text
src/
  main.js                Electron 主进程，负责窗口、菜单、IPC、代理、请求拦截。
  preload.js             预加载脚本，暴露 window.fileApi 和页面内 window.api。
  renderer.js            主窗口渲染逻辑，初始化 Vue、Monaco、菜单事件。
  Api.js                 Monaco 中的 api 类型声明与注释来源。
  DomUtils.js            CSS/XPath 查询、可见性检测、防抖等 DOM 工具。
  userData.js            渲染侧用户数据 IPC 封装。
  Dialogs.js             主窗口弹窗辅助。
  i18n.js                主进程 i18n 初始化。
  i18n.renderer.js       渲染进程 i18n 初始化。
  index.html             主窗口页面模板。
  css/                   Bootstrap 与应用样式。
  locales/               多语言 JSON 文案。
  vendors/               本地 Vue、Bootstrap、Monaco 资源。
assets/
  icon.ico               应用图标。
package.json             npm 脚本、依赖和应用元信息。
forge.config.js          Electron Forge 配置。
webpack.*.config.js      Webpack 配置。
```

## 4. 启动与打包

安装依赖：

```bash
npm install
```

开发启动：

```bash
npm start
```

打包应用：

```bash
npm run package
```

生成安装包：

```bash
npm run make
```

发布：

```bash
npm run publish
```

当前 `lint` 脚本只是占位命令：

```bash
npm run lint
```

## 5. 主窗口功能

主窗口包含以下主要区域：

- URL 地址：填写要打开或调试的目标页面地址。
- 启动：打开目标 URL。当前实现会保存表单配置并加载页面，但不会把 `saForm` 设置为脚本注入状态。
- 运行脚本：打开目标 URL，并把当前表单和编辑器脚本传给测试窗口执行。
- 显示/隐藏设置：展开高级配置区。
- 打开文件：打开一个脚本文件，并把文件内容加载到 Monaco Editor。
- 保存文件：保存 Monaco Editor 中的脚本内容。
- 脚本编辑器：编写 JavaScript。页面脚本模式下会注入 `api` 对象；普通响应和 SSE 模式下脚本以不同参数运行。

菜单提供：

- 文件 / 创建新文件：清空当前脚本文件路径和表单脚本后重载主窗口。
- 文件 / 打开文件：触发主窗口打开文件。
- 文件 / 保存文件：触发主窗口保存文件。
- 帮助 / 切换语言：切换界面语言并重载菜单和渲染窗口。
- 帮助 / 关于：显示版本信息。

## 6. 配置项说明

主窗口表单对应 `config.form`，保存到用户主目录的 `.sa.config` 文件中。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `url` | string | 目标页面 URL。 |
| `script` | string | Monaco Editor 中的脚本内容。 |
| `hide` | string[] | 页面脚本模式下要隐藏的元素选择器列表。匹配元素会设置 `display: none`。 |
| `remove` | string[] | 页面脚本模式下要删除的元素选择器列表。 |
| `requestHeaders` | string | 逗号分隔的请求头名称。测试窗口会记录匹配名称的请求头，供 `api.header(name, true)` 读取。 |
| `responseHeaders` | string | 逗号分隔的响应头名称。测试窗口会记录匹配名称的响应头，供 `api.header(name, false)` 读取。 |
| `product` | object | 用户自定义配置。页面脚本中可通过 `api.config` 读取。 |
| `userAgent` | string | 自定义测试窗口 User-Agent。 |
| `urlchangeEvent` | boolean | 是否注入 `urlchange` 事件。开启后会包装 `history.pushState`、`history.replaceState` 和 `popstate`。 |
| `isPage` | boolean | 是否作为页面脚本运行。 |
| `scriptSelector` | string | 页面脚本模式下的执行条件。只有当该 CSS/XPath 选择器能匹配到元素时，才执行编辑器脚本。 |
| `isSSE` | boolean | 非页面模式下是否按 SSE 脚本处理。 |
| `matchUrl` | string | 非页面模式下要匹配的接口或 SSE URL。 |
| `proxy.method` | string | Electron 代理模式，常见值为 `direct`、`fixed_servers`、`system`。 |
| `proxy.server` | string | 代理服务器规则，例如 `http://127.0.0.1:7890`。 |
| `proxy.bypassList` | string | 代理绕过规则，默认包含本地与内网地址段。 |

## 7. 选择器语法

工具内部通过 `DomUtils.findElements` 同时支持 CSS 选择器和 XPath：

- 普通 CSS：`.button.primary`
- XPath：`xpath://div[@id="app"]`
- 父级选择：在选择器末尾追加 `:p` 表示取匹配元素的父元素，`:p2` 表示向上取两级父元素。
- 边界方向：覆盖层 API 中可在选择器末尾追加 `:top`、`:right`、`:bottom`、`:left`，用于指定目标元素哪条边作为覆盖层边界。

## 8. 脚本运行模式

### 8.1 页面脚本模式

当 `isPage = true` 时：

1. 点击“运行脚本”打开目标页面。
2. 测试窗口的 `preload.js` 获取当前 `saForm`。
3. 页面和 iframe 会初始化 `window.api`。
4. 如果设置了 `scriptSelector`，并且页面能匹配该选择器，脚本会通过隔离世界执行。
5. `hide` 和 `remove` 规则会在 DOM 初始化和后续变动时持续应用。

页面脚本可直接使用：

```js
const btn = api.dom.querySelector(document, '.submit');
const value = await api.user.get('token');
```

### 8.2 普通接口响应改写模式

当 `isPage = false` 且 `isSSE = false` 时：

1. 测试窗口启用 Chrome DevTools Protocol 的 `Fetch` 拦截。
2. 响应 URL 满足 `matchUrl` 时，读取响应 body。
3. 执行脚本：

```js
async (data, api, url) => {
  // 编辑器中的脚本内容
}
```

脚本应返回新的响应 body 字符串。

示例：

```js
const obj = JSON.parse(data);
obj.debug = true;
return JSON.stringify(obj);
```

### 8.3 SSE 脚本模式

当 `isPage = false` 且 `isSSE = true` 时：

1. 预加载脚本会包装页面内的 `EventSource` 和 `fetch`。
2. 当目标 URL 满足 `matchUrl` 且数据为 SSE 时，SSE chunk 会发回预加载上下文处理。
3. 执行脚本：

```js
async (data) => {
  // 编辑器中的脚本内容
}
```

脚本应返回新的 SSE 文本。

示例：

```js
return data.replace('old text', 'new text');
```

### 8.4 URL 匹配规则

`matchUrl` 支持以下形式：

- `*`：匹配全部 URL。
- `regex:<表达式>`：用正则匹配，例如 `regex:/api/chat`.
- `exact:<完整URL>`：精确匹配。
- `script:<表达式>`：传入 `url` 执行表达式，例如 `script:url.includes('/api/')`。
- 普通字符串：判断目标 URL 是否以该字符串开头。

## 9. 请求头和响应头读取

在高级设置中填写：

- 请求头：`authorization,cookie`
- 响应头：`content-type,set-cookie`

测试窗口会在请求发送和响应接收时记录对应头。脚本中读取：

```js
const authorization = await api.header('authorization', true);
const contentType = await api.header('content-type', false);
```

注意：

- 名称会转为小写后读取。
- 响应头在 Electron 中通常是数组形式；当前实现会通过 JSON 序列化后再解析返回。
- 只有已配置并且实际经过测试窗口的头才可读取。

## 10. 代理和 User-Agent

代理配置会应用到测试窗口的 session：

- `direct`：直连。
- `fixed_servers`：使用指定代理服务器。
- `system`：使用系统代理。

如果设置了 `userAgent`，点击“运行脚本”时会更新应用和测试窗口 session 的 User-Agent。

## 11. 配置持久化

应用配置保存位置：

```text
~/.sa.config
```

保存策略：

- 表单变化会通过防抖自动保存。
- 编辑器内容变化会通过防抖自动保存。
- 如果已经绑定 `filePath`，脚本内容也会保存到该文件。
- 打开文件后，`config.filePath` 会记录文件路径。

## 12. 重要实现说明

- 主窗口通过 `contextBridge.exposeInMainWorld('fileApi', ...)` 暴露 `window.fileApi`。
- 测试页面通过 `initUserScriptApis(win)` 暴露 `window.api`。
- iframe 新增时会尝试执行同样的初始化。
- 页面元素隐藏/删除和脚本触发依赖 `MutationObserver`。
- 可见性和可见区域依赖 `IntersectionObserver`。
- 覆盖层定位依赖 `ResizeObserver`、`resize` 和 `scroll` 事件。
- 用户数据 API 当前由主进程内存数组 `dataList` 支撑，不是持久化数据库。
- 测试窗口会修改响应 CSP，允许 `connect-src` 增加 `http://localhost:3000`；没有可解析 CSP 时会删除 `content-security-policy` 响应头。

## 13. 常见脚本片段

等待元素出现：

```js
await api.utils.wait(() => !!api.dom.querySelector(document, '.target'), 10000);
```

隐藏元素：

```js
const el = api.dom.querySelector(document, '.banner');
if (el) el.style.display = 'none';
```

创建跟随目标元素的覆盖层：

```js
const overlay = api.dom.createOverlayBy('.target', '__targetOverlay__');
overlay.style.border = '2px solid red';
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '999999';
```

监听元素连接状态：

```js
api.dom.addConnectListener('.modal', (isConnected) => {
  console.log('modal connected:', isConnected);
});
```

读写用户数据：

```js
await api.user.put('lastUrl', location.href);
const ret = await api.user.get('lastUrl');
console.log(ret.value);
```
