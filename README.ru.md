# Руководство по инструменту разработки скриптов Sa2web

## 1. Обзор проекта

Проект представляет собой настольный инструмент для разработки скриптов на базе Electron Forge, Vue, Bootstrap и Monaco Editor. Главное окно используется для редактирования скриптов и настройки целевой страницы. Тестовое окно открывает целевой URL и через `preload.js` внедряет среду выполнения скриптов, вспомогательные DOM API, API пользовательских данных, чтение заголовков запросов/ответов, а также возможности изменения страниц, SSE-потоков и API-ответов.

Подходит для:

- написания и отладки скриптов улучшения страниц;
- скрытия, удаления и позиционирования оверлеев на элементах страницы;
- перехвата и изменения обычных API-ответов;
- перехвата и изменения данных SSE-потоков;
- предоставления скриптам простой конфигурации и доступа к пользовательским данным.

## 2. Технологии

- Electron 37: настольная оболочка, главный процесс, renderer process и тестовое окно.
- Electron Forge + Webpack: разработка, упаковка и публикация.
- Vue 3: форма и состояние главного окна.
- Bootstrap: стили интерфейса.
- Monaco Editor: JavaScript-редактор с подсказками типов из `src/Api.js`.
- i18next: многоязычные тексты.

## 3. Структура каталогов

```text
src/
  main.js                Главный процесс: окна, меню, IPC, прокси, перехват запросов.
  preload.js             Экспортирует window.fileApi и window.api.
  renderer.js            Логика Vue, Monaco и событий меню.
  Api.js                 Типы и комментарии api для Monaco.
  DomUtils.js            DOM-утилиты: CSS/XPath, видимость, debounce и т. д.
  userData.js            IPC-обертка пользовательских данных.
  Dialogs.js             Помощники диалогов.
  i18n.js                Инициализация i18n главного процесса.
  i18n.renderer.js       Инициализация i18n renderer process.
  index.html             Шаблон главного окна.
  css/                   Bootstrap и стили приложения.
  locales/               Многоязычные JSON-сообщения.
  vendors/               Локальные ресурсы Vue, Bootstrap и Monaco.
assets/
  icon.ico               Иконка приложения.
package.json             npm scripts, зависимости и метаданные.
forge.config.js          Конфигурация Electron Forge.
webpack.*.config.js      Конфигурация Webpack.
```

## 4. Запуск и сборка

```bash
npm install
npm start
npm run package
npm run make
npm run publish
npm run lint
```

Текущий `lint` является только командой-заглушкой.

## 5. Возможности главного окна

- URL: адрес целевой страницы.
- Launch: открывает URL, сохраняет форму и загружает страницу, но не переводит `saForm` в состояние внедрения скрипта.
- Run Script: открывает URL и передает текущую форму и скрипт редактора в тестовое окно.
- Show/Hide Settings: показывает или скрывает расширенные настройки.
- Open File: открывает файл скрипта в Monaco Editor.
- Save File: сохраняет содержимое редактора.
- Script Editor: редактирование JavaScript. В режиме page script внедряется объект `api`; режимы обычного ответа и SSE используют разные параметры.

Меню позволяет создать новый файл, открыть файл, сохранить файл, сменить язык и посмотреть информацию о версии.

## 6. Конфигурация

Форма соответствует `config.form` и сохраняется в `.sa.config` в домашнем каталоге пользователя.

| Поле | Тип | Описание |
| --- | --- | --- |
| `url` | string | URL целевой страницы. |
| `script` | string | Скрипт в Monaco Editor. |
| `hide` | string[] | Селекторы, скрываемые в режиме page script. |
| `remove` | string[] | Селекторы, удаляемые в режиме page script. |
| `requestHeaders` | string | Заголовки запроса через запятую, читаются через `api.header(name, true)`. |
| `responseHeaders` | string | Заголовки ответа через запятую, читаются через `api.header(name, false)`. |
| `product` | object | Пользовательская конфигурация, доступная через `api.config`. |
| `userAgent` | string | Пользовательский User-Agent. |
| `urlchangeEvent` | boolean | Внедряет событие `urlchange`, оборачивая `history.pushState`, `history.replaceState` и `popstate`. |
| `isPage` | boolean | Запуск как page script. |
| `scriptSelector` | string | CSS/XPath-условие запуска page script. |
| `isSSE` | boolean | Обрабатывать непостраничный режим как SSE script. |
| `matchUrl` | string | URL API или SSE для сопоставления. |
| `proxy.method` | string | Режим прокси: `direct`, `fixed_servers` или `system`. |
| `proxy.server` | string | Правило proxy server, например `http://127.0.0.1:7890`. |
| `proxy.bypassList` | string | Правила обхода прокси. |

## 7. Селекторы

`DomUtils.findElements` поддерживает CSS и XPath:

- CSS: `.button.primary`
- XPath: `xpath://div[@id="app"]`
- Родитель: суффиксы `:p` и `:p2`.
- Граница оверлея: `:top`, `:right`, `:bottom`, `:left`.

## 8. Режимы скриптов

### 8.1 Page script

При `isPage = true` команда Run Script открывает страницу, `preload.js` читает `saForm`, инициализирует `window.api` в странице и iframe, затем запускает скрипт при совпадении `scriptSelector`. Правила `hide` и `remove` применяются постоянно при изменениях DOM.

```js
const btn = api.dom.querySelector(document, '.submit');
const value = await api.user.get('token');
```

### 8.2 Изменение обычного API-ответа

При `isPage = false` и `isSSE = false` тестовое окно использует перехват `Fetch` из Chrome DevTools Protocol. Если URL совпадает с `matchUrl`, тело читается, а скрипт должен вернуть новое тело:

```js
async (data, api, url) => {
  // содержимое скрипта
}
```

### 8.3 SSE script

При `isPage = false` и `isSSE = true` оборачиваются `EventSource` и `fetch`. Совпадающие SSE chunks обрабатываются так:

```js
async (data) => {
  // содержимое скрипта
}
```

### 8.4 Правила сопоставления URL

`matchUrl` поддерживает `*`, `regex:<выражение>`, `exact:<полный URL>`, `script:<выражение>` и обычную строку для проверки префикса URL.

## 9. Заголовки

Примеры:

- Request: `authorization,cookie`
- Response: `content-type,set-cookie`

```js
const authorization = await api.header('authorization', true);
const contentType = await api.header('content-type', false);
```

Имена приводятся к нижнему регистру. Читать можно только настроенные заголовки, которые действительно прошли через тестовое окно.

## 10. Proxy и User-Agent

Прокси тестовой session может быть `direct`, `fixed_servers` или `system`. Если указан `userAgent`, Run Script обновляет User-Agent приложения и тестовой session.

## 11. Сохранение конфигурации

```text
~/.sa.config
```

Изменения формы и редактора автоматически сохраняются с debounce. Если привязан `filePath`, содержимое скрипта также сохраняется в этот файл.

## 12. Примечания реализации

`window.fileApi` экспортируется через `contextBridge.exposeInMainWorld('fileApi', ...)`, а `window.api` через `initUserScriptApis(win)`. Новые iframe также пытаются инициализироваться. Используются `MutationObserver`, `IntersectionObserver`, `ResizeObserver`, `resize` и `scroll`. API пользовательских данных сейчас основан на массиве в памяти `dataList`, а не на постоянной базе данных.

## 13. Частые фрагменты

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
