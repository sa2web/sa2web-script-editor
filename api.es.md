# Documentación de la API window de preload.js

Este documento resume las API principales montadas en `window` por `src/preload.js`, según `src/preload.js`, `src/userData.js`, `src/DomUtils.js`, `src/main.js` y `src/Api.js`.

## 1. Resumen

| API | Ventana | Propósito |
| --- | --- | --- |
| `window.fileApi` | Ventana principal | Comunicación con el proceso principal: abrir/guardar archivos, lanzar la ventana de prueba, leer/guardar configuración, eventos de menú y cambio de idioma. |
| `window.api` | Ventana de prueba e iframes accesibles | API para scripts de usuario: datos de usuario, consultas y observación DOM, overlays, utilidades, encabezados request/response y configuración de producto. |

La página de prueba también puede envolver `window.EventSource`, `window.fetch` y emitir el evento personalizado `urlchange`.

## 2. `window.fileApi`

`window.fileApi` se expone mediante `contextBridge.exposeInMainWorld('fileApi', ...)` y solo se usa en la ventana principal.

| Método | Firma | Descripción |
| --- | --- | --- |
| `launch` | `launch(url: string, saForm: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Abre o reutiliza la ventana de prueba para cargar la URL. Guarda la configuración y reutiliza la ventana si ya existe. La implementación actual limpia `saForm`, por lo que normalmente solo abre la página. |
| `runScript` | `runScript(url: string, form: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Abre o reutiliza la ventana de prueba, carga la URL y pasa el formulario y el script. Aplica User-Agent y proxy si están configurados. |
| `openFile` | `Promise<{ canceled: true } \| { canceled: false, content: string, filePath: string }>` | Abre el selector de archivos y lee el contenido elegido. |
| `saveFile` | `saveFile(filePath: string \| undefined, content: string): Promise<{ canceled: true } \| { canceled: false, filePath: string }>` | Guarda texto; muestra diálogo si `filePath` está vacío. |
| `getConfig` | `Promise<object>` | Lee `~/.sa.config`. Si existe `filePath`, sincroniza su contenido con `config.form.script`. Devuelve `{}` si falta o es inválida. |
| `saveConfig` | `saveConfig(config: object): Promise<void>` | Fusiona y guarda configuración, conservando `config.language` del proceso principal. |
| `updateLanguage` | `updateLanguage(language: string): Promise<void>` | Guarda idioma, actualiza i18n, reconstruye menús y recarga la ventana principal. Ejemplos: `zh`, `en`, `vi`, `ja`, `ru`, `es`, `fr`, `in`. |

Eventos de menú: `onMenuOpenFile(callback)`, `onMenuSaveFile(callback)`, `onMenuChangeLanguage(callback)` y `onAbout(callback)` devuelven `Electron.IpcRenderer`.

## 3. `window.api`

`window.api` se monta en la ventana de prueba y en iframes accesibles.

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

`api.config` lee la configuración de producto: `api.config === saForm.product || {}`.

## 4. `api.user`

`api.user` lee y escribe datos asociados al usuario. Actualmente se respalda con un arreglo en memoria del proceso principal y no se conserva como base de datos tras reiniciar.

Parámetros opcionales comunes: `site`, `account` y `did` son booleanos con valor por defecto `false`. El proceso principal los acepta, pero aún no particiona datos realmente.

| Método | Firma | Descripción |
| --- | --- | --- |
| `put` | `put(name: string, value: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Guarda una clave y valor. |
| `get` | `get(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ value: string \| null, status: boolean }>` | Lee un valor. |
| `remove` | `remove(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Elimina un valor. |
| `incr` | `incr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Suma `step` a `Number(value)`; si no existe, crea la clave con `step`. |
| `decr` | `decr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Resta `step`; si no existe, crea la clave con `step * -1`. |
| `startsWith` | `startsWith(prefix: string, site?: boolean, account?: boolean, did?: boolean): Promise<Array<{ name: string, value: string }>>` | Busca claves que empiezan con `prefix`. |
| `countAll` | `countAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Cuenta registros con ese nombre. |
| `sumAll` | `sumAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Suma valores numéricos con ese nombre. |

## 5. `api.dom`

`api.dom` ofrece búsqueda DOM, visibilidad, listeners de conexión, listeners de tamaño y creación de overlays.

Selectores soportados: CSS (`.class-name`), XPath (`xpath://div[@id="app"]`), sufijos de padre `:p`/`:p2` y sufijos de borde `:top`, `:right`, `:bottom`, `:left`.

| Método | Firma | Descripción |
| --- | --- | --- |
| `createMutationObserver` | `createMutationObserver(ele: Element, bindStr: string, childList: boolean, subtree: boolean, attributes: boolean, characterData: boolean, fn: (mutations: MutationRecord[]) => void): MutationObserver` | Crea y cachea un `MutationObserver` en `ele[bindStr]`; el callback corre dentro de `requestAnimationFrame`. |
| `querySelector` | `querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement \| null` | Devuelve el primer elemento coincidente. |
| `querySelectorAll` | `querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[]` | Devuelve todos los elementos coincidentes. |
| `isVisible` | `isVisible(ele: HTMLElement): Promise<boolean>` | Usa `IntersectionObserver` y devuelve `entry.isIntersecting`. |
| `getVisibleRect` | `getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>` | Devuelve el rectángulo visible con `left`, `top`, `right`, `bottom`, `width`, `height`, `x`, `y`. |
| `getConnectListeners` | `getConnectListeners(): Array<{ querySelector: string; callback: (isConnected: boolean) => void; isConnected?: boolean; }>` | Devuelve listeners de conexión; puede fallar si el observador interno aún no existe. |
| `addConnectListener` | `addConnectListener(cssOrXPathSelector: string, callback: (isConnected: boolean) => void): void` | Vigila si un elemento aparece o desaparece del documento. Repetir selector actualiza el callback. |
| `removeConnectListener` | `removeConnectListener(cssOrXPathSelectors: string[]): void` | Elimina listeners de esos selectores. |
| `addResizeListener` | `addResizeListener(cssOrXPathSelector: string, bindWindowStr: string, callback: (rect: DOMRect) => void, createObserver?: boolean, delayTime?: number): ResizeObserver \| (() => void)` | Vigila tamaño y posición. Si no existe el elemento, llama con `new DOMRect(0,0,0,0)`. Por defecto: `true`, `500`. |
| `createOverlayBy` | `createOverlayBy(cssOrXPathSelector: string, bindWindowStr: string, createObserver?: boolean, delayTime?: number, fn?: (rect: DOMRectReadOnly) => void): HTMLElement` | Crea un `div` fijo que sigue el área visible del objetivo. Reutiliza `window[bindWindowStr]`. |
| `createOverlayByBorder` | `createOverlayByBorder(bindWindowStr: string, top: string \| number, right: string \| number, bottom: string \| number, left: string \| number, createObserver?: boolean, delayTime?: number): HTMLElement` | Crea un overlay desde cuatro bordes, cada uno en píxeles o selector. |

Los overlays se agregan a `document.documentElement`, pasan a `0px` si el objetivo desaparece y se actualizan con `ResizeObserver`, `resize` y `scroll`.

## 6. `api.utils`

| Método | Firma | Descripción |
| --- | --- | --- |
| `wait` | `wait(fn: () => boolean, timeoutMs: number, intervalMs?: number): Promise<void>` | Sondea hasta que `fn` sea verdadera. `intervalMs` vale `100`. Si vence, rechaza `Error("Timeout: function did not return true in time.")`. |
| `runScript` | `runScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>` | Ejecuta JavaScript en la página con `webFrame.executeJavaScript`. |

## 7. `api.header(headerName, isRequestHeader)`

```ts
header(headerName: string, isRequestHeader: boolean): Promise<string | string[] | undefined>
```

Lee encabezados registrados por la ventana de prueba. `headerName` se pasa a minúsculas; `true` lee request headers y `false` response headers. Solo se registran nombres configurados en `requestHeaders` o `responseHeaders`.

## 8. Inyección y eventos globales

- `urlchange`: si `saForm.urlchangeEvent` es verdadero y la ventana es top-level, se envuelven `pushState`, `replaceState` y `popstate`; el evento entrega `{ oldUrl, url }`.
- `window.EventSource`: en modo SSE se envuelven `addEventListener('message', fn)` y `onmessage`; si `matchUrl` coincide, el script procesa los datos y su retorno reemplaza `MessageEvent.data`.
- `window.fetch`: en modo SSE solo procesa respuestas `text/event-stream` cuya URL coincida; lee chunks, ejecuta el script, re-encodea y escribe en un `ReadableStream`.
- `postIpcMessage(type, data)`: función interna para comunicación page/preload por `window.postMessage`, usada principalmente por `doSSE` y `doReplySSE`.

## 9. Control de página

- `saForm.hide`: durante inicialización y cambios DOM, los elementos coincidentes reciben `__ignore__="true"` y `display: none`.
- `saForm.remove`: durante inicialización y cambios DOM, los elementos coincidentes se eliminan de su padre.

## 10. Tipos

Consulte `api.md` para el bloque TypeScript completo; las firmas públicas son las mismas que las listadas arriba.
