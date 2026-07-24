# Manual de uso de la herramienta de desarrollo de scripts Sa2web

## 1. Descripción del proyecto

Este proyecto es una herramienta de escritorio para desarrollar scripts, basada en Electron Forge, Vue, Bootstrap y Monaco Editor. La ventana principal sirve para editar scripts y configurar la página objetivo. La ventana de prueba abre la URL objetivo y usa `preload.js` para inyectar el entorno de ejecución, API auxiliares de DOM, API de datos de usuario, lectura de encabezados de solicitud/respuesta y capacidades para reescribir páginas, flujos SSE o respuestas de API.

Es útil para:

- escribir y depurar scripts de mejora de páginas;
- ocultar, eliminar o posicionar superposiciones sobre elementos de la página;
- interceptar y reescribir respuestas normales de API;
- interceptar y reescribir datos de flujos SSE;
- ofrecer a los scripts configuración sencilla y lectura/escritura de datos de usuario.

## 2. Tecnologías

- Electron 37: contenedor de escritorio, proceso principal, proceso de renderizado y ventana de prueba.
- Electron Forge + Webpack: desarrollo, empaquetado y publicación.
- Vue 3: formulario y estado de la ventana principal.
- Bootstrap: estilos de interfaz.
- Monaco Editor: editor JavaScript con ayudas de tipos desde `src/Api.js`.
- i18next: textos multilingües.

## 3. Estructura

```text
src/
  main.js                Proceso principal: ventanas, menús, IPC, proxy e interceptación.
  preload.js             Expone window.fileApi y window.api.
  renderer.js            Lógica de Vue, Monaco y eventos de menú.
  Api.js                 Tipos y comentarios api para Monaco.
  DomUtils.js            Utilidades DOM: CSS/XPath, visibilidad, debounce, etc.
  userData.js            Envoltorio IPC de datos de usuario.
  Dialogs.js             Ayudas para diálogos.
  i18n.js                i18n del proceso principal.
  i18n.renderer.js       i18n del proceso de renderizado.
  index.html             Plantilla de la ventana principal.
  css/                   Bootstrap y estilos de la app.
  locales/               Mensajes JSON multilingües.
  vendors/               Recursos locales de Vue, Bootstrap y Monaco.
assets/
  icon.ico               Icono de la aplicación.
package.json             Scripts npm, dependencias y metadatos.
forge.config.js          Configuración de Electron Forge.
webpack.*.config.js      Configuración de Webpack.
```

## 4. Inicio y compilación

```bash
npm install
npm start
npm run package
npm run make
npm run publish
npm run lint
```

El script `lint` actual es solo un marcador de posición.

## 5. Funciones de la ventana principal

- URL: dirección de la página objetivo.
- Launch: abre la URL, guarda el formulario y carga la página, pero no activa el estado de inyección de scripts en `saForm`.
- Run Script: abre la URL y pasa el formulario actual y el script del editor a la ventana de prueba.
- Show/Hide Settings: muestra u oculta la configuración avanzada.
- Open File: abre un archivo de script en Monaco Editor.
- Save File: guarda el contenido del editor.
- Script Editor: permite escribir JavaScript. En modo script de página se inyecta `api`; los modos de respuesta normal y SSE usan parámetros distintos.

El menú permite crear un archivo nuevo, abrir, guardar, cambiar idioma y ver la información de versión.

## 6. Configuración

El formulario corresponde a `config.form` y se guarda en `.sa.config` en el directorio del usuario.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `url` | string | URL de la página objetivo. |
| `script` | string | Script en Monaco Editor. |
| `hide` | string[] | Selectores que se ocultan en modo script de página. |
| `remove` | string[] | Selectores que se eliminan en modo script de página. |
| `requestHeaders` | string | Encabezados de solicitud separados por comas, leídos con `api.header(name, true)`. |
| `responseHeaders` | string | Encabezados de respuesta separados por comas, leídos con `api.header(name, false)`. |
| `product` | object | Configuración personalizada accesible mediante `api.config`. |
| `userAgent` | string | User-Agent personalizado. |
| `urlchangeEvent` | boolean | Inyecta el evento `urlchange` envolviendo `history.pushState`, `history.replaceState` y `popstate`. |
| `isPage` | boolean | Ejecuta como script de página. |
| `scriptSelector` | string | Condición CSS/XPath para ejecutar el script de página. |
| `isSSE` | boolean | Trata el modo no página como script SSE. |
| `matchUrl` | string | URL de API o SSE que debe coincidir. |
| `proxy.method` | string | Modo proxy: `direct`, `fixed_servers` o `system`. |
| `proxy.server` | string | Regla de servidor proxy, por ejemplo `http://127.0.0.1:7890`. |
| `proxy.bypassList` | string | Reglas de omisión de proxy. |

## 7. Selectores

`DomUtils.findElements` admite CSS y XPath:

- CSS: `.button.primary`
- XPath: `xpath://div[@id="app"]`
- Padre: sufijos `:p` y `:p2`.
- Borde: `:top`, `:right`, `:bottom`, `:left` para API de superposición.

## 8. Modos de script

### 8.1 Script de página

Con `isPage = true`, Run Script abre la página, `preload.js` lee `saForm`, inicializa `window.api` en la página y los iframes, y ejecuta el script si `scriptSelector` coincide. Las reglas `hide` y `remove` se aplican continuamente.

```js
const btn = api.dom.querySelector(document, '.submit');
const value = await api.user.get('token');
```

### 8.2 Reescritura de respuestas normales

Con `isPage = false` e `isSSE = false`, se usa la interceptación `Fetch` de Chrome DevTools Protocol. Si la URL coincide con `matchUrl`, se lee el cuerpo y el script debe devolver el nuevo cuerpo:

```js
async (data, api, url) => {
  // contenido del script
}
```

### 8.3 Script SSE

Con `isPage = false` e `isSSE = true`, se envuelven `EventSource` y `fetch`. Los chunks SSE coincidentes se procesan con:

```js
async (data) => {
  // contenido del script
}
```

### 8.4 Reglas de coincidencia

`matchUrl` admite `*`, `regex:<expresión>`, `exact:<URL completa>`, `script:<expresión>` y cadenas normales que comparan el prefijo de la URL.

## 9. Encabezados

Ejemplos:

- Solicitud: `authorization,cookie`
- Respuesta: `content-type,set-cookie`

```js
const authorization = await api.header('authorization', true);
const contentType = await api.header('content-type', false);
```

Los nombres se convierten a minúsculas. Solo se pueden leer encabezados configurados que hayan pasado por la ventana de prueba.

## 10. Proxy y User-Agent

El proxy de la sesión de prueba puede ser `direct`, `fixed_servers` o `system`. Si se define `userAgent`, Run Script actualiza el User-Agent de la aplicación y de la sesión de prueba.

## 11. Persistencia

La configuración se guarda en:

```text
~/.sa.config
```

Los cambios del formulario y del editor se guardan con debounce. Si `filePath` está vinculado, el script también se guarda en ese archivo.

## 12. Notas de implementación

`window.fileApi` se expone mediante `contextBridge.exposeInMainWorld('fileApi', ...)` y `window.api` mediante `initUserScriptApis(win)`. Los iframes nuevos intentan la misma inicialización. Se usan `MutationObserver`, `IntersectionObserver`, `ResizeObserver`, `resize` y `scroll`. La API de datos de usuario se basa actualmente en el arreglo en memoria `dataList`, no en una base persistente.

## 13. Fragmentos comunes

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
