# Manuel d'utilisation de l'outil de développement de scripts Sa2web

## 1. Vue d'ensemble du projet

Ce projet est un outil de développement de scripts de bureau basé sur Electron Forge, Vue, Bootstrap et Monaco Editor. La fenêtre principale sert à éditer les scripts et à configurer la page cible. La fenêtre de test ouvre l'URL cible et utilise `preload.js` pour injecter l'environnement d'exécution, les API DOM, les API de données utilisateur, la lecture des en-têtes de requête/réponse, ainsi que la réécriture de page, de flux SSE ou de réponses d'API.

Il convient pour :

- écrire et déboguer des scripts d'amélioration de page ;
- masquer, supprimer ou positionner des calques sur les éléments de la page cible ;
- intercepter et réécrire les réponses d'API classiques ;
- intercepter et réécrire les données de flux SSE ;
- fournir aux scripts une configuration simple et un accès aux données utilisateur.

## 2. Pile technique

- Electron 37 : enveloppe desktop, processus principal, processus de rendu et fenêtre de test.
- Electron Forge + Webpack : développement, empaquetage et publication.
- Vue 3 : formulaire et état de la fenêtre principale.
- Bootstrap : styles d'interface.
- Monaco Editor : éditeur JavaScript avec indications de types injectées par `src/Api.js`.
- i18next : textes multilingues.

## 3. Structure des répertoires

```text
src/
  main.js                Processus principal Electron : fenêtres, menus, IPC, proxy, interception.
  preload.js             Script de préchargement exposant window.fileApi et window.api.
  renderer.js            Logique de rendu : Vue, Monaco, événements de menu.
  Api.js                 Déclarations de types et commentaires api pour Monaco.
  DomUtils.js            Outils DOM : CSS/XPath, visibilité, debounce, etc.
  userData.js            Encapsulation IPC des données utilisateur côté rendu.
  Dialogs.js             Aides de boîtes de dialogue.
  i18n.js                Initialisation i18n du processus principal.
  i18n.renderer.js       Initialisation i18n du processus de rendu.
  index.html             Modèle de la fenêtre principale.
  css/                   Styles Bootstrap et application.
  locales/               Messages JSON multilingues.
  vendors/               Ressources locales Vue, Bootstrap et Monaco.
assets/
  icon.ico               Icône de l'application.
package.json             Scripts npm, dépendances et métadonnées.
forge.config.js          Configuration Electron Forge.
webpack.*.config.js      Configuration Webpack.
```

## 4. Démarrage et empaquetage

```bash
npm install
npm start
npm run package
npm run make
npm run publish
npm run lint
```

Le script `lint` actuel est seulement un espace réservé.

## 5. Fonctions de la fenêtre principale

- URL : adresse de la page cible.
- Launch : ouvre l'URL cible, sauvegarde le formulaire et charge la page, sans activer l'injection de script dans `saForm`.
- Run Script : ouvre l'URL cible et transmet le formulaire ainsi que le script de l'éditeur à la fenêtre de test.
- Show/Hide Settings : affiche ou masque la configuration avancée.
- Open File : charge un fichier de script dans Monaco Editor.
- Save File : sauvegarde le contenu de Monaco Editor.
- Script Editor : écrit le JavaScript. En mode script de page, l'objet `api` est injecté ; les modes réponse classique et SSE utilisent d'autres paramètres.

Le menu permet de créer un nouveau fichier, ouvrir ou sauvegarder un fichier, changer de langue, et afficher la boîte À propos.

## 6. Options de configuration

Le formulaire correspond à `config.form` et est enregistré dans `.sa.config` dans le dossier utilisateur.

