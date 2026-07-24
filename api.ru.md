# Документация window API preload.js

Документ описывает основные API, которые `src/preload.js` монтирует в `window`, на основе `src/preload.js`, `src/userData.js`, `src/DomUtils.js`, `src/main.js` и `src/Api.js`.

## 1. Обзор

| API | Окно | Назначение |
| --- | --- | --- |
| `window.fileApi` | Главное окно | Связь с главным процессом: открыть/сохранить файлы, запустить тестовое окно, читать/сохранять конфигурацию, события меню и смена языка. |
| `window.api` | Тестовая страница и доступные iframe | API пользовательских скриптов: данные пользователя, DOM-запросы и наблюдение, оверлеи, утилиты, заголовки request/response и конфигурация продукта. |

Тестовая страница также может оборачивать `window.EventSource`, `window.fetch` и отправлять пользовательское событие `urlchange`.

## 2. `window.fileApi`

`window.fileApi` экспортируется через `contextBridge.exposeInMainWorld('fileApi', ...)` и используется только в главном окне.

| Метод | Сигнатура | Описание |
| --- | --- | --- |
| `launch` | `launch(url: string, saForm: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Открывает или переиспользует тестовое окно для загрузки URL. Конфигурация сохраняется; существующее окно используется повторно. Текущая реализация очищает `saForm`, поэтому метод обычно только открывает страницу. |
| `runScript` | `runScript(url: string, form: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Открывает или переиспользует тестовое окно, загружает URL и передает форму и скрипт. Применяет User-Agent и proxy при наличии. |
| `openFile` | `Promise<{ canceled: true } \| { canceled: false, content: string, filePath: string }>` | Открывает системный выбор файла и читает выбранный файл. |
| `saveFile` | `saveFile(filePath: string \| undefined, content: string): Promise<{ canceled: true } \| { canceled: false, filePath: string }>` | Сохраняет текст; показывает диалог, если `filePath` пуст. |
| `getConfig` | `Promise<object>` | Читает `~/.sa.config`. Если есть `filePath`, его содержимое синхронизируется в `config.form.script`. Возвращает `{}` при отсутствии или ошибке. |
| `saveConfig` | `saveConfig(config: object): Promise<void>` | Объединяет и сохраняет конфигурацию, сохраняя `config.language` главного процесса. |
| `updateLanguage` | `updateLanguage(language: string): Promise<void>` | Сохраняет язык, обновляет i18n, перестраивает меню и перезагружает главное окно. Примеры: `zh`, `en`, `vi`, `ja`, `ru`, `es`, `fr`, `in`. |

События меню: `onMenuOpenFile(callback)`, `onMenuSaveFile(callback)`, `onMenuChangeLanguage(callback)` и `onAbout(callback)` возвращают `Electron.IpcRenderer`.

## 3. `window.api`

`window.api` монтируется в тестовое окно и доступные iframe.

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

`api.config` читает конфигурацию продукта: `api.config === saForm.product || {}`.

## 4. `api.user`

`api.user` читает и записывает данные, связанные с пользователем. Сейчас данные хранятся в массиве памяти главного процесса и не сохраняются как база данных после перезапуска.

Общие необязательные параметры: `site`, `account`, `did` являются boolean со значением `false` по умолчанию. Главный процесс принимает их, но пока не делит данные на реальные разделы.

| Метод | Сигнатура | Описание |
| --- | --- | --- |
| `put` | `put(name: string, value: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Сохраняет пару ключ-значение. |
| `get` | `get(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ value: string \| null, status: boolean }>` | Читает значение. |
| `remove` | `remove(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Удаляет значение. |
| `incr` | `incr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Добавляет `step` к `Number(value)`; если ключа нет, создает его со значением `step`. |
| `decr` | `decr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Вычитает `step`; если ключа нет, создает его со значением `step * -1`. |
| `startsWith` | `startsWith(prefix: string, site?: boolean, account?: boolean, did?: boolean): Promise<Array<{ name: string, value: string }>>` | Ищет ключи, начинающиеся с `prefix`. |
| `countAll` | `countAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Считает записи с указанным именем. |
| `sumAll` | `sumAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Суммирует числовые значения записей с указанным именем. |

## 5. `api.dom`

`api.dom` предоставляет DOM-поиск, проверку видимости, слушатели подключения, слушатели размера и создание оверлеев.

Поддерживаемые селекторы: CSS (`.class-name`), XPath (`xpath://div[@id="app"]`), суффиксы родителя `:p`/`:p2`, а также суффиксы границ `:top`, `:right`, `:bottom`, `:left`.

| Метод | Сигнатура | Описание |
| --- | --- | --- |
| `createMutationObserver` | `createMutationObserver(ele: Element, bindStr: string, childList: boolean, subtree: boolean, attributes: boolean, characterData: boolean, fn: (mutations: MutationRecord[]) => void): MutationObserver` | Создает и кэширует `MutationObserver` в `ele[bindStr]`; callback выполняется внутри `requestAnimationFrame`. |
| `querySelector` | `querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement \| null` | Возвращает первый совпавший элемент. |
| `querySelectorAll` | `querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[]` | Возвращает все совпавшие элементы. |
| `isVisible` | `isVisible(ele: HTMLElement): Promise<boolean>` | Использует `IntersectionObserver` и возвращает `entry.isIntersecting`. |
| `getVisibleRect` | `getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>` | Возвращает видимый rectangle: `left`, `top`, `right`, `bottom`, `width`, `height`, `x`, `y`. |
| `getConnectListeners` | `getConnectListeners(): Array<{ querySelector: string; callback: (isConnected: boolean) => void; isConnected?: boolean; }>` | Возвращает слушатели подключения; может завершиться ошибкой, если внутренний observer еще не создан. |
| `addConnectListener` | `addConnectListener(cssOrXPathSelector: string, callback: (isConnected: boolean) => void): void` | Отслеживает появление или исчезновение элемента в документе. Повторная регистрация селектора обновляет callback. |
| `removeConnectListener` | `removeConnectListener(cssOrXPathSelectors: string[]): void` | Удаляет слушатели для указанных селекторов. |
| `addResizeListener` | `addResizeListener(cssOrXPathSelector: string, bindWindowStr: string, callback: (rect: DOMRect) => void, createObserver?: boolean, delayTime?: number): ResizeObserver \| (() => void)` | Отслеживает размер и позицию. Если элемента нет, вызывает callback с `new DOMRect(0,0,0,0)`. По умолчанию: `true`, `500`. |
| `createOverlayBy` | `createOverlayBy(cssOrXPathSelector: string, bindWindowStr: string, createObserver?: boolean, delayTime?: number, fn?: (rect: DOMRectReadOnly) => void): HTMLElement` | Создает фиксированный `div`, следующий за видимой областью цели. Переиспользует `window[bindWindowStr]`. |
| `createOverlayByBorder` | `createOverlayByBorder(bindWindowStr: string, top: string \| number, right: string \| number, bottom: string \| number, left: string \| number, createObserver?: boolean, delayTime?: number): HTMLElement` | Создает оверлей из четырех границ; каждая может быть числом пикселей или селектором. |

Оверлеи добавляются в `document.documentElement`, становятся `0px` при исчезновении цели и обновляются через `ResizeObserver`, `resize` и `scroll`.

## 6. `api.utils`

| Метод | Сигнатура | Описание |
| --- | --- | --- |
| `wait` | `wait(fn: () => boolean, timeoutMs: number, intervalMs?: number): Promise<void>` | Опрос до truthy-результата `fn`. `intervalMs` по умолчанию `100`. При timeout отклоняет `Error("Timeout: function did not return true in time.")`. |
| `runScript` | `runScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>` | Выполняет JavaScript на странице через `webFrame.executeJavaScript`. |

## 7. `api.header(headerName, isRequestHeader)`

```ts
header(headerName: string, isRequestHeader: boolean): Promise<string | string[] | undefined>
```

Читает заголовки, записанные тестовым окном. `headerName` приводится к нижнему регистру; `true` читает request headers, `false` response headers. Записываются только имена из `requestHeaders` или `responseHeaders`.

## 8. Внедрение и глобальные события

- `urlchange`: если `saForm.urlchangeEvent` истинно и окно top-level, `pushState`, `replaceState` и `popstate` оборачиваются; событие содержит `{ oldUrl, url }`.
- `window.EventSource`: в SSE-режиме оборачиваются `addEventListener('message', fn)` и `onmessage`; при совпадении `matchUrl` данные обрабатываются скриптом, а результат заменяет `MessageEvent.data`.
- `window.fetch`: в SSE-режиме обрабатываются только ответы `text/event-stream` с совпадающим URL; chunks читаются, обрабатываются скриптом, кодируются и пишутся в `ReadableStream`.
- `postIpcMessage(type, data)`: внутренняя функция связи page/preload через `window.postMessage`, в основном для `doSSE` и `doReplySSE`.

## 9. Управление страницей

- `saForm.hide`: при инициализации и изменениях DOM совпавшие элементы получают `__ignore__="true"` и `display: none`.
- `saForm.remove`: при инициализации и изменениях DOM совпавшие элементы удаляются из родителя.

## 10. Типы

Полный TypeScript-блок см. в `api.md`; публичные сигнатуры совпадают с перечисленными выше.
