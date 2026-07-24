# Documentation de l'API window de preload.js

Ce document résume les API principales montées sur `window` par `src/preload.js`, d'après `src/preload.js`, `src/userData.js`, `src/DomUtils.js`, `src/main.js` et `src/Api.js`.

## 1. Vue d'ensemble

| API | Fenêtre | Rôle |
| --- | --- | --- |
| `window.fileApi` | Fenêtre principale | Communication avec le processus principal : ouvrir/enregistrer des fichiers, lancer la fenêtre de test, lire/enregistrer la configuration, recevoir les événements de menu et changer de langue. |
| `window.api` | Fenêtre de test et iframes accessibles | API de script utilisateur : données utilisateur, requêtes et observations DOM, overlays, utilitaires, en-têtes request/response et configuration produit. |

La page de test peut aussi injecter ou modifier `window.EventSource`, `window.fetch` et l'événement personnalisé `urlchange`.

## 2. `window.fileApi`

`window.fileApi` est exposé par `contextBridge.exposeInMainWorld('fileApi', ...)` et s'utilise uniquement dans la fenêtre principale.

| Méthode | Signature | Description |
| --- | --- | --- |
| `launch` | `launch(url: string, saForm: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Ouvre ou réutilise la fenêtre de test pour charger l'URL cible. La configuration est sauvegardée ; si la fenêtre existe déjà, elle est réutilisée. L'implémentation actuelle vide `saForm`, donc cette méthode sert surtout à ouvrir une page. |
| `runScript` | `runScript(url: string, form: object): Promise<{ canceled: false, status: 'success' \| 'already_opened' }>` | Ouvre ou réutilise la fenêtre de test, charge l'URL et transmet le formulaire et le script pour exécution. Met à jour le User-Agent et le proxy si configurés. |
| `openFile` | `Promise<{ canceled: true } \| { canceled: false, content: string, filePath: string }>` | Ouvre le sélecteur de fichiers système et lit le contenu choisi. |
| `saveFile` | `saveFile(filePath: string \| undefined, content: string): Promise<{ canceled: true } \| { canceled: false, filePath: string }>` | Enregistre le texte ; affiche un dialogue si `filePath` est vide. |
| `getConfig` | `Promise<object>` | Lit `~/.sa.config`. Si `filePath` existe, son contenu est synchronisé dans `config.form.script`. Retourne `{}` si la configuration est absente ou invalide. |
| `saveConfig` | `saveConfig(config: object): Promise<void>` | Fusionne et enregistre la configuration, tout en conservant `config.language` du processus principal. |
| `updateLanguage` | `updateLanguage(language: string): Promise<void>` | Enregistre la langue, met à jour i18n, reconstruit le menu et recharge la fenêtre principale. Exemples : `zh`, `en`, `vi`, `ja`, `ru`, `es`, `fr`, `in`. |

Événements de menu : `onMenuOpenFile(callback)`, `onMenuSaveFile(callback)`, `onMenuChangeLanguage(callback)` et `onAbout(callback)` retournent `Electron.IpcRenderer`.

## 3. `window.api`

`window.api` est monté dans la fenêtre de test et les iframes accessibles.

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

`api.config` lit les paires clé-valeur de la configuration produit : `api.config === saForm.product || {}`.

## 4. `api.user`

`api.user` lit et écrit des données liées à l'utilisateur. L'implémentation actuelle repose sur un tableau en mémoire dans le processus principal ; elle n'est pas persistée comme base de données après redémarrage.

Paramètres optionnels communs : `site`, `account` et `did` sont des booléens à `false` par défaut. Ils sont acceptés par le processus principal, mais ne partitionnent pas encore réellement les données.

| Méthode | Signature | Description |
| --- | --- | --- |
| `put` | `put(name: string, value: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Enregistre une paire clé-valeur. |
| `get` | `get(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ value: string \| null, status: boolean }>` | Lit une valeur. |
| `remove` | `remove(name: string, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean }>` | Supprime une valeur. |
| `incr` | `incr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Ajoute `step` à `Number(value)` ; crée la clé avec `step` si elle n'existe pas. |
| `decr` | `decr(name: string, step?: number, site?: boolean, account?: boolean, did?: boolean): Promise<{ status: boolean, value: number \| string }>` | Soustrait `step` ; crée la clé avec `step * -1` si elle n'existe pas. |
| `startsWith` | `startsWith(prefix: string, site?: boolean, account?: boolean, did?: boolean): Promise<Array<{ name: string, value: string }>>` | Trouve toutes les clés commençant par `prefix`. |
| `countAll` | `countAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Compte les enregistrements portant ce nom. |
| `sumAll` | `sumAll(name: string, site?: boolean, account?: boolean): Promise<{ value: number, status: boolean }>` | Additionne les valeurs numériques portant ce nom. |

## 5. `api.dom`

`api.dom` fournit la recherche DOM, la visibilité, les écouteurs de connexion, les écouteurs de taille et les overlays.

Sélecteurs pris en charge : CSS (`.class-name`), XPath (`xpath://div[@id="app"]`), suffixes parent `:p`/`:p2`, et suffixes de bord `:top`, `:right`, `:bottom`, `:left` pour les overlays.

| Méthode | Signature | Description |
| --- | --- | --- |
| `createMutationObserver` | `createMutationObserver(ele: Element, bindStr: string, childList: boolean, subtree: boolean, attributes: boolean, characterData: boolean, fn: (mutations: MutationRecord[]) => void): MutationObserver` | Crée et met en cache un `MutationObserver` sur `ele[bindStr]`. Le callback s'exécute dans `requestAnimationFrame`. |
| `querySelector` | `querySelector(doc: Document, cssOrXPathSelector: string): HTMLElement \| null` | Retourne le premier élément correspondant. |
| `querySelectorAll` | `querySelectorAll(doc: Document, cssOrXPathSelector: string): HTMLElement[]` | Retourne tous les éléments correspondants. |
| `isVisible` | `isVisible(ele: HTMLElement): Promise<boolean>` | Utilise `IntersectionObserver` et retourne `entry.isIntersecting`. |
| `getVisibleRect` | `getVisibleRect(ele: HTMLElement): Promise<DOMRectReadOnly>` | Retourne le rectangle visible courant : `left`, `top`, `right`, `bottom`, `width`, `height`, `x`, `y`. |
| `getConnectListeners` | `getConnectListeners(): Array<{ querySelector: string; callback: (isConnected: boolean) => void; isConnected?: boolean; }>` | Retourne les écouteurs de connexion ; peut échouer si l'observateur interne n'a pas encore été créé. |
| `addConnectListener` | `addConnectListener(cssOrXPathSelector: string, callback: (isConnected: boolean) => void): void` | Surveille l'apparition ou la disparition d'un élément. Un même sélecteur réenregistré remplace le callback. |
| `removeConnectListener` | `removeConnectListener(cssOrXPathSelectors: string[]): void` | Supprime les écouteurs associés aux sélecteurs. |
| `addResizeListener` | `addResizeListener(cssOrXPathSelector: string, bindWindowStr: string, callback: (rect: DOMRect) => void, createObserver?: boolean, delayTime?: number): ResizeObserver \| (() => void)` | Surveille la taille et la position. Si l'élément n'existe pas, appelle avec `new DOMRect(0,0,0,0)`. Valeurs par défaut : `true`, `500`. |
| `createOverlayBy` | `createOverlayBy(cssOrXPathSelector: string, bindWindowStr: string, createObserver?: boolean, delayTime?: number, fn?: (rect: DOMRectReadOnly) => void): HTMLElement` | Crée un `div` fixe qui suit la zone visible de la cible. Réutilise `window[bindWindowStr]` s'il existe. |
| `createOverlayByBorder` | `createOverlayByBorder(bindWindowStr: string, top: string \| number, right: string \| number, bottom: string \| number, left: string \| number, createObserver?: boolean, delayTime?: number): HTMLElement` | Crée un overlay à partir de quatre bords, chacun étant une valeur en pixels ou un sélecteur. |

Les overlays sont ajoutés à `document.documentElement`, deviennent de taille `0px` si la cible disparaît, et se mettent à jour via `ResizeObserver`, `resize` et `scroll`.

## 6. `api.utils`

| Méthode | Signature | Description |
| --- | --- | --- |
| `wait` | `wait(fn: () => boolean, timeoutMs: number, intervalMs?: number): Promise<void>` | Interroge `fn` jusqu'à ce qu'elle retourne une valeur vraie. `intervalMs` vaut `100` par défaut. En cas de délai dépassé, rejette `Error("Timeout: function did not return true in time.")`. |
| `runScript` | `runScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>` | Exécute du JavaScript dans la page via `webFrame.executeJavaScript`. |

## 7. `api.header(headerName, isRequestHeader)`

```ts
header(headerName: string, isRequestHeader: boolean): Promise<string | string[] | undefined>
```

Lit les en-têtes enregistrés par la fenêtre de test. `headerName` est converti en minuscules ; `true` lit les en-têtes de requête, `false` les en-têtes de réponse. Seuls les noms configurés dans `requestHeaders` ou `responseHeaders` sont enregistrés. Les requêtes viennent de `webRequest.onSendHeaders`, les réponses de `webRequest.onHeadersReceived`.

## 8. Injection et événements globaux

- `urlchange` : si `saForm.urlchangeEvent` est vrai et que la fenêtre est top-level, `pushState`, `replaceState` et `popstate` sont enveloppés. L'événement fournit `{ oldUrl, url }`.
- `window.EventSource` : en mode SSE, `addEventListener('message', fn)` et `onmessage` sont enveloppés. Quand `saForm.matchUrl` correspond, les données du message sont passées au script, et le texte retourné devient `MessageEvent.data`.
- `window.fetch` : en mode SSE, seules les réponses `text/event-stream` dont l'URL correspond à `matchUrl` sont lues chunk par chunk, traitées par le script, réencodées et réécrites dans un `ReadableStream`.
- `postIpcMessage(type, data)` : fonction interne injectée pour communiquer entre le contexte page et preload via `window.postMessage`. Elle sert surtout à `doSSE`/`doReplySSE` et n'est pas recommandée pour les scripts métier.

## 9. Contrôle de page

- `saForm.hide` : à l'initialisation et lors des changements DOM, les éléments correspondants reçoivent `__ignore__="true"` et `display: none`.
- `saForm.remove` : à l'initialisation et lors des changements DOM, les éléments correspondants sont retirés de leur parent.

## 10. Résumé des types

Voir `api.md` pour le bloc TypeScript complet ; les signatures ci-dessus gardent les mêmes types publics.