| Champ | Type | Description |
| --- | --- | --- |
| `url` | string | URL de la page cible. |
| `script` | string | Script dans Monaco Editor. |
| `hide` | string[] | Sélecteurs à masquer en mode script de page. |
| `remove` | string[] | Sélecteurs à supprimer en mode script de page. |
| `requestHeaders` | string | Noms d'en-têtes de requête séparés par des virgules, lus avec `api.header(name, true)`. |
| `responseHeaders` | string | Noms d'en-têtes de réponse séparés par des virgules, lus avec `api.header(name, false)`. |
| `product` | object | Configuration personnalisée accessible via `api.config`. |
| `userAgent` | string | User-Agent personnalisé. |
| `urlchangeEvent` | boolean | Injecte l'événement `urlchange` en enveloppant `history.pushState`, `history.replaceState` et `popstate`. |
| `isPage` | boolean | Exécute le script comme script de page. |
| `scriptSelector` | string | Condition CSS/XPath déclenchant le script de page. |
| `isSSE` | boolean | Traite le mode non-page comme script SSE. |
| `matchUrl` | string | URL d'API ou SSE à faire correspondre. |
| `proxy.method` | string | Mode proxy Electron : `direct`, `fixed_servers` ou `system`. |
| `proxy.server` | string | Règle de serveur proxy, par exemple `http://127.0.0.1:7890`. |
| `proxy.bypassList` | string | Règles de contournement du proxy. |

## 7. Syntaxe des sélecteurs

`DomUtils.findElements` prend en charge les sélecteurs CSS et XPath :

- CSS : `.button.primary`
- XPath : `xpath://div[@id="app"]`
- Parent : suffixe `:p` ou `:p2`.
- Bordure : suffixes `:top`, `:right`, `:bottom`, `:left` pour les API de calque.

## 8. Modes d'exécution

### 8.1 Script de page

Quand `isPage = true`, Run Script ouvre la page, `preload.js` lit `saForm`, initialise `window.api` dans la page et les iframes, puis exécute le script si `scriptSelector` correspond. Les règles `hide` et `remove` restent appliquées lors des changements DOM.

```js
const btn = api.dom.querySelector(document, '.submit');
const value = await api.user.get('token');
```

### 8.2 Réécriture de réponse classique

Quand `isPage = false` et `isSSE = false`, la fenêtre de test utilise l'interception `Fetch` du Chrome DevTools Protocol. Si l'URL correspond à `matchUrl`, le corps est lu et le script suivant doit retourner le nouveau corps :

```js
async (data, api, url) => {
  // contenu du script
}
```

### 8.3 Script SSE

Quand `isPage = false` et `isSSE = true`, `EventSource` et `fetch` sont enveloppés. Les chunks SSE correspondant à `matchUrl` sont transmis au script :

```js
async (data) => {
  // contenu du script
}
```

### 8.4 Correspondance d'URL

`matchUrl` accepte `*`, `regex:<expression>`, `exact:<URL complète>`, `script:<expression>` et une chaîne simple correspondant au préfixe de l'URL.

## 9. En-têtes

Exemples de configuration :

- Requête : `authorization,cookie`
- Réponse : `content-type,set-cookie`

```js
const authorization = await api.header('authorization', true);
const contentType = await api.header('content-type', false);
```

Les noms sont convertis en minuscules. Seuls les en-têtes configurés et réellement passés par la fenêtre de test peuvent être lus.

## 10. Proxy et User-Agent

Le proxy de la session de test peut être `direct`, `fixed_servers` ou `system`. Si `userAgent` est défini, Run Script met à jour le User-Agent de l'application et de la session de test.

## 11. Persistance

La configuration est enregistrée dans :

```text
~/.sa.config
```

Les changements du formulaire et de l'éditeur sont sauvegardés avec debounce. Si `filePath` est lié, le script est également sauvegardé dans ce fichier.

## 12. Notes d'implémentation

`window.fileApi` est exposé par `contextBridge.exposeInMainWorld('fileApi', ...)`, et `window.api` par `initUserScriptApis(win)`. Les iframes nouvellement ajoutées sont aussi initialisées lorsque possible. L'outil utilise `MutationObserver`, `IntersectionObserver`, `ResizeObserver`, `resize` et `scroll`. L'API de données utilisateur repose actuellement sur le tableau mémoire `dataList`, sans base persistante.

## 13. Extraits courants

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
